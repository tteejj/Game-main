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

export class HUD {
    private ctx: CanvasRenderingContext2D;
    private palette: any;
    private spacecraft: SpacecraftAdapter;
    private canvas: HTMLCanvasElement;

    constructor(ctx: CanvasRenderingContext2D, palette: any, spacecraft: SpacecraftAdapter, canvas: HTMLCanvasElement) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
        this.canvas = canvas;
    }

    render(): void {
        // Render HUD elements
        this.renderNavball();
        this.renderVelocityVector();
        this.renderFlightData();
        this.renderAttitudeReadout();
        this.renderShipOrientation();
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
}
