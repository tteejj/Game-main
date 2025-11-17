/**
 * NAVIGATION / SENSORS Station
 * Sensors, radar, tactical display, navigation computer
 * Based on design: 01-CONTROL-STATIONS.md
 */

import { SpacecraftAdapter } from '../../spacecraft-adapter';

type NavMode = 'sensors' | 'landing' | 'docking';

export class NavigationPanel {
    private ctx: CanvasRenderingContext2D;
    private palette: any;
    private spacecraft: SpacecraftAdapter;

    // State
    private radarRange: number = 10; // km
    private currentMode: NavMode = 'sensors';

    constructor(ctx: CanvasRenderingContext2D, palette: any, spacecraft: SpacecraftAdapter) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
    }

    handleInput(key: string): void {
        const keyLower = key.toLowerCase();

        // Mode switching
        if (keyLower === 'tab' || keyLower === 'm') {
            this.cycleMode();
            return;
        }

        // Mode-specific controls
        switch (this.currentMode) {
            case 'sensors':
                this.handleSensorsInput(keyLower);
                break;
            case 'landing':
                this.handleLandingInput(keyLower);
                break;
            case 'docking':
                this.handleDockingInput(keyLower);
                break;
        }
    }

    private cycleMode(): void {
        const modes: NavMode[] = ['sensors', 'landing', 'docking'];
        const currentIndex = modes.indexOf(this.currentMode);
        this.currentMode = modes[(currentIndex + 1) % modes.length];
        console.log(`Nav mode: ${this.currentMode.toUpperCase()}`);
    }

    private handleSensorsInput(key: string): void {
        switch (key) {
            case 'r':
                this.spacecraft.setRadarActive(true);
                console.log('Radar toggled');
                break;
            case 'z':
                this.radarRange = Math.min(100, this.radarRange + 5);
                this.spacecraft.setRadarRange(this.radarRange);
                console.log(`Radar range: ${this.radarRange}km`);
                break;
            case 'x':
                this.radarRange = Math.max(1, this.radarRange - 5);
                this.spacecraft.setRadarRange(this.radarRange);
                console.log(`Radar range: ${this.radarRange}km`);
                break;
        }
    }

    private handleLandingInput(key: string): void {
        switch (key) {
            case 'g':
                this.spacecraft.deployLandingGear();
                console.log('Landing gear deploying...');
                break;
            case 'r':
                this.spacecraft.retractLandingGear();
                console.log('Landing gear retracting...');
                break;
            case 'l':
                const gearData = this.spacecraft.getLandingGearTelemetry();
                this.spacecraft.toggleLandingLights(!gearData.lightsOn);
                console.log(`Landing lights: ${!gearData.lightsOn ? 'ON' : 'OFF'}`);
                break;
            case 't':
                const terrainData = this.spacecraft.getLandingGearTelemetry();
                if (terrainData.terrainRadarActive) {
                    this.spacecraft.deactivateTerrainRadar();
                    console.log('Terrain radar OFF');
                } else {
                    this.spacecraft.activateTerrainRadar();
                    console.log('Terrain radar ON');
                }
                break;
            case 's':
                const safety = this.spacecraft.checkLandingSafety();
                console.log(`Landing safety: ${safety.safe ? 'SAFE' : 'UNSAFE'}`);
                if (!safety.safe) {
                    console.log('Reasons:', safety.reasons.join(', '));
                }
                break;
        }
    }

    private handleDockingInput(key: string): void {
        switch (key) {
            case 'i':
                this.spacecraft.initiateDocking('port_fwd', null);
                console.log('Initiating docking sequence...');
                break;
            case 'c':
                this.spacecraft.attemptDockingCapture();
                console.log('Attempting capture...');
                break;
            case 'h':
                this.spacecraft.completeHardDock();
                console.log('Completing hard dock...');
                break;
            case 'u':
                this.spacecraft.undock('port_fwd');
                console.log('Undocking...');
                break;
        }
    }

    render(): void {
        const ctx = this.ctx;
        const navData = this.spacecraft.getNavigationTelemetry();

        // Title with mode indicator
        ctx.font = 'bold 20px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText(`NAVIGATION - ${this.currentMode.toUpperCase()}`, 40, 40);

        ctx.font = '14px "Courier New"';

        // Show altitude and velocity (always visible)
        let infoY = 620;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText(`Altitude: ${navData.altitude.toFixed(0)}m`, 40, infoY);
        ctx.fillText(`V/S: ${navData.verticalSpeed.toFixed(1)}m/s`, 250, infoY);
        ctx.fillText(`Speed: ${navData.horizontalSpeed.toFixed(1)}m/s`, 450, infoY);

        // Mode-specific rendering
        switch (this.currentMode) {
            case 'sensors':
                this.renderSensorsMode();
                break;
            case 'landing':
                this.renderLandingMode();
                break;
            case 'docking':
                this.renderDockingMode();
                break;
        }

        // Keyboard hints
        this.renderKeyboardHints();
    }

    private renderSensorsMode(): void {
        const ctx = this.ctx;
        const sensorData = this.spacecraft.getSensorTelemetry();

        // Tactical Display (left side)
        let y = 80;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('TACTICAL DISPLAY', 40, y);

        // Draw radar circle
        const radarX = 200;
        const radarY = 250;
        const radarRadius = 120;
        ctx.strokeStyle = this.palette.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(radarX, radarY, radarRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw crosshairs
        ctx.beginPath();
        ctx.moveTo(radarX - radarRadius, radarY);
        ctx.lineTo(radarX + radarRadius, radarY);
        ctx.moveTo(radarX, radarY - radarRadius);
        ctx.lineTo(radarX, radarY + radarRadius);
        ctx.stroke();

        // Draw ship (center)
        ctx.fillStyle = this.palette.primary;
        ctx.fillRect(radarX - 3, radarY - 3, 6, 6);

        // Sensors (right side)
        y = 80;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('SENSORS', 450, y);
        y += 30;
        ctx.fillStyle = sensorData.radarActive ? this.palette.primary : this.palette.muted;
        ctx.fillText(`RADAR: ${sensorData.radarActive ? 'ACTIVE' : 'OFF'}  (R)`, 470, y);
        y += 25;
        ctx.fillStyle = this.palette.secondary;
        ctx.fillText(`Range: ${this.radarRange}km  (Z/X)`, 470, y);
        y += 20;
        ctx.fillText(`Gain: ${sensorData.radarGain}%  (C/V)`, 470, y);
        y += 40;
        ctx.fillStyle = sensorData.lidarActive ? this.palette.primary : this.palette.muted;
        ctx.fillText(`LIDAR: ${sensorData.lidarActive ? 'ACTIVE' : 'PASSIVE'}  (L)`, 470, y);

        // Contacts
        y += 50;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('CONTACTS', 450, y);
        y += 25;
        ctx.fillStyle = this.palette.muted;
        ctx.fillText('No contacts detected', 470, y);
    }

    private renderLandingMode(): void {
        const ctx = this.ctx;
        const gearData = this.spacecraft.getLandingGearTelemetry();
        const safety = this.spacecraft.checkLandingSafety();

        let y = 80;

        // Landing Gear Status
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('LANDING GEAR STATUS', 40, y);
        y += 30;

        const deployedColor = gearData.deployed ? this.palette.primary : this.palette.muted;
        const lockedColor = gearData.locked ? this.palette.primary : this.palette.warning;

        ctx.fillStyle = deployedColor;
        ctx.fillText(`DEPLOYED: ${gearData.deployed ? 'YES' : 'NO'}  (G)`, 60, y);
        y += 25;
        ctx.fillStyle = lockedColor;
        ctx.fillText(`LOCKED:   ${gearData.locked ? 'YES' : 'NO'}`, 60, y);
        y += 25;
        ctx.fillStyle = gearData.surfaceContact ? this.palette.primary : this.palette.muted;
        ctx.fillText(`CONTACT:  ${gearData.surfaceContact ? 'YES' : 'NO'}`, 60, y);
        y += 40;

        // Individual Gear Status
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('GEAR HEALTH', 60, y);
        y += 25;

        gearData.gearHealth.forEach((gear: any, index: number) => {
            const healthColor = gear.health > 0.7 ? this.palette.primary :
                               gear.health > 0.3 ? this.palette.warning : this.palette.danger;
            ctx.fillStyle = healthColor;
            const healthPct = (gear.health * 100).toFixed(0);
            const compression = (gear.compression * 100).toFixed(0);
            ctx.fillText(`${gear.id}: ${healthPct}% HP, ${compression}% COMP`, 80, y);
            y += 20;
        });

        // Terrain Radar (right side)
        y = 80;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('TERRAIN RADAR', 450, y);
        y += 30;

        const radarColor = gearData.terrainRadarActive ? this.palette.primary : this.palette.muted;
        ctx.fillStyle = radarColor;
        ctx.fillText(`STATUS: ${gearData.terrainRadarActive ? 'ACTIVE' : 'OFF'}  (T)`, 470, y);
        y += 30;

        if (gearData.terrainData) {
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(`ALT: ${gearData.terrainData.altitude.toFixed(1)}m`, 470, y);
            y += 20;
            ctx.fillText(`SLOPE: ${gearData.terrainData.slope.toFixed(1)}°`, 470, y);
            y += 20;
            ctx.fillText(`SURFACE: ${gearData.terrainData.surfaceType}`, 470, y);
        } else {
            ctx.fillStyle = this.palette.muted;
            ctx.fillText('No terrain data', 470, y);
        }

        // Landing Safety
        y += 50;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('LANDING SAFETY  (S)', 450, y);
        y += 25;

        const safetyColor = safety.safe ? this.palette.primary : this.palette.danger;
        ctx.fillStyle = safetyColor;
        ctx.fillText(safety.safe ? 'SAFE TO LAND' : 'UNSAFE', 470, y);
        y += 25;

        if (!safety.safe) {
            ctx.fillStyle = this.palette.warning;
            ctx.font = '12px "Courier New"';
            safety.reasons.forEach((reason: string) => {
                ctx.fillText(`- ${reason}`, 470, y);
                y += 18;
            });
            ctx.font = '14px "Courier New"';
        }

        // Landing Lights
        y += 20;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('LANDING LIGHTS  (L)', 450, y);
        y += 25;
        ctx.fillStyle = gearData.lightsOn ? this.palette.primary : this.palette.muted;
        ctx.fillText(gearData.lightsOn ? '● ON' : '○ OFF', 470, y);
    }

    private renderDockingMode(): void {
        const ctx = this.ctx;
        const dockingData = this.spacecraft.getDockingTelemetry();

        let y = 80;

        // Docking Status
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('DOCKING STATUS', 40, y);
        y += 30;

        const operationalColor = dockingData.operational ? this.palette.primary : this.palette.danger;
        ctx.fillStyle = operationalColor;
        ctx.fillText(`OPERATIONAL: ${dockingData.operational ? 'YES' : 'NO'}`, 60, y);
        y += 25;

        if (dockingData.dockingInProgress) {
            ctx.fillStyle = this.palette.warning;
            ctx.fillText(`DOCKING IN PROGRESS`, 60, y);
            y += 25;
            ctx.fillStyle = this.palette.secondary;
            const progress = (dockingData.latchProgress * 100).toFixed(0);
            ctx.fillText(`LATCH PROGRESS: ${progress}%`, 60, y);
            y += 25;
        }

        if (dockingData.activePort) {
            ctx.fillStyle = this.palette.primary;
            ctx.fillText(`ACTIVE PORT: ${dockingData.activePort}`, 60, y);
            y += 25;
        }

        // Docking Ports
        y += 20;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('DOCKING PORTS', 40, y);
        y += 25;

        dockingData.ports.forEach((port: any) => {
            const statusColor = port.status === 'hard_docked' ? this.palette.primary :
                               port.status === 'captured' ? this.palette.warning :
                               port.status === 'damaged' ? this.palette.danger : this.palette.muted;

            ctx.fillStyle = statusColor;
            ctx.fillText(`${port.id}: ${port.status.toUpperCase()}`, 60, y);
            y += 20;

            if (port.connectedTo) {
                ctx.fillStyle = this.palette.secondary;
                ctx.fillText(`  → ${port.connectedTo}`, 80, y);
                y += 20;
            }
        });

        // Alignment Guidance (right side)
        y = 80;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('ALIGNMENT GUIDANCE', 450, y);
        y += 30;

        const guidance = this.spacecraft.getDockingGuidance();
        if (guidance && dockingData.targetData) {
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(`RANGE: ${guidance.range?.toFixed(1) || 'N/A'}m`, 470, y);
            y += 20;
            ctx.fillText(`RATE: ${dockingData.approachRate.toFixed(2)}m/s`, 470, y);
            y += 20;

            if (dockingData.targetData.relativeAttitude) {
                const att = dockingData.targetData.relativeAttitude;
                ctx.fillText(`ROLL:  ${att.roll.toFixed(1)}°`, 470, y);
                y += 20;
                ctx.fillText(`PITCH: ${att.pitch.toFixed(1)}°`, 470, y);
                y += 20;
                ctx.fillText(`YAW:   ${att.yaw.toFixed(1)}°`, 470, y);
            }
        } else {
            ctx.fillStyle = this.palette.muted;
            ctx.fillText('No target', 470, y);
        }

        // Docking Controls
        y += 50;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('DOCKING CONTROLS', 450, y);
        y += 25;
        ctx.fillStyle = this.palette.secondary;
        ctx.font = '12px "Courier New"';
        ctx.fillText('I = Initiate docking', 470, y);
        y += 18;
        ctx.fillText('C = Attempt capture', 470, y);
        y += 18;
        ctx.fillText('H = Complete hard dock', 470, y);
        y += 18;
        ctx.fillText('U = Undock', 470, y);
        ctx.font = '14px "Courier New"';
    }

    private renderKeyboardHints(): void {
        const ctx = this.ctx;
        const hintsY = ctx.canvas.height - 30;
        ctx.fillStyle = this.palette.muted;
        ctx.font = '12px "Courier New"';

        let hints = '';
        switch (this.currentMode) {
            case 'sensors':
                hints = 'R=Radar  Z/X=Range  TAB/M=Mode';
                break;
            case 'landing':
                hints = 'G=Deploy  R=Retract  L=Lights  T=Terrain  S=Safety  TAB/M=Mode';
                break;
            case 'docking':
                hints = 'I=Initiate  C=Capture  H=HardDock  U=Undock  TAB/M=Mode';
                break;
        }
        ctx.fillText(hints, 40, hintsY);
    }
}
