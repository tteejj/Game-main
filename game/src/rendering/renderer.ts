/**
 * Space Renderer - Renders 3D space scene in 2D
 * Based on ACTION_PLAN_PHASE_4.md specifications
 */

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface ColorPalette {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    good: string;
    warning: string;
    critical: string;
}

/**
 * Camera for world-to-screen coordinate conversion
 */
class Camera {
    private position: Vector3 = { x: 0, y: 0, z: 0 };
    public zoom: number = 1.0;

    update(targetPosition: Vector3): void {
        // Smoothly follow target
        this.position.x += (targetPosition.x - this.position.x) * 0.1;
        this.position.y += (targetPosition.y - this.position.y) * 0.1;
        this.position.z += (targetPosition.z - this.position.z) * 0.1;
    }

    worldToScreen(worldPos: Vector3, canvasWidth: number, canvasHeight: number): { x: number; y: number } {
        // Convert 3D world coordinates to 2D screen coordinates
        const screenX = canvasWidth / 2 + (worldPos.x - this.position.x) * this.zoom / 1000;
        const screenY = canvasHeight / 2 + (worldPos.y - this.position.y) * this.zoom / 1000;

        return { x: screenX, y: screenY };
    }

    setZoom(zoom: number): void {
        this.zoom = Math.max(0.1, Math.min(10, zoom));
    }
}

export class SpaceRenderer {
    private ctx: CanvasRenderingContext2D;
    private palette: ColorPalette;
    public camera: Camera;

    constructor(ctx: CanvasRenderingContext2D, palette: ColorPalette) {
        this.ctx = ctx;
        this.palette = palette;
        this.camera = new Camera();
    }

    /**
     * Render complete space scene
     */
    render(gameState: any): void {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        // 1. Clear and set background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, width, height);

        // 2. Draw star field (static background)
        this.renderStarField();

        // 3. Update camera to follow spacecraft
        if (gameState.spacecraft && gameState.spacecraft.position) {
            this.camera.update(gameState.spacecraft.position);
        }

        // 4. Render celestial bodies (planets, moons)
        if (gameState.starSystem && gameState.starSystem.bodies) {
            this.renderCelestialBodies(gameState.starSystem.bodies);
        }

        // 5. Render space stations
        if (gameState.starSystem && gameState.starSystem.stations) {
            this.renderStations(gameState.starSystem.stations);
        }

        // 6. Render NPC ships
        if (gameState.npcShips) {
            this.renderNPCShips(gameState.npcShips);
        }

        // 7. Render player spacecraft
        if (gameState.spacecraft) {
            this.renderSpacecraft(gameState.spacecraft);
        }

        // 8. Render trajectories and UI overlays
        if (gameState.showTrajectory && gameState.spacecraft) {
            this.renderTrajectory(gameState.spacecraft);
        }

        // 9. Render hazard zones
        if (gameState.starSystem && gameState.starSystem.hazards) {
            this.renderHazards(gameState.starSystem.hazards);
        }

        // 10. Render targeting reticles
        if (gameState.targetedContact) {
            this.renderTargetingReticle(gameState.targetedContact);
        }
    }

    /**
     * Render static star field background
     */
    private renderStarField(): void {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        // Use deterministic random for consistent star positions
        const seed = 12345;
        let rng = seed;
        const next = () => {
            rng = (rng * 9301 + 49297) % 233280;
            return rng / 233280;
        };

        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 200; i++) {
            const x = next() * width;
            const y = next() * height;
            const brightness = next();

            this.ctx.globalAlpha = brightness * 0.5 + 0.5;
            this.ctx.fillRect(x, y, 1, 1);
        }
        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Render player spacecraft
     */
    private renderSpacecraft(spacecraft: any): void {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        const screenPos = this.camera.worldToScreen(spacecraft.position, width, height);

        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        this.ctx.rotate(spacecraft.rotation || 0);

        // Draw ship as triangle
        this.ctx.beginPath();
        this.ctx.moveTo(15, 0);       // Nose
        this.ctx.lineTo(-10, -8);     // Left wing
        this.ctx.lineTo(-5, 0);       // Center back
        this.ctx.lineTo(-10, 8);      // Right wing
        this.ctx.closePath();

        this.ctx.fillStyle = this.palette.primary;
        this.ctx.fill();
        this.ctx.strokeStyle = this.palette.accent;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw engine thrust indicator
        if (spacecraft.engineFiring) {
            this.ctx.beginPath();
            this.ctx.moveTo(-5, 0);
            this.ctx.lineTo(-15, -3);
            this.ctx.lineTo(-15, 3);
            this.ctx.closePath();
            this.ctx.fillStyle = this.palette.warning;
            this.ctx.fill();
        }

        this.ctx.restore();

        // Draw ship label
        this.ctx.fillStyle = this.palette.primary;
        this.ctx.font = '10px "Courier New"';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PLAYER', screenPos.x + 20, screenPos.y);
    }

    /**
     * Render celestial bodies
     */
    private renderCelestialBodies(bodies: any[]): void {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        bodies.forEach(body => {
            const screenPos = this.camera.worldToScreen(body.position, width, height);

            // Scale radius for visibility
            const screenRadius = Math.max(10, body.radius / 10000);

            // Draw body
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);

            // Color based on type
            const colors: Record<string, string> = {
                'star': '#ffff00',
                'planet': this.palette.primary,
                'moon': this.palette.secondary,
                'asteroid': '#888888'
            };
            this.ctx.fillStyle = colors[body.type] || this.palette.primary;
            this.ctx.fill();

            this.ctx.strokeStyle = this.palette.accent;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Draw atmosphere if present
            if (body.atmosphere && body.atmosphere.density > 0) {
                this.ctx.beginPath();
                this.ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.2, 0, Math.PI * 2);
                this.ctx.strokeStyle = this.palette.primary;
                this.ctx.globalAlpha = 0.3;
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }

            // Draw label
            this.ctx.fillStyle = this.palette.secondary;
            this.ctx.font = '10px "Courier New"';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(body.name, screenPos.x + screenRadius + 5, screenPos.y);
        });
    }

    /**
     * Render space stations
     */
    private renderStations(stations: any[]): void {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        stations.forEach(station => {
            const screenPos = this.camera.worldToScreen(station.position, width, height);

            // Draw station as octagon
            this.ctx.beginPath();
            const sides = 8;
            const radius = 8;
            for (let i = 0; i <= sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = screenPos.x + Math.cos(angle) * radius;
                const y = screenPos.y + Math.sin(angle) * radius;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }

            this.ctx.strokeStyle = this.palette.accent;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw station label
            this.ctx.fillStyle = this.palette.accent;
            this.ctx.font = '10px "Courier New"';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(station.name, screenPos.x + 10, screenPos.y);
        });
    }

    /**
     * Render NPC ships
     */
    private renderNPCShips(ships: any[]): void {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        ships.forEach(ship => {
            const screenPos = this.camera.worldToScreen(ship.position, width, height);

            // Draw ship as small triangle
            this.ctx.save();
            this.ctx.translate(screenPos.x, screenPos.y);
            this.ctx.rotate(ship.heading || 0);

            this.ctx.beginPath();
            this.ctx.moveTo(6, 0);
            this.ctx.lineTo(-4, -3);
            this.ctx.lineTo(-4, 3);
            this.ctx.closePath();

            // Color by faction/threat
            const color = ship.hostile ? this.palette.critical : this.palette.secondary;
            this.ctx.fillStyle = color;
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    /**
     * Render trajectory prediction
     */
    private renderTrajectory(spacecraft: any): void {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        if (!spacecraft.trajectory || spacecraft.trajectory.length === 0) return;

        this.ctx.beginPath();
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = this.palette.warning;
        this.ctx.lineWidth = 1;

        spacecraft.trajectory.forEach((point: any, index: number) => {
            const screenPos = this.camera.worldToScreen(point, width, height);
            if (index === 0) {
                this.ctx.moveTo(screenPos.x, screenPos.y);
            } else {
                this.ctx.lineTo(screenPos.x, screenPos.y);
            }
        });

        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Render hazard zones
     */
    private renderHazards(hazards: any[]): void {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        hazards.forEach(hazard => {
            const screenPos = this.camera.worldToScreen(hazard.position, width, height);
            const screenRadius = Math.max(20, hazard.radius / 1000);

            // Draw hazard zone as pulsing circle
            const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;

            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.palette.critical;
            this.ctx.globalAlpha = pulse * 0.5;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;

            // Draw hazard label
            this.ctx.fillStyle = this.palette.critical;
            this.ctx.font = '10px "Courier New"';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`⚠️ ${hazard.type}`, screenPos.x + screenRadius + 5, screenPos.y);
        });
    }

    /**
     * Render targeting reticle
     */
    private renderTargetingReticle(target: any): void {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        const screenPos = this.camera.worldToScreen(target.position, width, height);

        // Draw targeting brackets
        const size = 20;
        const gap = 5;

        this.ctx.strokeStyle = this.palette.accent;
        this.ctx.lineWidth = 2;

        // Top-left bracket
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x - size, screenPos.y - size + gap);
        this.ctx.lineTo(screenPos.x - size, screenPos.y - size);
        this.ctx.lineTo(screenPos.x - size + gap, screenPos.y - size);
        this.ctx.stroke();

        // Top-right bracket
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x + size, screenPos.y - size + gap);
        this.ctx.lineTo(screenPos.x + size, screenPos.y - size);
        this.ctx.lineTo(screenPos.x + size - gap, screenPos.y - size);
        this.ctx.stroke();

        // Bottom-left bracket
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x - size, screenPos.y + size - gap);
        this.ctx.lineTo(screenPos.x - size, screenPos.y + size);
        this.ctx.lineTo(screenPos.x - size + gap, screenPos.y + size);
        this.ctx.stroke();

        // Bottom-right bracket
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x + size, screenPos.y + size - gap);
        this.ctx.lineTo(screenPos.x + size, screenPos.y + size);
        this.ctx.lineTo(screenPos.x + size - gap, screenPos.y + size);
        this.ctx.stroke();

        // Draw target info
        this.ctx.fillStyle = this.palette.accent;
        this.ctx.font = '10px "Courier New"';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(target.name || 'TARGET', screenPos.x + 25, screenPos.y - 5);
        this.ctx.fillText(`${target.distance ? target.distance.toFixed(0) : '0'} km`, screenPos.x + 25, screenPos.y + 5);
    }
}
