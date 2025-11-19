/**
 * HUD (Heads-Up Display)
 * Shows critical flight information overlaid on all panels
 * - Attitude indicator (navball)
 * - Velocity vector
 * - Altitude
 * - Speed
 * - Orientation (pitch, roll, yaw)
 */

import { SpacecraftAdapter } from '../spacecraft-adapter';
import { PlayerShipIntegration } from '../../../universe-system/src/PlayerShipIntegration';

export class HUD {
    private ctx: CanvasRenderingContext2D;
    private palette: any;
    private spacecraft: SpacecraftAdapter;
    private canvas: HTMLCanvasElement;
    private playerIntegration: PlayerShipIntegration | null = null;

    constructor(ctx: CanvasRenderingContext2D, palette: any, spacecraft: SpacecraftAdapter, canvas: HTMLCanvasElement) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
        this.canvas = canvas;
    }

    setPlayerIntegration(integration: PlayerShipIntegration): void {
        this.playerIntegration = integration;
    }

    render(): void {
        // Render HUD elements
        this.renderNavball();
        this.renderVelocityVector();
        this.renderFlightData();
        this.renderAttitudeReadout();
        this.renderShipOrientation();

        // Render player status (if integration available)
        if (this.playerIntegration) {
            this.renderPlayerStatus();
            this.renderMissionStatus();
            this.renderReputationStatus();
        }
    }

    /**
     * Render navball (attitude indicator)
     */
    private renderNavball(): void {
        const ctx = this.ctx;
        const state = this.spacecraft.getState();

        // Position in bottom-left corner
        const centerX = 100;
        const centerY = this.canvas.height - 100;
        const radius = 60;

        // Extract euler angles from quaternion
        const attitude = state.physics.attitude;
        const { pitch, roll, yaw } = this.quaternionToEuler(attitude);

        // Draw navball background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw horizon line
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-roll * Math.PI / 180); // Apply roll

        // Calculate horizon Y offset based on pitch
        const horizonOffset = (pitch / 90) * radius;

        // Sky (blue)
        ctx.fillStyle = '#0066cc';
        ctx.beginPath();
        ctx.arc(0, horizonOffset, radius, 0, Math.PI * 2);
        ctx.fill();

        // Ground (brown)
        ctx.fillStyle = '#663300';
        ctx.beginPath();
        ctx.rect(-radius, horizonOffset, radius * 2, radius * 2);
        ctx.fill();

        // Horizon line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-radius, horizonOffset);
        ctx.lineTo(radius, horizonOffset);
        ctx.stroke();

        // Pitch ladder (simplified)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let deg = -90; deg <= 90; deg += 10) {
            if (deg === 0) continue;
            const y = horizonOffset + (deg / 90) * radius;
            if (Math.abs(y) < radius) {
                const lineLen = deg % 30 === 0 ? 30 : 15;
                ctx.beginPath();
                ctx.moveTo(-lineLen, y);
                ctx.lineTo(lineLen, y);
                ctx.stroke();

                // Label major lines
                if (deg % 30 === 0) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '10px "Courier New"';
                    ctx.textAlign = 'left';
                    ctx.fillText(`${Math.abs(deg)}`, lineLen + 5, y + 3);
                }
            }
        }

        ctx.restore();

        // Draw center crosshair (aircraft symbol)
        ctx.strokeStyle = this.palette.warning;
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Center dot
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.stroke();
        // Wings
        ctx.beginPath();
        ctx.moveTo(centerX - 40, centerY);
        ctx.lineTo(centerX - 10, centerY);
        ctx.moveTo(centerX + 10, centerY);
        ctx.lineTo(centerX + 40, centerY);
        ctx.stroke();
        // Center vertical
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 5);
        ctx.lineTo(centerX, centerY + 15);
        ctx.stroke();

        // Draw navball frame
        ctx.strokeStyle = this.palette.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = this.palette.info;
        ctx.font = '12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('ATTITUDE', centerX, centerY + radius + 20);
    }

    /**
     * Render velocity vector
     */
    private renderVelocityVector(): void {
        const ctx = this.ctx;
        const state = this.spacecraft.getState();
        const vel = state.physics.velocity;

        // Position in bottom-right corner
        const centerX = this.canvas.width - 120;
        const centerY = this.canvas.height - 100;
        const radius = 60;

        // Calculate velocity magnitude and direction
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw compass directions
        ctx.strokeStyle = this.palette.muted;
        ctx.lineWidth = 1;
        ctx.font = '10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labels = ['N', 'E', 'S', 'W'];
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) - Math.PI / 2; // Start at North
            const x = centerX + Math.cos(angle) * (radius - 15);
            const y = centerY + Math.sin(angle) * (radius - 15);
            ctx.fillStyle = this.palette.muted;
            ctx.fillText(labels[i], x, y);
        }

        // Draw velocity vector if moving
        if (speed > 0.1) {
            // Calculate velocity direction (simplified 2D projection)
            const velAngle = Math.atan2(vel.y, vel.x);
            const velLength = Math.min(radius * 0.6, (speed / 100) * radius * 0.6);

            ctx.strokeStyle = this.palette.warning;
            ctx.fillStyle = this.palette.warning;
            ctx.lineWidth = 2;

            // Arrow
            const arrowX = centerX + Math.cos(velAngle) * velLength;
            const arrowY = centerY + Math.sin(velAngle) * velLength;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(arrowX, arrowY);
            ctx.stroke();

            // Arrowhead
            const headLen = 10;
            const headAngle = Math.PI / 6;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
                arrowX - headLen * Math.cos(velAngle - headAngle),
                arrowY - headLen * Math.sin(velAngle - headAngle)
            );
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
                arrowX - headLen * Math.cos(velAngle + headAngle),
                arrowY - headLen * Math.sin(velAngle + headAngle)
            );
            ctx.stroke();

            // Velocity magnitude
            ctx.fillStyle = this.palette.warning;
            ctx.font = '10px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(`${speed.toFixed(1)} m/s`, centerX, centerY + 5);
        } else {
            // Stationary indicator
            ctx.fillStyle = this.palette.muted;
            ctx.font = '10px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('0 m/s', centerX, centerY);
        }

        // Frame
        ctx.strokeStyle = this.palette.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = this.palette.info;
        ctx.font = '12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('VELOCITY', centerX, centerY + radius + 20);
    }

    /**
     * Render flight data (top-left corner)
     */
    private renderFlightData(): void {
        const ctx = this.ctx;
        const navData = this.spacecraft.getNavigationTelemetry();
        const state = this.spacecraft.getState();

        const x = 20;
        let y = 80;

        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 5, y - 20, 250, 120);

        ctx.font = '14px "Courier New"';
        ctx.fillStyle = this.palette.primary;

        // Altitude
        const alt = navData.altitude;
        const altKm = (alt / 1000).toFixed(1);
        ctx.fillText(`ALT:  ${altKm} km`, x, y);
        y += 20;

        // Vertical speed
        const vs = navData.verticalSpeed;
        const vsColor = vs < -10 ? this.palette.danger : this.palette.primary;
        ctx.fillStyle = vsColor;
        ctx.fillText(`V/S:  ${vs.toFixed(1)} m/s`, x, y);
        y += 20;

        // Horizontal speed
        ctx.fillStyle = this.palette.primary;
        const hSpeed = navData.horizontalSpeed;
        ctx.fillText(`SPD:  ${hSpeed.toFixed(1)} m/s`, x, y);
        y += 20;

        // Total velocity
        const vel = state.physics.velocity;
        const totalSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
        ctx.fillText(`|V|:  ${totalSpeed.toFixed(1)} m/s`, x, y);
        y += 20;

        // G-force
        const accel = state.physics.acceleration || { x: 0, y: 0, z: 0 };
        const gForce = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z) / 9.81;
        const gColor = gForce > 3 ? this.palette.danger : this.palette.primary;
        ctx.fillStyle = gColor;
        ctx.fillText(`G:    ${gForce.toFixed(2)}`, x, y);
    }

    /**
     * Render attitude readout (top-center)
     */
    private renderAttitudeReadout(): void {
        const ctx = this.ctx;
        const state = this.spacecraft.getState();
        const attitude = state.physics.attitude;
        const { pitch, roll, yaw } = this.quaternionToEuler(attitude);

        const centerX = this.canvas.width / 2;
        const y = 80;

        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(centerX - 150, y - 20, 300, 60);

        ctx.font = '14px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.palette.primary;

        ctx.fillText(`PITCH: ${pitch.toFixed(1)}°  ROLL: ${roll.toFixed(1)}°  YAW: ${yaw.toFixed(1)}°`, centerX, y);

        // Heading indicator
        const heading = (yaw + 360) % 360;
        ctx.fillText(`HDG: ${heading.toFixed(0)}°`, centerX, y + 25);
    }

    /**
     * Render ship orientation indicator (center screen)
     */
    private renderShipOrientation(): void {
        const ctx = this.ctx;
        const state = this.spacecraft.getState();
        const attitude = state.physics.attitude;
        const { yaw } = this.quaternionToEuler(attitude);
        const engineState = this.spacecraft.getMainEngineState();

        // Position in center-bottom of screen
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height - 180;

        // Draw ship icon (top-down view)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-yaw * Math.PI / 180);

        // Ship body (simple triangle)
        ctx.strokeStyle = this.palette.primary;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -20); // Nose
        ctx.lineTo(-12, 12); // Port wing
        ctx.lineTo(0, 8);    // Tail center
        ctx.lineTo(12, 12);  // Starboard wing
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Engine thrust indicator
        if (engineState.status === 'running' && engineState.thrust > 0) {
            const thrustLength = (engineState.thrust / engineState.maxThrust) * 20;
            ctx.strokeStyle = this.palette.warning;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.lineTo(0, 8 + thrustLength);
            ctx.stroke();
        }

        ctx.restore();

        // Compass rose
        ctx.strokeStyle = this.palette.muted;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
        ctx.stroke();

        // Cardinal directions
        ctx.font = '10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.palette.muted;
        ctx.fillText('N', centerX, centerY - 50);
        ctx.fillText('S', centerX, centerY + 50);
        ctx.fillText('E', centerX + 50, centerY);
        ctx.fillText('W', centerX - 50, centerY);
    }

    /**
     * Convert quaternion to Euler angles (degrees)
     */
    private quaternionToEuler(q: { w: number; x: number; y: number; z: number }): { pitch: number; roll: number; yaw: number } {
        // Roll (x-axis rotation)
        const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
        const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
        const roll = Math.atan2(sinr_cosp, cosr_cosp) * 180 / Math.PI;

        // Pitch (y-axis rotation)
        const sinp = 2 * (q.w * q.y - q.z * q.x);
        const pitch = Math.abs(sinp) >= 1
            ? (Math.sign(sinp) * 90) // Use 90 degrees if out of range
            : Math.asin(sinp) * 180 / Math.PI;

        // Yaw (z-axis rotation)
        const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
        const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
        const yaw = Math.atan2(siny_cosp, cosy_cosp) * 180 / Math.PI;

        return { pitch, roll, yaw };
    }

    /**
     * Render player status (credits, cargo, docking)
     */
    private renderPlayerStatus(): void {
        if (!this.playerIntegration) return;

        const ctx = this.ctx;
        const state = this.playerIntegration.getState();

        // Position in top-right corner
        const x = this.canvas.width - 250;
        let y = 40;

        ctx.font = 'bold 14px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText('PLAYER STATUS', x, y);
        y += 25;

        ctx.font = '12px "Courier New"';
        ctx.fillStyle = this.palette.primary;

        // Credits
        ctx.fillText(`Credits: ${state.credits.toFixed(0)} CR`, x, y);
        y += 18;

        // Cargo
        const cargoColor = state.cargoUsed > state.cargoCapacity * 0.9 ? this.palette.danger : this.palette.primary;
        ctx.fillStyle = cargoColor;
        ctx.fillText(`Cargo: ${state.cargoUsed}/${state.cargoCapacity}`, x, y);
        y += 18;

        // Docking status
        if (state.isDocked && state.dockedAt) {
            ctx.fillStyle = this.palette.info;
            ctx.fillText(`Docked: ${state.dockedAt.name}`, x, y);
            y += 18;
        } else if (state.nearestStation) {
            const distKm = (state.distanceToStation / 1000).toFixed(1);
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(`Station: ${distKm} km`, x, y);
            y += 18;
        }

        // Criminal status
        if (state.criminalStatus) {
            ctx.fillStyle = this.palette.danger;
            ctx.fillText(`⚠ WANTED: ${state.bounty} CR`, x, y);
            y += 18;
        }

        // Combat status
        if (state.isInCombat) {
            ctx.fillStyle = this.palette.danger;
            ctx.fillText('⚠ IN COMBAT', x, y);
            y += 18;
        }
    }

    /**
     * Render active mission status
     */
    private renderMissionStatus(): void {
        if (!this.playerIntegration) return;

        const ctx = this.ctx;
        const activeMissions = this.playerIntegration.getActiveMissions();

        if (activeMissions.length === 0) return;

        // Position below player status
        const x = this.canvas.width - 250;
        let y = 180;

        ctx.font = 'bold 12px "Courier New"';
        ctx.fillStyle = this.palette.warning;
        ctx.fillText(`ACTIVE MISSIONS (${activeMissions.length})`, x, y);
        y += 20;

        ctx.font = '11px "Courier New"';
        ctx.fillStyle = this.palette.secondary;

        // Show first 3 missions
        activeMissions.slice(0, 3).forEach(mission => {
            const progress = Math.floor((mission.currentObjective / mission.objectives.length) * 100);
            ctx.fillText(`• ${mission.title}`, x, y);
            y += 15;
            ctx.fillStyle = this.palette.muted;
            ctx.fillText(`  ${progress}% | ${mission.creditReward} CR`, x, y);
            y += 18;
            ctx.fillStyle = this.palette.secondary;
        });

        if (activeMissions.length > 3) {
            ctx.fillStyle = this.palette.muted;
            ctx.fillText(`  +${activeMissions.length - 3} more...`, x, y);
        }
    }

    /**
     * Render reputation status
     */
    private renderReputationStatus(): void {
        if (!this.playerIntegration) return;

        const ctx = this.ctx;
        const reputations = this.playerIntegration.getAllReputations();

        if (reputations.size === 0) return;

        // Position in bottom-right corner
        const x = this.canvas.width - 250;
        let y = this.canvas.height - 150;

        ctx.font = 'bold 12px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText('FACTION STANDINGS', x, y);
        y += 20;

        ctx.font = '11px "Courier New"';

        // Sort by reputation and show top 5
        const sorted = Array.from(reputations.entries())
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, 5);

        sorted.forEach(([faction, rep]) => {
            const standing = this.playerIntegration!.getReputationStanding(faction);
            let color = this.palette.primary;
            if (rep >= 50) color = this.palette.info;
            else if (rep <= -50) color = this.palette.danger;
            else if (rep <= -20) color = this.palette.warning;

            ctx.fillStyle = color;
            ctx.fillText(`${faction}: ${standing} (${rep.toFixed(0)})`, x, y);
            y += 16;
        });
    }
}
