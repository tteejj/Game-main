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
    private radarMode: 'search' | 'track' | 'mapping' | 'off' = 'search';
    private opticalMode: 'visual' | 'infrared' | 'combined' = 'combined';
    private selectedContactIndex: number = 0;
    private radarActive: boolean = false;

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
            // Radar controls
            case 'r':
                this.radarActive = !this.radarActive;
                this.spacecraft.setRadarActive(this.radarActive);
                console.log(`Radar: ${this.radarActive ? 'ACTIVE' : 'OFF'}`);
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
            case 'c':
                // Cycle radar mode
                const radarModes: Array<'search' | 'track' | 'mapping' | 'off'> = ['search', 'track', 'mapping', 'off'];
                const currentIdx = radarModes.indexOf(this.radarMode);
                this.radarMode = radarModes[(currentIdx + 1) % radarModes.length];
                this.spacecraft.setRadarMode(this.radarMode);
                console.log(`Radar mode: ${this.radarMode.toUpperCase()}`);
                break;

            // Optical sensor controls
            case 'o':
                // Cycle optical mode
                const opticalModes: Array<'visual' | 'infrared' | 'combined'> = ['visual', 'infrared', 'combined'];
                const optIdx = opticalModes.indexOf(this.opticalMode);
                this.opticalMode = opticalModes[(optIdx + 1) % opticalModes.length];
                this.spacecraft.setOpticalMode(this.opticalMode);
                console.log(`Optical mode: ${this.opticalMode.toUpperCase()}`);
                break;

            // Contact selection (1-9)
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
                this.selectedContactIndex = parseInt(key) - 1;
                console.log(`Selected contact: ${this.selectedContactIndex + 1}`);
                break;

            // Track management
            case 't':
                const contacts = this.spacecraft.getRadarContacts();
                if (contacts.length > this.selectedContactIndex) {
                    const contact = contacts[this.selectedContactIndex];
                    this.spacecraft.initiateRadarTrack(contact.id);
                    console.log(`Tracking contact ${contact.id}`);
                }
                break;
            case 'q':
                const radarContacts = this.spacecraft.getRadarContacts();
                if (radarContacts.length > this.selectedContactIndex) {
                    const contact = radarContacts[this.selectedContactIndex];
                    this.spacecraft.dropRadarTrack(contact.id);
                    console.log(`Dropped track on ${contact.id}`);
                }
                break;

            // Autopilot controls - cycle through modes
            case 'a':
                const autopilotModes = ['off', 'altitude_hold', 'vertical_speed_hold',
                                       'suicide_burn', 'hover', 'landing', 'docking', 'orbital_insertion'];
                const currentMode = this.spacecraft.getAutopilotMode();
                const currentIdx = autopilotModes.indexOf(currentMode);
                const nextMode = autopilotModes[(currentIdx + 1) % autopilotModes.length];
                this.spacecraft.setAutopilotMode(nextMode);
                console.log(`Autopilot: ${nextMode.toUpperCase().replace(/_/g, ' ')}`);
                break;
            case 'd':
                // Set docking target (use selected contact or nearby station)
                const dockingContacts = this.spacecraft.getRadarContacts();
                if (dockingContacts.length > this.selectedContactIndex) {
                    const target = dockingContacts[this.selectedContactIndex];
                    if (target.position) {
                        this.spacecraft.setDockingTarget(target.position);
                        console.log(`Docking target set: ${target.id || 'Contact'}`);
                    }
                }
                break;
            case 'i':
                // Set orbital insertion altitude (100km default, can be customized)
                this.spacecraft.setTargetOrbitAltitude(100000);
                console.log('Orbital insertion target: 100km');
                break;
            case 'p':
                // Plot intercept
                const allContacts = this.spacecraft.getRadarContacts();
                if (allContacts.length > this.selectedContactIndex) {
                    const contact = allContacts[this.selectedContactIndex];
                    // Would need contact position/velocity from radar data
                    console.log(`Plot intercept to contact ${contact.id}`);
                }
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

        // Radar
        ctx.fillStyle = sensorData.radarActive ? this.palette.primary : this.palette.muted;
        ctx.fillText(`RADAR: ${sensorData.radarActive ? 'ACTIVE' : 'OFF'}  (R)`, 470, y);
        y += 20;
        ctx.fillStyle = this.palette.secondary;
        ctx.fillText(`Mode: ${this.radarMode.toUpperCase()}  (C)`, 470, y);
        y += 18;
        ctx.fillText(`Range: ${this.radarRange}km  (Z/X)`, 470, y);
        y += 18;
        ctx.fillText(`Gain: ${sensorData.radarGain}%`, 470, y);

        // Optical
        y += 30;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText(`OPTICAL: ${this.opticalMode.toUpperCase()}  (O)`, 470, y);

        // Autopilot
        y += 30;
        const autopilotMode = this.spacecraft.getAutopilotMode();
        const apColor = autopilotMode !== 'off' ? this.palette.warning : this.palette.muted;
        ctx.fillStyle = apColor;
        const modeText = autopilotMode.toUpperCase().replace(/_/g, ' ');
        ctx.fillText(`AUTOPILOT: ${modeText}  (A)`, 470, y);

        // Show autopilot phase details for advanced modes
        if (['landing', 'docking', 'orbital_insertion'].includes(autopilotMode)) {
            y += 18;
            const phases = this.spacecraft.getAutopilotPhases();
            ctx.fillStyle = this.palette.secondary;
            ctx.font = '12px "Courier New"';

            if (autopilotMode === 'landing') {
                ctx.fillText(`  Phase: ${phases.landing.toUpperCase()}`, 470, y);
            } else if (autopilotMode === 'docking') {
                ctx.fillText(`  Phase: ${phases.docking.toUpperCase()}`, 470, y);
            } else if (autopilotMode === 'orbital_insertion') {
                ctx.fillText(`  Phase: ${phases.orbitalInsertion.toUpperCase().replace(/_/g, ' ')}`, 470, y);
            }

            ctx.font = '14px "Courier New"';
        }

        // Additional autopilot controls
        y += 20;
        ctx.fillStyle = this.palette.muted;
        ctx.font = '11px "Courier New"';
        ctx.fillText('D=DockTgt I=OrbAlt', 470, y);
        ctx.font = '14px "Courier New"';

        // Contacts
        y += 50;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('CONTACTS  (1-9=Select  T=Track)', 450, y);
        y += 25;

        const radarContacts = this.spacecraft.getRadarContacts();
        const opticalContacts = this.spacecraft.getOpticalContacts();
        const allContacts = [...radarContacts, ...opticalContacts];

        if (allContacts.length > 0) {
            ctx.font = '12px "Courier New"';
            allContacts.slice(0, 9).forEach((contact: any, index: number) => {
                const isSelected = index === this.selectedContactIndex;
                ctx.fillStyle = isSelected ? this.palette.warning : this.palette.secondary;
                const prefix = isSelected ? '>' : ' ';
                const range = contact.range ? `${(contact.range / 1000).toFixed(1)}km` : 'N/A';
                const bearing = contact.bearing ? `${contact.bearing.toFixed(0)}°` : 'N/A';
                ctx.fillText(`${prefix}${index + 1}. ${range} ${bearing}`, 470, y);
                y += 16;
            });
            ctx.font = '14px "Courier New"';
        } else {
            ctx.fillStyle = this.palette.muted;
            ctx.fillText('No contacts detected', 470, y);
        }
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

        gearData.gearHealth.forEach((gear: any, _index: number) => {
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
                hints = 'R=Radar C=Mode Z/X=Range O=Optical 1-9=Contact T=Track Q=Drop A=Auto P=Plot TAB/M=SwitchMode';
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
