/**
 * Visual Renderer for Space Game
 * Handles all 3D to 2D rendering of universe elements
 */

import { Camera } from './camera';
import { Vector3, CelestialBody, CelestialBodyType, Star, Planet } from '../../universe-system/src/CelestialBody';
import { StarSystem } from '../../universe-system/src/StarSystem';
import { NPCShip } from '../../universe-system/src/npc-traffic/npc-ship';
import { GameWorld } from '../../physics-modules/src/game-world';

export interface RenderableObject {
    position: Vector3;
    type: string;
    name: string;
    radius?: number;
    color?: string;
}

export class SpaceRenderer {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private camera: Camera;

    // Rendering settings
    private showOrbits: boolean = true;
    private showLabels: boolean = true;
    private showVelocityVectors: boolean = true;
    private showGrid: boolean = false;

    // Selection
    private selectedObject: string | null = null;

    constructor(canvas: HTMLCanvasElement, camera: Camera) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');
        this.ctx = ctx;
        this.camera = camera;
    }

    /**
     * Render complete frame
     */
    render(
        starSystem: StarSystem,
        gameWorld: GameWorld,
        npcShips: NPCShip[],
        playerShip: { position: Vector3, velocity: Vector3 }
    ): void {
        // Clear screen
        this.clear();

        // Render starfield background
        this.renderStarfield();

        // Render grid if enabled
        if (this.showGrid) {
            this.renderGrid();
        }

        // Collect all renderable objects
        const renderables: Array<{
            obj: any;
            screenPos: { x: number, y: number, visible: boolean, distance: number };
            type: string;
        }> = [];

        // Add celestial bodies
        for (const body of starSystem.getAllBodies()) {
            const screenPos = this.camera.worldToScreen(body.position);
            if (screenPos.visible) {
                renderables.push({ obj: body, screenPos, type: 'celestial' });
            }
        }

        // Add NPC ships
        for (const npc of npcShips) {
            const screenPos = this.camera.worldToScreen(npc.position);
            if (screenPos.visible) {
                renderables.push({ obj: npc, screenPos, type: 'npc' });
            }
        }

        // Add player ship
        const shipScreenPos = this.camera.worldToScreen(playerShip.position);
        if (shipScreenPos.visible) {
            renderables.push({ obj: playerShip, screenPos: shipScreenPos, type: 'player' });
        }

        // Add satellites
        const satellites = gameWorld.getOperationalSatellites();
        for (const sat of satellites) {
            const satPos = sat.orbitalBody.position;
            const screenPos = this.camera.worldToScreen(satPos);
            if (screenPos.visible) {
                renderables.push({ obj: sat, screenPos, type: 'satellite' });
            }
        }

        // Sort by distance (far to near for proper layering)
        renderables.sort((a, b) => b.screenPos.distance - a.screenPos.distance);

        // Render all objects
        for (const renderable of renderables) {
            switch (renderable.type) {
                case 'celestial':
                    this.renderCelestialBody(renderable.obj, renderable.screenPos);
                    break;
                case 'npc':
                    this.renderNPCShip(renderable.obj, renderable.screenPos);
                    break;
                case 'player':
                    this.renderPlayerShip(renderable.obj, renderable.screenPos);
                    break;
                case 'satellite':
                    this.renderSatellite(renderable.obj, renderable.screenPos);
                    break;
            }
        }

        // Render orbits on top
        if (this.showOrbits) {
            this.renderOrbits(starSystem);
        }

        // Render velocity vectors
        if (this.showVelocityVectors) {
            this.renderVelocityVector(playerShip, shipScreenPos);
        }
    }

    /**
     * Clear screen
     */
    private clear(): void {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render starfield background
     */
    private renderStarfield(): void {
        // Generate deterministic star positions based on camera position
        const starCount = 500;
        const seed = Math.floor(this.camera.position.x / 1e6) * 1000 +
                     Math.floor(this.camera.position.y / 1e6);

        // Simple pseudo-random generator
        const random = (index: number) => {
            const x = Math.sin(seed + index * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };

        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < starCount; i++) {
            const x = random(i) * this.canvas.width;
            const y = random(i + 1000) * this.canvas.height;
            const brightness = random(i + 2000);
            const size = brightness > 0.98 ? 2 : 1;

            this.ctx.globalAlpha = brightness * 0.8;
            this.ctx.fillRect(x, y, size, size);
        }
        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Render reference grid
     */
    private renderGrid(): void {
        const gridSize = 1e6; // 1000 km spacing
        const gridLines = 20;

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.globalAlpha = 0.1;
        this.ctx.lineWidth = 1;

        // Draw grid around camera position
        for (let i = -gridLines; i <= gridLines; i++) {
            const offset = i * gridSize;

            // X-axis lines
            const start1 = this.camera.worldToScreen({
                x: this.camera.position.x - gridLines * gridSize,
                y: this.camera.position.y + offset,
                z: this.camera.position.z
            });
            const end1 = this.camera.worldToScreen({
                x: this.camera.position.x + gridLines * gridSize,
                y: this.camera.position.y + offset,
                z: this.camera.position.z
            });

            if (start1.visible || end1.visible) {
                this.ctx.beginPath();
                this.ctx.moveTo(start1.x, start1.y);
                this.ctx.lineTo(end1.x, end1.y);
                this.ctx.stroke();
            }

            // Y-axis lines
            const start2 = this.camera.worldToScreen({
                x: this.camera.position.x + offset,
                y: this.camera.position.y - gridLines * gridSize,
                z: this.camera.position.z
            });
            const end2 = this.camera.worldToScreen({
                x: this.camera.position.x + offset,
                y: this.camera.position.y + gridLines * gridSize,
                z: this.camera.position.z
            });

            if (start2.visible || end2.visible) {
                this.ctx.beginPath();
                this.ctx.moveTo(start2.x, start2.y);
                this.ctx.lineTo(end2.x, end2.y);
                this.ctx.stroke();
            }
        }

        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Render a celestial body
     */
    private renderCelestialBody(body: CelestialBody, screenPos: any): void {
        const screenRadius = this.camera.getScreenSize(body.physical.radius, screenPos.distance);
        const minRadius = body.type === 'STAR' ? 5 : 2;
        const finalRadius = Math.max(minRadius, Math.min(screenRadius, 200));

        // Get body color
        const color = this.getCelestialColor(body);

        // Draw glow for stars
        if (body.type === CelestialBodyType.STAR) {
            const gradient = this.ctx.createRadialGradient(
                screenPos.x, screenPos.y, 0,
                screenPos.x, screenPos.y, finalRadius * 3
            );
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.3, color + '88');
            gradient.addColorStop(1, color + '00');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, finalRadius * 3, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw body
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, finalRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw selection highlight
        if (this.selectedObject === body.id) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, finalRadius + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Draw label
        if (this.showLabels && screenRadius > 5) {
            this.drawLabel(screenPos.x, screenPos.y + finalRadius + 15, body.name, color);
        }
    }

    /**
     * Get color for celestial body based on type
     */
    private getCelestialColor(body: CelestialBody): string {
        switch (body.type) {
            case CelestialBodyType.STAR:
                // Color based on star class for Star instances
                if (body instanceof Star) {
                    const classMap: Record<string, string> = {
                        'O': '#9bb0ff', 'B': '#aabfff', 'A': '#cad8ff',
                        'F': '#f8f7ff', 'G': '#fff4ea', 'K': '#ffd2a1',
                        'M': '#ffcc6f'
                    };
                    return classMap[body.starClass[0]] || '#ffffff';
                }
                return '#ffff00';
            case CelestialBodyType.PLANET:
                // Check if it's a planet with atmosphere
                if (body instanceof Planet) {
                    return body.hasAtmosphere ? '#6688ff' : '#888888';
                }
                return '#888888';
            case CelestialBodyType.MOON:
                return '#aaaaaa';
            case CelestialBodyType.ASTEROID:
                return '#666666';
            case CelestialBodyType.STATION:
                return '#00ff00';
            default:
                return '#ffffff';
        }
    }

    /**
     * Render NPC ship
     */
    private renderNPCShip(npc: NPCShip, screenPos: any): void {
        const size = Math.max(3, this.camera.getScreenSize(50, screenPos.distance));

        // Draw ship as triangle
        this.ctx.fillStyle = '#ff8800';
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y - size);
        this.ctx.lineTo(screenPos.x - size * 0.6, screenPos.y + size * 0.6);
        this.ctx.lineTo(screenPos.x + size * 0.6, screenPos.y + size * 0.6);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw selection highlight
        if (this.selectedObject === npc.id) {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, size * 2, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Draw label for close ships
        if (this.showLabels && screenPos.distance < 1e5) {
            this.drawLabel(screenPos.x, screenPos.y + size + 12, npc.name, '#ff8800');
        }
    }

    /**
     * Render player ship
     */
    private renderPlayerShip(_ship: any, screenPos: any): void {
        const size = Math.max(4, this.camera.getScreenSize(50, screenPos.distance));

        // Draw ship as diamond
        this.ctx.fillStyle = '#00ff00';
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y - size);
        this.ctx.lineTo(screenPos.x + size, screenPos.y);
        this.ctx.lineTo(screenPos.x, screenPos.y + size);
        this.ctx.lineTo(screenPos.x - size, screenPos.y);
        this.ctx.closePath();
        this.ctx.stroke();

        // Draw crosshair at center of player ship
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 1;
        const crossSize = size * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x - crossSize, screenPos.y);
        this.ctx.lineTo(screenPos.x + crossSize, screenPos.y);
        this.ctx.moveTo(screenPos.x, screenPos.y - crossSize);
        this.ctx.lineTo(screenPos.x, screenPos.y + crossSize);
        this.ctx.stroke();
    }

    /**
     * Render satellite
     */
    private renderSatellite(sat: any, screenPos: any): void {
        const size = Math.max(2, this.camera.getScreenSize(10, screenPos.distance));

        // Draw satellite as square
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size);

        // Draw label if close
        if (this.showLabels && screenPos.distance < 5e4) {
            this.drawLabel(screenPos.x, screenPos.y + size + 10, sat.name, '#00ffff');
        }
    }

    /**
     * Render orbital paths
     */
    private renderOrbits(starSystem: StarSystem): void {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.globalAlpha = 0.2;
        this.ctx.lineWidth = 1;

        // Render planet orbits around star
        const star = starSystem.star;
        const starScreen = this.camera.worldToScreen(star.position);

        for (const planet of starSystem.planets) {
            const dx = planet.position.x - star.position.x;
            const dy = planet.position.y - star.position.y;
            const orbitRadius = Math.sqrt(dx * dx + dy * dy);

            const screenRadius = this.camera.getScreenSize(orbitRadius, starScreen.distance);

            if (screenRadius > 5 && screenRadius < 2000) {
                this.ctx.beginPath();
                this.ctx.arc(starScreen.x, starScreen.y, screenRadius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Render velocity vector
     */
    private renderVelocityVector(ship: any, screenPos: any): void {
        const velMag = Math.sqrt(
            ship.velocity.x ** 2 + ship.velocity.y ** 2 + ship.velocity.z ** 2
        );

        if (velMag < 1) return; // Don't draw if nearly stationary

        // Calculate velocity endpoint in world space
        const scale = 1000; // Scale factor for visibility
        const velEnd: Vector3 = {
            x: ship.position.x + (ship.velocity.x / velMag) * scale,
            y: ship.position.y + (ship.velocity.y / velMag) * scale,
            z: ship.position.z + (ship.velocity.z / velMag) * scale
        };

        const velEndScreen = this.camera.worldToScreen(velEnd);

        // Draw velocity vector
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y);
        this.ctx.lineTo(velEndScreen.x, velEndScreen.y);
        this.ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(velEndScreen.y - screenPos.y, velEndScreen.x - screenPos.x);
        const arrowSize = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(velEndScreen.x, velEndScreen.y);
        this.ctx.lineTo(
            velEndScreen.x - arrowSize * Math.cos(angle - Math.PI / 6),
            velEndScreen.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(velEndScreen.x, velEndScreen.y);
        this.ctx.lineTo(
            velEndScreen.x - arrowSize * Math.cos(angle + Math.PI / 6),
            velEndScreen.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
    }

    /**
     * Draw text label
     */
    private drawLabel(x: number, y: number, text: string, color: string): void {
        this.ctx.font = '11px "Courier New"';
        this.ctx.textAlign = 'center';

        // Draw background
        const metrics = this.ctx.measureText(text);
        this.ctx.fillStyle = '#000000';
        this.ctx.globalAlpha = 0.7;
        this.ctx.fillRect(
            x - metrics.width / 2 - 2,
            y - 10,
            metrics.width + 4,
            14
        );

        // Draw text
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
    }

    /**
     * Set selected object
     */
    setSelectedObject(id: string | null): void {
        this.selectedObject = id;
    }

    /**
     * Toggle rendering options
     */
    toggleOrbits(): void { this.showOrbits = !this.showOrbits; }
    toggleLabels(): void { this.showLabels = !this.showLabels; }
    toggleVelocityVectors(): void { this.showVelocityVectors = !this.showVelocityVectors; }
    toggleGrid(): void { this.showGrid = !this.showGrid; }
}
