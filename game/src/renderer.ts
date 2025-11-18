/**
 * Vector Graphics Renderer for Space Game
 * Retro wireframe/vector display aesthetic inspired by:
 * - Lunar Lander (1979)
 * - Elite (1984)
 * - Apollo mission displays
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

// Color palette for retro vector display
const VECTOR_COLORS = {
    primary: '#00ff00',      // Bright green (classic phosphor)
    secondary: '#00cc00',    // Dim green
    tertiary: '#008800',     // Very dim green
    star: '#ffff00',         // Yellow for stars
    station: '#00ffff',      // Cyan for stations
    hostile: '#ff0000',      // Red for threats
    dim: '#004400'           // Very dim for background elements
};

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

    // Scanline effect
    private scanlineOffset: number = 0;

    constructor(canvas: HTMLCanvasElement, camera: Camera) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');
        this.ctx = ctx;
        this.camera = camera;

        // Set up for crisp vector graphics
        this.ctx.imageSmoothingEnabled = false;
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
     * Clear screen with CRT effect
     */
    private clear(): void {
        // Black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Add subtle CRT scanlines
        this.renderScanlines();
    }

    /**
     * Render CRT scanlines
     */
    private renderScanlines(): void {
        this.ctx.globalAlpha = 0.05;
        this.ctx.fillStyle = '#000000';

        this.scanlineOffset = (this.scanlineOffset + 1) % 4;

        for (let y = this.scanlineOffset; y < this.canvas.height; y += 3) {
            this.ctx.fillRect(0, y, this.canvas.width, 1);
        }

        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Render starfield background (sparse dots, not filled)
     */
    private renderStarfield(): void {
        // Much sparser starfield for cleaner vector look
        const starCount = 100;
        const seed = Math.floor(this.camera.position.x / 1e6) * 1000 +
                     Math.floor(this.camera.position.y / 1e6);

        const random = (index: number) => {
            const x = Math.sin(seed + index * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };

        this.ctx.strokeStyle = VECTOR_COLORS.dim;
        this.ctx.lineWidth = 1;

        for (let i = 0; i < starCount; i++) {
            const x = random(i) * this.canvas.width;
            const y = random(i + 1000) * this.canvas.height;
            const brightness = random(i + 2000);

            if (brightness > 0.7) {
                this.ctx.globalAlpha = brightness * 0.5;
                // Draw as small plus sign
                this.ctx.beginPath();
                this.ctx.moveTo(x - 1, y);
                this.ctx.lineTo(x + 1, y);
                this.ctx.moveTo(x, y - 1);
                this.ctx.lineTo(x, y + 1);
                this.ctx.stroke();
            }
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
     * Render a celestial body (wireframe style)
     */
    private renderCelestialBody(body: CelestialBody, screenPos: any): void {
        const screenRadius = this.camera.getScreenSize(body.physical.radius, screenPos.distance);
        const minRadius = body.type === CelestialBodyType.STAR ? 8 : 3;
        const finalRadius = Math.max(minRadius, Math.min(screenRadius, 150));

        // Get body color
        const color = this.getCelestialColor(body);

        // Draw wireframe circle for body
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = body.type === CelestialBodyType.STAR ? 2 : 1;

        // Main circle
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, finalRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // For stars, add cross or additional rings for glow
        if (body.type === CelestialBodyType.STAR) {
            // Inner ring
            this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, finalRadius * 0.7, 0, Math.PI * 2);
            this.ctx.stroke();

            // Outer glow ring
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, finalRadius * 1.5, 0, Math.PI * 2);
            this.ctx.stroke();

            // Star cross
            this.ctx.globalAlpha = 0.8;
            this.ctx.beginPath();
            this.ctx.moveTo(screenPos.x - finalRadius * 1.3, screenPos.y);
            this.ctx.lineTo(screenPos.x + finalRadius * 1.3, screenPos.y);
            this.ctx.moveTo(screenPos.x, screenPos.y - finalRadius * 1.3);
            this.ctx.lineTo(screenPos.x, screenPos.y + finalRadius * 1.3);
            this.ctx.stroke();

            this.ctx.globalAlpha = 1.0;
        }

        // For large planets, add equator line
        if (finalRadius > 15 && body.type === CelestialBodyType.PLANET) {
            this.ctx.globalAlpha = 0.5;
            const equatorWidth = finalRadius * 0.9;
            this.ctx.beginPath();
            this.ctx.ellipse(screenPos.x, screenPos.y, equatorWidth, finalRadius * 0.2, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }

        // Draw selection highlight (blinking brackets)
        if (this.selectedObject === body.id) {
            this.ctx.strokeStyle = VECTOR_COLORS.primary;
            this.ctx.lineWidth = 2;

            const bracketSize = finalRadius + 8;
            const bracketLen = 10;

            // Four corner brackets
            this.ctx.beginPath();
            // Top-left
            this.ctx.moveTo(screenPos.x - bracketSize, screenPos.y - bracketSize + bracketLen);
            this.ctx.lineTo(screenPos.x - bracketSize, screenPos.y - bracketSize);
            this.ctx.lineTo(screenPos.x - bracketSize + bracketLen, screenPos.y - bracketSize);
            // Top-right
            this.ctx.moveTo(screenPos.x + bracketSize - bracketLen, screenPos.y - bracketSize);
            this.ctx.lineTo(screenPos.x + bracketSize, screenPos.y - bracketSize);
            this.ctx.lineTo(screenPos.x + bracketSize, screenPos.y - bracketSize + bracketLen);
            // Bottom-right
            this.ctx.moveTo(screenPos.x + bracketSize, screenPos.y + bracketSize - bracketLen);
            this.ctx.lineTo(screenPos.x + bracketSize, screenPos.y + bracketSize);
            this.ctx.lineTo(screenPos.x + bracketSize - bracketLen, screenPos.y + bracketSize);
            // Bottom-left
            this.ctx.moveTo(screenPos.x - bracketSize + bracketLen, screenPos.y + bracketSize);
            this.ctx.lineTo(screenPos.x - bracketSize, screenPos.y + bracketSize);
            this.ctx.lineTo(screenPos.x - bracketSize, screenPos.y + bracketSize - bracketLen);
            this.ctx.stroke();
        }

        // Draw label
        if (this.showLabels && finalRadius > 8) {
            this.drawLabel(screenPos.x, screenPos.y + finalRadius + 12, body.name, color);
        }
    }

    /**
     * Get color for celestial body based on type (vector graphics palette)
     */
    private getCelestialColor(body: CelestialBody): string {
        switch (body.type) {
            case CelestialBodyType.STAR:
                return VECTOR_COLORS.star; // Bright yellow for stars
            case CelestialBodyType.PLANET:
                return VECTOR_COLORS.primary; // Green for planets
            case CelestialBodyType.MOON:
                return VECTOR_COLORS.secondary; // Dim green for moons
            case CelestialBodyType.ASTEROID:
                return VECTOR_COLORS.tertiary; // Very dim green for asteroids
            case CelestialBodyType.STATION:
                return VECTOR_COLORS.station; // Cyan for stations
            default:
                return VECTOR_COLORS.primary;
        }
    }

    /**
     * Render NPC ship (wireframe triangle)
     */
    private renderNPCShip(npc: NPCShip, screenPos: any): void {
        const size = Math.max(4, this.camera.getScreenSize(50, screenPos.distance));

        // Draw ship as wireframe triangle with central dot
        this.ctx.strokeStyle = VECTOR_COLORS.secondary;
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y - size);
        this.ctx.lineTo(screenPos.x - size * 0.6, screenPos.y + size * 0.6);
        this.ctx.lineTo(screenPos.x + size * 0.6, screenPos.y + size * 0.6);
        this.ctx.closePath();
        this.ctx.stroke();

        // Central dot
        this.ctx.fillStyle = VECTOR_COLORS.secondary;
        this.ctx.fillRect(screenPos.x - 1, screenPos.y - 1, 2, 2);

        // Draw selection highlight (brackets)
        if (this.selectedObject === npc.id) {
            this.ctx.strokeStyle = VECTOR_COLORS.primary;
            this.ctx.lineWidth = 2;

            const bracketSize = size * 2;
            const bracketLen = 6;

            this.ctx.beginPath();
            // Top-left
            this.ctx.moveTo(screenPos.x - bracketSize, screenPos.y - bracketSize + bracketLen);
            this.ctx.lineTo(screenPos.x - bracketSize, screenPos.y - bracketSize);
            this.ctx.lineTo(screenPos.x - bracketSize + bracketLen, screenPos.y - bracketSize);
            // Top-right
            this.ctx.moveTo(screenPos.x + bracketSize - bracketLen, screenPos.y - bracketSize);
            this.ctx.lineTo(screenPos.x + bracketSize, screenPos.y - bracketSize);
            this.ctx.lineTo(screenPos.x + bracketSize, screenPos.y - bracketSize + bracketLen);
            // Bottom-right
            this.ctx.moveTo(screenPos.x + bracketSize, screenPos.y + bracketSize - bracketLen);
            this.ctx.lineTo(screenPos.x + bracketSize, screenPos.y + bracketSize);
            this.ctx.lineTo(screenPos.x + bracketSize - bracketLen, screenPos.y + bracketSize);
            // Bottom-left
            this.ctx.moveTo(screenPos.x - bracketSize + bracketLen, screenPos.y + bracketSize);
            this.ctx.lineTo(screenPos.x - bracketSize, screenPos.y + bracketSize);
            this.ctx.lineTo(screenPos.x - bracketSize, screenPos.y + bracketSize - bracketLen);
            this.ctx.stroke();
        }

        // Draw label for close ships
        if (this.showLabels && screenPos.distance < 1e5) {
            this.drawLabel(screenPos.x, screenPos.y + size + 12, npc.name, VECTOR_COLORS.secondary);
        }
    }

    /**
     * Render player ship (wireframe lander style)
     */
    private renderPlayerShip(_ship: any, screenPos: any): void {
        const size = Math.max(5, this.camera.getScreenSize(50, screenPos.distance));

        this.ctx.strokeStyle = VECTOR_COLORS.primary;
        this.ctx.lineWidth = 2;

        // Draw ship as classic lander shape (like Lunar Lander)
        this.ctx.beginPath();
        // Main body (rectangle)
        this.ctx.rect(screenPos.x - size * 0.5, screenPos.y - size * 0.4, size, size * 0.8);
        // Landing legs
        this.ctx.moveTo(screenPos.x - size * 0.4, screenPos.y + size * 0.4);
        this.ctx.lineTo(screenPos.x - size * 0.8, screenPos.y + size * 0.8);
        this.ctx.moveTo(screenPos.x + size * 0.4, screenPos.y + size * 0.4);
        this.ctx.lineTo(screenPos.x + size * 0.8, screenPos.y + size * 0.8);
        // Thruster nozzle
        this.ctx.moveTo(screenPos.x - size * 0.2, screenPos.y + size * 0.4);
        this.ctx.lineTo(screenPos.x - size * 0.2, screenPos.y + size * 0.6);
        this.ctx.lineTo(screenPos.x + size * 0.2, screenPos.y + size * 0.6);
        this.ctx.lineTo(screenPos.x + size * 0.2, screenPos.y + size * 0.4);
        this.ctx.stroke();

        // Central cross for targeting
        this.ctx.strokeStyle = VECTOR_COLORS.primary;
        this.ctx.lineWidth = 1;
        const crossSize = size * 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x - crossSize, screenPos.y);
        this.ctx.lineTo(screenPos.x - size * 1.5, screenPos.y);
        this.ctx.moveTo(screenPos.x + size * 1.5, screenPos.y);
        this.ctx.lineTo(screenPos.x + crossSize, screenPos.y);
        this.ctx.moveTo(screenPos.x, screenPos.y - crossSize);
        this.ctx.lineTo(screenPos.x, screenPos.y - size * 1.5);
        this.ctx.moveTo(screenPos.x, screenPos.y + size * 1.5);
        this.ctx.lineTo(screenPos.x, screenPos.y + crossSize);
        this.ctx.stroke();

        // Center dot
        this.ctx.fillStyle = VECTOR_COLORS.primary;
        this.ctx.fillRect(screenPos.x - 1, screenPos.y - 1, 3, 3);
    }

    /**
     * Render satellite (wireframe)
     */
    private renderSatellite(sat: any, screenPos: any): void {
        const size = Math.max(3, this.camera.getScreenSize(10, screenPos.distance));

        // Draw satellite as wireframe with solar panels
        this.ctx.strokeStyle = VECTOR_COLORS.station;
        this.ctx.lineWidth = 1;

        // Main body (square)
        this.ctx.beginPath();
        this.ctx.rect(screenPos.x - size / 2, screenPos.y - size / 2, size, size);
        // Solar panels
        this.ctx.rect(screenPos.x - size * 1.5, screenPos.y - size * 0.3, size * 0.4, size * 0.6);
        this.ctx.rect(screenPos.x + size * 1.1, screenPos.y - size * 0.3, size * 0.4, size * 0.6);
        this.ctx.stroke();

        // Center dot
        this.ctx.fillStyle = VECTOR_COLORS.station;
        this.ctx.fillRect(screenPos.x - 1, screenPos.y - 1, 2, 2);

        // Draw label if close
        if (this.showLabels && screenPos.distance < 5e4) {
            this.drawLabel(screenPos.x, screenPos.y + size + 10, sat.name, VECTOR_COLORS.station);
        }
    }

    /**
     * Render orbital paths (dotted circles)
     */
    private renderOrbits(starSystem: StarSystem): void {
        this.ctx.strokeStyle = VECTOR_COLORS.tertiary;
        this.ctx.globalAlpha = 0.4;
        this.ctx.lineWidth = 1;

        // Render planet orbits around star (dotted)
        const star = starSystem.star;
        const starScreen = this.camera.worldToScreen(star.position);

        for (const planet of starSystem.planets) {
            const dx = planet.position.x - star.position.x;
            const dy = planet.position.y - star.position.y;
            const orbitRadius = Math.sqrt(dx * dx + dy * dy);

            const screenRadius = this.camera.getScreenSize(orbitRadius, starScreen.distance);

            if (screenRadius > 10 && screenRadius < 2000) {
                // Draw dotted circle
                this.ctx.setLineDash([3, 6]);
                this.ctx.beginPath();
                this.ctx.arc(starScreen.x, starScreen.y, screenRadius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Render velocity vector (bright line with arrowhead)
     */
    private renderVelocityVector(ship: any, screenPos: any): void {
        const velMag = Math.sqrt(
            ship.velocity.x ** 2 + ship.velocity.y ** 2 + ship.velocity.z ** 2
        );

        if (velMag < 1) return; // Don't draw if nearly stationary

        // Calculate velocity endpoint in world space
        const scale = 1500; // Scale factor for visibility
        const velEnd: Vector3 = {
            x: ship.position.x + (ship.velocity.x / velMag) * scale,
            y: ship.position.y + (ship.velocity.y / velMag) * scale,
            z: ship.position.z + (ship.velocity.z / velMag) * scale
        };

        const velEndScreen = this.camera.worldToScreen(velEnd);

        // Draw velocity vector (bright yellow-green)
        this.ctx.strokeStyle = VECTOR_COLORS.star;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.8;

        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y);
        this.ctx.lineTo(velEndScreen.x, velEndScreen.y);
        this.ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(velEndScreen.y - screenPos.y, velEndScreen.x - screenPos.x);
        const arrowSize = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(velEndScreen.x, velEndScreen.y);
        this.ctx.lineTo(
            velEndScreen.x - arrowSize * Math.cos(angle - Math.PI / 6),
            velEndScreen.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            velEndScreen.x - arrowSize * Math.cos(angle + Math.PI / 6),
            velEndScreen.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.stroke();

        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Draw text label (monospace, retro terminal style)
     */
    private drawLabel(x: number, y: number, text: string, color: string): void {
        this.ctx.font = '10px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        // Draw text with slight glow effect
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillText(text, x - 1, y);
        this.ctx.fillText(text, x + 1, y);
        this.ctx.fillText(text, x, y - 1);
        this.ctx.fillText(text, x, y + 1);

        this.ctx.globalAlpha = 1.0;
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
