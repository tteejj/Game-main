/**
 * ENGINEERING / POWER Station
 * Reactor, power distribution, thermal management, damage control
 * Based on design: 01-CONTROL-STATIONS.md
 */

import { SpacecraftAdapter } from '../../spacecraft-adapter';

export class EngineeringPanel {
    private ctx: CanvasRenderingContext2D;
    private palette: any;
    private spacecraft: SpacecraftAdapter;

    constructor(ctx: CanvasRenderingContext2D, palette: any, spacecraft: SpacecraftAdapter) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
    }

    handleInput(key: string): void {
        const keyLower = key.toLowerCase();
        const electricalState = this.spacecraft.getElectricalState();
        const thermalData = this.spacecraft.getThermalTelemetry();
        const coolantData = this.spacecraft.getCoolantTelemetry();

        switch (keyLower) {
            case 'r':
                this.spacecraft.startReactor();
                console.log('Starting reactor...');
                break;
            case 't':
                this.spacecraft.scramReactor();
                console.log('Reactor SCRAM!');
                break;
            case 'i':
                const currentPower = electricalState.reactor.powerOutput;
                this.spacecraft.setReactorThrottle(Math.min(100, currentPower + 5));
                console.log(`Reactor throttle increased`);
                break;
            case 'k':
                const currentPower2 = electricalState.reactor.powerOutput;
                this.spacecraft.setReactorThrottle(Math.max(0, currentPower2 - 5));
                console.log(`Reactor throttle decreased`);
                break;
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9': case '0':
                const num = key === '0' ? 9 : parseInt(key) - 1;
                this.spacecraft.toggleBreaker(num, !electricalState.circuitBreakers[num]);
                console.log(`Breaker ${num + 1} toggled`);
                break;
            case 'g':
                // Toggle radiators
                if (thermalData.radiatorsDeployed) {
                    this.spacecraft.toggleRadiators(false);
                    console.log('Radiators retracting...');
                } else {
                    this.spacecraft.toggleRadiators(true);
                    console.log('Radiators deploying...');
                }
                break;
            case 'p':
                // Toggle primary coolant pump
                const primaryLoop = coolantData.loops[0];
                this.spacecraft.toggleCoolantPump(0, !primaryLoop.pumpActive);
                console.log(`Primary coolant pump: ${!primaryLoop.pumpActive ? 'ON' : 'OFF'}`);
                break;
            case 'c':
                // Toggle secondary coolant pump
                const secondaryLoop = coolantData.loops[1];
                this.spacecraft.toggleCoolantPump(1, !secondaryLoop.pumpActive);
                console.log(`Secondary coolant pump: ${!secondaryLoop.pumpActive ? 'ON' : 'OFF'}`);
                break;
            case 'x':
                // Toggle coolant cross-connect
                const xconnectStatus = this.spacecraft.getCoolantCrossConnectStatus();
                if (xconnectStatus) {
                    this.spacecraft.closeCoolantCrossConnect();
                    console.log('Coolant cross-connect: CLOSED');
                } else {
                    this.spacecraft.openCoolantCrossConnect();
                    console.log('Coolant cross-connect: OPEN');
                }
                break;
        }
    }

    render(): void {
        const ctx = this.ctx;
        const electricalState = this.spacecraft.getElectricalState();
        const thermalState = this.spacecraft.getThermalState();
        const thermalData = this.spacecraft.getThermalTelemetry();
        const coolantData = this.spacecraft.getCoolantTelemetry();

        ctx.font = 'bold 20px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText('ENGINEERING', 40, 40);

        ctx.font = '14px "Courier New"';
        ctx.fillStyle = this.palette.primary;

        // Reactor section
        let y = 80;
        ctx.fillText('REACTOR', 40, y);
        y += 25;
        const reactorStatus = electricalState.reactor.status;
        ctx.fillStyle = reactorStatus === 'online' ? this.palette.primary : this.palette.danger;
        ctx.fillText(`Status: ${reactorStatus.toUpperCase()}`, 60, y);
        y += 25;
        ctx.fillStyle = this.palette.secondary;
        const reactorPower = (electricalState.reactor.powerOutput / 10) * 100; // Normalize to percentage
        ctx.fillText(`Power: ${reactorPower.toFixed(0)}%  (I/K)`, 60, y);

        // Power Distribution
        y += 50;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('POWER DISTRIBUTION', 40, y);
        y += 25;
        ctx.fillStyle = this.palette.secondary;
        const battery = electricalState.battery.chargePercent;
        ctx.fillText(`Battery: ${battery.toFixed(0)}%`, 60, y);
        y += 25;
        ctx.fillText('BREAKERS: 1-0 to toggle', 60, y);
        y += 25;
        for (let i = 0; i < 10; i++) {
            const breakerState = electricalState.circuitBreakers[i] || false;
            const status = breakerState ? 'ON ' : 'OFF';
            const color = breakerState ? this.palette.primary : this.palette.muted;
            ctx.fillStyle = color;
            ctx.fillText(`[${i + 1}] ${status}`, 60 + (i % 5) * 120, y + Math.floor(i / 5) * 25);
        }

        // Thermal Management
        y += 80;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('THERMAL MANAGEMENT', 40, y);
        y += 25;
        ctx.fillStyle = this.palette.secondary;
        const reactorTemp = thermalState.nodes?.reactor?.temperature || 293;
        ctx.fillText(`Reactor Temp: ${reactorTemp.toFixed(0)}K`, 60, y);
        y += 25;

        // Radiators
        const radColor = thermalData.radiatorsDeployed ? this.palette.primary : this.palette.muted;
        ctx.fillStyle = radColor;
        const radStatus = thermalData.radiatorsDeployed ? 'DEPLOYED' : 'RETRACTED';
        ctx.fillText(`Radiators: ${radStatus}  (G)`, 60, y);
        y += 20;
        if (thermalData.radiatorsDeployed) {
            ctx.fillStyle = this.palette.secondary;
            const radHealth = (thermalData.radiatorHealth * 100).toFixed(0);
            ctx.fillText(`Rad Health: ${radHealth}%`, 80, y);
        }

        // Coolant Loops
        y += 40;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('COOLANT LOOPS', 40, y);
        y += 25;

        coolantData.loops.forEach((loop: any, index: number) => {
            const pumpColor = loop.pumpActive ? this.palette.primary : this.palette.muted;
            const pumpStatus = loop.pumpActive ? 'ON' : 'OFF';
            ctx.fillStyle = pumpColor;

            const key = index === 0 ? 'P' : 'C';
            ctx.fillText(`${loop.name}: ${pumpStatus}  (${key})`, 60, y);
            y += 20;

            if (loop.pumpActive) {
                ctx.fillStyle = this.palette.secondary;
                ctx.fillText(`  Temp: ${loop.temperature.toFixed(0)}K`, 80, y);
                ctx.fillText(`  Flow: ${loop.flowRate.toFixed(1)}L/min`, 280, y);
                y += 20;

                // Warnings
                if (loop.frozen) {
                    ctx.fillStyle = this.palette.danger;
                    ctx.fillText(`  ⚠ FROZEN`, 80, y);
                    y += 20;
                } else if (loop.boiling) {
                    ctx.fillStyle = this.palette.danger;
                    ctx.fillText(`  ⚠ BOILING`, 80, y);
                    y += 20;
                }
                if (loop.leakRate > 0) {
                    ctx.fillStyle = this.palette.warning;
                    ctx.fillText(`  ⚠ LEAK: ${loop.leakRate.toFixed(2)}L/min`, 80, y);
                    y += 20;
                }
            } else {
                y += 0;
            }
        });

        // Cross-connect status
        y += 10;
        const xconnectStatus = this.spacecraft.getCoolantCrossConnectStatus();
        const xconnectColor = xconnectStatus ? this.palette.primary : this.palette.muted;
        ctx.fillStyle = xconnectColor;
        ctx.fillText(`Cross-Connect: ${xconnectStatus ? 'OPEN' : 'CLOSED'}  (X)`, 60, y);

        // Keyboard hints
        const hintsY = ctx.canvas.height - 30;
        ctx.fillStyle = this.palette.muted;
        ctx.font = '12px "Courier New"';
        ctx.fillText('R=Reactor T=SCRAM I/K=Throttle 1-0=Breakers G=Radiators P=Pump1 C=Pump2 X=XConnect', 40, hintsY);
    }
}
