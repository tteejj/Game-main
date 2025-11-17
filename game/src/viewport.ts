/**
 * Viewport Renderer
 * Renders the game world: ship, planets, stars, etc.
 */

import { StarSystem } from '../../universe-system/src/StarSystem';
import { SpacecraftAdapter } from './spacecraft-adapter';
import { Vector3 } from '../../universe-system/src/CelestialBody';

export class Viewport {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private camera: {
        position: Vector3;
        zoom: number;
        following: boolean;
    };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');
        this.ctx = ctx;

        this.camera = {
            position: { x: 0, y: 0, z: 0 },
            zoom: 1e-6, // 1 pixel = 1,000 km
            following: true
        };
    }

    /**
     * Render the game world
     */
    render(system: StarSystem, ship: SpacecraftAdapter): void {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Update camera to follow ship
        if (this.camera.following) {
            this.camera.position = ship.getPosition();
        }

        // Clear
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        // Draw starfield
        this.drawStarfield();

        // Draw celestial bodies
        this.drawStar(system.star);

        for (const planet of system.planets) {
            this.drawPlanet(planet);
        }

        for (const moon of system.moons) {
            this.drawMoon(moon);
        }

        // Draw stations
        for (const station of system.stations) {
            this.drawStation(station);
        }

        // Draw ship
        this.drawShip(ship);

        // Draw velocity vector
        this.drawVelocityVector(ship);

        // Draw HUD overlay
        this.drawHUD(system, ship);
    }

    private drawStarfield(): void {
        const ctx = this.ctx;
        const seed = 12345;
        let s = seed;
        const random = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };

        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 200; i++) {
            const x = random() * this.canvas.width;
            const y = random() * this.canvas.height;
            const brightness = random();

            if (brightness > 0.7) {
                ctx.globalAlpha = brightness;
                ctx.fillRect(x, y, 1, 1);
            }
        }
        ctx.globalAlpha = 1.0;
    }

    private drawStar(star: any): void {
        const screenPos = this.worldToScreen(star.position);
        if (!screenPos) return;

        const ctx = this.ctx;
        const radius = Math.max(20, star.physical.radius * this.camera.zoom);

        // Glow effect
        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, radius * 2
        );
        gradient.addColorStop(0, star.visual.color);
        gradient.addColorStop(0.5, star.visual.color + '88');
        gradient.addColorStop(1, star.visual.color + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(star.name, screenPos.x + radius + 5, screenPos.y);
    }

    private drawPlanet(planet: any): void {
        const screenPos = this.worldToScreen(planet.position);
        if (!screenPos) return;

        const ctx = this.ctx;
        const radius = Math.max(3, planet.physical.radius * this.camera.zoom);

        // Planet body
        ctx.fillStyle = planet.visual.color || '#888888';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Atmosphere glow if present
        if (planet.atmosphere) {
            ctx.strokeStyle = '#4488ff44';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Label
        if (radius > 5) {
            ctx.fillStyle = '#cccccc';
            ctx.font = '10px monospace';
            ctx.fillText(planet.name, screenPos.x + radius + 3, screenPos.y);
        }
    }

    private drawMoon(moon: any): void {
        const screenPos = this.worldToScreen(moon.position);
        if (!screenPos) return;

        const ctx = this.ctx;
        const radius = Math.max(2, moon.physical.radius * this.camera.zoom);

        ctx.fillStyle = '#aaaaaa';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawStation(station: any): void {
        const screenPos = this.worldToScreen(station.position);
        if (!screenPos) return;

        const ctx = this.ctx;

        // Draw as square
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(screenPos.x - 3, screenPos.y - 3, 6, 6);

        // Label
        ctx.fillStyle = '#00ff00';
        ctx.font = '9px monospace';
        ctx.fillText(station.name, screenPos.x + 5, screenPos.y);
    }

    private drawShip(ship: SpacecraftAdapter): void {
        const screenPos = this.worldToScreen(ship.getPosition());
        if (!screenPos) return;

        const ctx = this.ctx;

        // Ship as triangle
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);

        // Rotate based on ship orientation (simplified - just use velocity direction)
        const vel = ship.getVelocity();
        const angle = Math.atan2(vel.y, vel.x);
        ctx.rotate(angle);

        // Draw triangle
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-4, 4);
        ctx.lineTo(-4, -4);
        ctx.closePath();
        ctx.fill();

        // Thruster glow if engine firing
        if (ship.isEngineFiring()) {
            ctx.fillStyle = '#ff880088';
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.lineTo(-12, 3);
            ctx.lineTo(-12, -3);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    private drawVelocityVector(ship: SpacecraftAdapter): void {
        const screenPos = this.worldToScreen(ship.getPosition());
        if (!screenPos) return;

        const vel = ship.getVelocity();
        const velMag = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

        if (velMag < 0.1) return; // Don't draw if stationary

        const ctx = this.ctx;
        const scale = 0.1; // Scale for visibility

        const endX = screenPos.x + vel.x * scale;
        const endY = screenPos.y + vel.y * scale;

        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(endY - screenPos.y, endX - screenPos.x);
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 8 * Math.cos(angle - Math.PI / 6), endY - 8 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - 8 * Math.cos(angle + Math.PI / 6), endY - 8 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    private drawHUD(system: StarSystem, ship: SpacecraftAdapter): void {
        const ctx = this.ctx;
        const pos = ship.getPosition();

        // Find nearest body
        const nearest = system.findNearestBody(pos, ['STATION']);
        let altitude = 0;
        let nearestName = 'Unknown';

        if (nearest) {
            const dx = pos.x - nearest.position.x;
            const dy = pos.y - nearest.position.y;
            const dz = pos.z - nearest.position.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            altitude = distance - nearest.physical.radius;
            nearestName = nearest.name;
        }

        // HUD background
        ctx.fillStyle = '#00000088';
        ctx.fillRect(10, 10, 250, 120);

        // System info
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.fillText(`SYSTEM: ${system.name}`, 15, 25);
        ctx.fillText(`STAR: ${system.star.starClass}-class`, 15, 40);
        ctx.fillText(`NEAREST: ${nearestName}`, 15, 55);
        ctx.fillText(`ALTITUDE: ${(altitude / 1000).toFixed(1)} km`, 15, 70);

        // Velocity
        const vel = ship.getVelocity();
        const velMag = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
        ctx.fillText(`VELOCITY: ${velMag.toFixed(1)} m/s`, 15, 85);

        // Position
        ctx.fillText(`POS: ${(pos.x / 1000).toFixed(0)}, ${(pos.y / 1000).toFixed(0)}`, 15, 100);

        // Zoom level
        ctx.fillText(`ZOOM: ${(1 / this.camera.zoom / 1000).toFixed(0)}x`, 15, 115);
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    private worldToScreen(worldPos: Vector3): { x: number; y: number } | null {
        const relX = worldPos.x - this.camera.position.x;
        const relY = worldPos.y - this.camera.position.y;

        const screenX = this.canvas.width / 2 + relX * this.camera.zoom;
        const screenY = this.canvas.height / 2 + relY * this.camera.zoom;

        // Basic culling
        const margin = 100;
        if (screenX < -margin || screenX > this.canvas.width + margin ||
            screenY < -margin || screenY > this.canvas.height + margin) {
            return null;
        }

        return { x: screenX, y: screenY };
    }

    /**
     * Adjust zoom level
     */
    adjustZoom(delta: number): void {
        this.camera.zoom *= (1 + delta);
        this.camera.zoom = Math.max(1e-8, Math.min(1e-3, this.camera.zoom));
    }

    /**
     * Toggle camera following
     */
    toggleFollow(): void {
        this.camera.following = !this.camera.following;
    }
}
