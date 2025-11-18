/**
 * HUD (Heads-Up Display) Renderer
 * Retro vector graphics style display - inspired by Apollo mission controls
 */

import { Vector3 } from '../../universe-system/src/CelestialBody';
import { Camera } from './camera';

// Retro color palette
const HUD_COLORS = {
    primary: '#00ff00',
    secondary: '#00cc00',
    warning: '#ffff00',
    critical: '#ff0000',
    dim: '#006600'
};

export interface HUDData {
    // Ship status
    position: Vector3;
    velocity: Vector3;
    fuel: number;
    power: number;
    health: number;

    // Target info
    targetName?: string;
    targetDistance?: number;
    targetVelocity?: Vector3;

    // Game state
    fps: number;
    gameTime: number;
    timeAcceleration: number;

    // Mission
    missionObjective?: string;
    missionProgress?: number;

    // Counts
    npcCount: number;
    stationCount: number;
}

export class HUDRenderer {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private camera: Camera;

    // HUD state
    private hudVisible: boolean = true;
    private compassVisible: boolean = true;
    private targetInfoVisible: boolean = true;

    constructor(canvas: HTMLCanvasElement, camera: Camera) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');
        this.ctx = ctx;
        this.camera = camera;
    }

    /**
     * Render complete HUD
     */
    render(data: HUDData): void {
        if (!this.hudVisible) return;

        // Top-left: Ship status
        this.renderShipStatus(data);

        // Top-right: Navigation info
        this.renderNavigationInfo(data);

        // Bottom-left: System stats
        this.renderSystemStats(data);

        // Bottom-right: Target info
        if (this.targetInfoVisible && data.targetName) {
            this.renderTargetInfo(data);
        }

        // Center: Crosshair and compass
        this.renderCrosshair();
        if (this.compassVisible) {
            this.renderCompass(data);
        }

        // Top-center: Mission info
        if (data.missionObjective) {
            this.renderMissionInfo(data);
        }
    }

    /**
     * Render ship status (top-left, terminal style)
     */
    private renderShipStatus(data: HUDData): void {
        const x = 15;
        let y = 25;

        this.ctx.font = '11px "Courier New", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        // Header
        this.ctx.fillStyle = HUD_COLORS.primary;
        this.ctx.fillText('SHIP STATUS', x, y);
        y += 15;

        this.ctx.font = '10px "Courier New", monospace';

        // Velocity
        const speed = Math.sqrt(
            data.velocity.x ** 2 + data.velocity.y ** 2 + data.velocity.z ** 2
        );
        this.ctx.fillStyle = HUD_COLORS.secondary;
        this.ctx.fillText(`VEL ${(speed / 1000).toFixed(2)} km/s`, x, y);
        y += 14;

        // Fuel
        const fuelColor = data.fuel > 50 ? HUD_COLORS.primary : data.fuel > 25 ? HUD_COLORS.warning : HUD_COLORS.critical;
        this.ctx.fillStyle = fuelColor;
        this.ctx.fillText(`FUEL ${data.fuel.toFixed(0).padStart(3, ' ')}%`, x, y);
        this.drawBarRetro(x + 80, y + 1, 60, 8, data.fuel / 100, fuelColor);
        y += 14;

        // Power
        const powerColor = data.power > 50 ? HUD_COLORS.primary : data.power > 25 ? HUD_COLORS.warning : HUD_COLORS.critical;
        this.ctx.fillStyle = powerColor;
        this.ctx.fillText(`PWR  ${data.power.toFixed(0).padStart(3, ' ')}%`, x, y);
        this.drawBarRetro(x + 80, y + 1, 60, 8, data.power / 100, powerColor);
        y += 14;

        // Hull
        const hullColor = data.health > 75 ? HUD_COLORS.primary : data.health > 50 ? HUD_COLORS.warning : HUD_COLORS.critical;
        this.ctx.fillStyle = hullColor;
        this.ctx.fillText(`HULL ${data.health.toFixed(0).padStart(3, ' ')}%`, x, y);
        this.drawBarRetro(x + 80, y + 1, 60, 8, data.health / 100, hullColor);
    }

    /**
     * Render navigation info (top-right)
     */
    private renderNavigationInfo(data: HUDData): void {
        const x = this.canvas.width - 220;
        let y = 30;

        this.drawBox(x - 5, y - 20, 220, 100);

        this.ctx.font = '14px "Courier New"';
        this.ctx.fillStyle = '#00ff00';
        this.ctx.textAlign = 'left';

        this.ctx.fillText('═══ NAVIGATION ═══', x, y);
        y += 25;

        // Position
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText('POSITION:', x, y);
        y += 18;
        this.ctx.font = '11px "Courier New"';
        this.ctx.fillText(`X: ${(data.position.x / 1000).toFixed(0)} km`, x + 10, y);
        y += 15;
        this.ctx.fillText(`Y: ${(data.position.y / 1000).toFixed(0)} km`, x + 10, y);
        y += 15;
        this.ctx.fillText(`Z: ${(data.position.z / 1000).toFixed(0)} km`, x + 10, y);
    }

    /**
     * Render system stats (bottom-left)
     */
    private renderSystemStats(data: HUDData): void {
        const x = 20;
        let y = this.canvas.height - 110;

        this.drawBox(x - 5, y - 20, 200, 120);

        this.ctx.font = '14px "Courier New"';
        this.ctx.fillStyle = '#00ff00';
        this.ctx.textAlign = 'left';

        this.ctx.fillText('═══ SYSTEM INFO ═══', x, y);
        y += 25;

        this.ctx.font = '12px "Courier New"';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText(`FPS: ${data.fps}`, x, y);
        y += 18;
        this.ctx.fillText(`Time: ${data.gameTime.toFixed(1)}s (${data.timeAcceleration}x)`, x, y);
        y += 18;
        this.ctx.fillText(`NPCs: ${data.npcCount}`, x, y);
        y += 18;
        this.ctx.fillText(`Stations: ${data.stationCount}`, x, y);
    }

    /**
     * Render target info (bottom-right)
     */
    private renderTargetInfo(data: HUDData): void {
        if (!data.targetName) return;

        const x = this.canvas.width - 220;
        let y = this.canvas.height - 110;

        this.drawBox(x - 5, y - 20, 220, 120);

        this.ctx.font = '14px "Courier New"';
        this.ctx.fillStyle = '#ffff00';
        this.ctx.textAlign = 'left';

        this.ctx.fillText('═══ TARGET INFO ═══', x, y);
        y += 25;

        this.ctx.font = '12px "Courier New"';
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillText(`NAME: ${data.targetName}`, x, y);
        y += 18;

        if (data.targetDistance !== undefined) {
            this.ctx.fillText(`RANGE: ${(data.targetDistance / 1000).toFixed(1)} km`, x, y);
            y += 18;
        }

        if (data.targetVelocity) {
            const targetSpeed = Math.sqrt(
                data.targetVelocity.x ** 2 +
                data.targetVelocity.y ** 2 +
                data.targetVelocity.z ** 2
            );
            this.ctx.fillText(`SPEED: ${(targetSpeed / 1000).toFixed(2)} km/s`, x, y);
        }
    }

    /**
     * Render mission info (top-center)
     */
    private renderMissionInfo(data: HUDData): void {
        if (!data.missionObjective) return;

        const x = this.canvas.width / 2;
        const y = 40;

        this.ctx.font = '14px "Courier New"';
        this.ctx.fillStyle = '#00ffff';
        this.ctx.textAlign = 'center';

        const text = `MISSION: ${data.missionObjective}`;
        const metrics = this.ctx.measureText(text);

        // Draw background box
        this.drawBox(x - metrics.width / 2 - 10, y - 25, metrics.width + 20, 50);

        // Draw text
        this.ctx.fillText(text, x, y);

        // Progress bar if available
        if (data.missionProgress !== undefined) {
            const barWidth = 200;
            this.drawBar(
                x - barWidth / 2,
                y + 10,
                barWidth,
                10,
                data.missionProgress,
                '#00ffff'
            );
        }
    }

    /**
     * Render crosshair (center)
     */
    private renderCrosshair(): void {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const size = 20;

        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.7;

        this.ctx.beginPath();
        // Horizontal
        this.ctx.moveTo(cx - size, cy);
        this.ctx.lineTo(cx - 5, cy);
        this.ctx.moveTo(cx + 5, cy);
        this.ctx.lineTo(cx + size, cy);
        // Vertical
        this.ctx.moveTo(cx, cy - size);
        this.ctx.lineTo(cx, cy - 5);
        this.ctx.moveTo(cx, cy + 5);
        this.ctx.lineTo(cx, cy + size);
        this.ctx.stroke();

        // Center dot
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(cx - 1, cy - 1, 2, 2);

        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Render compass (around crosshair)
     */
    private renderCompass(data: HUDData): void {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const radius = 60;

        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.5;

        // Circle
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Cardinal directions
        this.ctx.font = '10px "Courier New"';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#00ff00';

        // North (relative to camera)
        const cameraYaw = this.camera.yaw;
        const north = -cameraYaw;

        // Draw N, E, S, W markers
        const markers = [
            { angle: north, label: 'N' },
            { angle: north + Math.PI / 2, label: 'E' },
            { angle: north + Math.PI, label: 'S' },
            { angle: north + Math.PI * 1.5, label: 'W' }
        ];

        for (const marker of markers) {
            const x = cx + Math.cos(marker.angle - Math.PI / 2) * radius;
            const y = cy + Math.sin(marker.angle - Math.PI / 2) * radius;

            this.ctx.fillText(marker.label, x, y + 4);

            // Tick mark
            const tickX = cx + Math.cos(marker.angle - Math.PI / 2) * (radius - 10);
            const tickY = cy + Math.sin(marker.angle - Math.PI / 2) * (radius - 10);
            this.ctx.beginPath();
            this.ctx.moveTo(tickX, tickY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }

        // Velocity indicator
        const velMag = Math.sqrt(
            data.velocity.x ** 2 + data.velocity.y ** 2 + data.velocity.z ** 2
        );

        if (velMag > 1) {
            const velAngle = Math.atan2(data.velocity.y, data.velocity.x) - cameraYaw;
            const velX = cx + Math.cos(velAngle - Math.PI / 2) * (radius + 15);
            const velY = cy + Math.sin(velAngle - Math.PI / 2) * (radius + 15);

            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(velX, velY, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Draw a retro progress bar (segmented blocks)
     */
    private drawBarRetro(x: number, y: number, width: number, height: number, progress: number, color: string): void {
        const segments = 20;
        const segmentWidth = (width - segments + 1) / segments;
        const filledSegments = Math.floor(segments * Math.max(0, Math.min(1, progress)));

        this.ctx.strokeStyle = HUD_COLORS.dim;
        this.ctx.lineWidth = 1;

        // Draw empty segments
        for (let i = 0; i < segments; i++) {
            const segX = x + i * (segmentWidth + 1);
            this.ctx.strokeRect(segX, y, segmentWidth, height);
        }

        // Fill progress segments
        this.ctx.fillStyle = color;
        for (let i = 0; i < filledSegments; i++) {
            const segX = x + i * (segmentWidth + 1);
            this.ctx.fillRect(segX + 1, y + 1, segmentWidth - 1, height - 1);
        }
    }

    /**
     * Draw a box with border (simple wireframe)
     */
    private drawBox(x: number, y: number, width: number, height: number): void {
        this.ctx.strokeStyle = HUD_COLORS.dim;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }

    /**
     * Toggle HUD visibility
     */
    toggleHUD(): void {
        this.hudVisible = !this.hudVisible;
    }

    toggleCompass(): void {
        this.compassVisible = !this.compassVisible;
    }

    toggleTargetInfo(): void {
        this.targetInfoVisible = !this.targetInfoVisible;
    }
}
