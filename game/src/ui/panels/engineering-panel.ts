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

        // DAMAGE VISUALIZATION SECTION
        y += 40;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('DAMAGE CONTROL', 450, 80);
        let damageY = 105;

        // Hull Integrity (overall)
        const hullIntegrity = this.getHullIntegrity();
        const hullColor = hullIntegrity > 80 ? this.palette.primary :
                         hullIntegrity > 50 ? this.palette.warning :
                         hullIntegrity > 20 ? this.palette.danger :
                         this.palette.danger;
        ctx.fillStyle = hullColor;
        ctx.fillText(`Hull Integrity: ${hullIntegrity.toFixed(0)}%`, 470, damageY);
        damageY += 18;

        // Hull integrity bar
        const barWidth = 200;
        const barHeight = 10;
        const barX = 470;
        const barY = damageY;
        ctx.strokeStyle = this.palette.muted;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = hullColor;
        ctx.fillRect(barX, barY, barWidth * (hullIntegrity / 100), barHeight);
        damageY += 25;

        // Compartment Status
        ctx.fillStyle = this.palette.secondary;
        ctx.font = '12px "Courier New"';
        ctx.fillText('Compartments:', 470, damageY);
        ctx.font = '14px "Courier New"';
        damageY += 20;

        const compartments = this.getCompartmentStatus();
        compartments.forEach((comp: any, index: number) => {
            const compIntegrity = comp.integrity * 100;
            const compColor = compIntegrity > 80 ? this.palette.primary :
                             compIntegrity > 50 ? this.palette.warning :
                             this.palette.danger;

            ctx.fillStyle = compColor;
            ctx.font = '11px "Courier New"';
            const status = comp.breached ? '⚠ BREACH' : comp.onFire ? '🔥 FIRE' : 'OK';
            ctx.fillText(`${comp.name}: ${compIntegrity.toFixed(0)}% ${status}`, 490, damageY);
            damageY += 16;
        });

        ctx.font = '14px "Courier New"';
        damageY += 10;

        // System Status
        ctx.fillStyle = this.palette.secondary;
        ctx.font = '12px "Courier New"';
        ctx.fillText('Critical Systems:', 470, damageY);
        ctx.font = '14px "Courier New"';
        damageY += 20;

        const systems = this.getCriticalSystems();
        systems.forEach((system: any) => {
            const sysColor = system.operational ? this.palette.primary :
                            system.health > 50 ? this.palette.warning :
                            this.palette.danger;

            ctx.fillStyle = sysColor;
            ctx.font = '11px "Courier New"';
            const status = system.operational ? 'OK' : system.repairing ? 'REPAIR' : 'DOWN';
            ctx.fillText(`${system.name}: ${system.health.toFixed(0)}% [${status}]`, 490, damageY);
            damageY += 16;
        });

        ctx.font = '14px "Courier New"';
        damageY += 10;

        // Repair Progress (if any)
        const repairs = this.getActiveRepairs();
        if (repairs.length > 0) {
            ctx.fillStyle = this.palette.info;
            ctx.font = '12px "Courier New"';
            ctx.fillText('Active Repairs:', 470, damageY);
            ctx.font = '14px "Courier New"';
            damageY += 20;

            repairs.forEach((repair: any) => {
                ctx.fillStyle = this.palette.secondary;
                ctx.font = '11px "Courier New"';
                const progress = (repair.progress * 100).toFixed(0);
                ctx.fillText(`${repair.component}: ${progress}%`, 490, damageY);

                // Progress bar
                const repairBarWidth = 100;
                const repairBarHeight = 6;
                const repairBarX = 620;
                const repairBarY = damageY - 8;
                ctx.strokeStyle = this.palette.muted;
                ctx.strokeRect(repairBarX, repairBarY, repairBarWidth, repairBarHeight);
                ctx.fillStyle = this.palette.info;
                ctx.fillRect(repairBarX, repairBarY, repairBarWidth * repair.progress, repairBarHeight);

                damageY += 16;
            });
        }

        // Keyboard hints
        const hintsY = ctx.canvas.height - 30;
        ctx.fillStyle = this.palette.muted;
        ctx.font = '12px "Courier New"';
        ctx.fillText('R=Reactor T=SCRAM I/K=Throttle 1-0=Breakers G=Radiators P=Pump1 C=Pump2 X=XConnect', 40, hintsY);
    }

    /**
     * Get hull integrity percentage (mock data for now - would come from ship state)
     */
    private getHullIntegrity(): number {
        // TODO: Get actual hull integrity from spacecraft state
        // For now, return a simulated value based on various damage factors
        const thermal = this.spacecraft.getThermalState();
        const electrical = this.spacecraft.getElectricalState();

        // Base integrity
        let integrity = 100;

        // Reduce integrity if reactor is damaged or offline
        if (electrical.reactor.status !== 'online') {
            integrity -= 5;
        }

        // Reduce integrity if thermal damage
        if (thermal.nodes?.reactor?.temperature > 800) {
            integrity -= Math.min(20, (thermal.nodes.reactor.temperature - 800) / 10);
        }

        return Math.max(0, Math.min(100, integrity));
    }

    /**
     * Get compartment status (mock data)
     */
    private getCompartmentStatus(): any[] {
        const lifeSupport = this.spacecraft.getLifeSupportTelemetry();

        return [
            {
                name: 'Bridge',
                integrity: lifeSupport.pressure > 90 ? 1.0 : lifeSupport.pressure / 100,
                breached: lifeSupport.pressure < 50,
                onFire: false
            },
            {
                name: 'Engineering',
                integrity: 0.95,
                breached: false,
                onFire: false
            },
            {
                name: 'Cargo',
                integrity: 1.0,
                breached: false,
                onFire: false
            }
        ];
    }

    /**
     * Get critical systems status (mock data)
     */
    private getCriticalSystems(): any[] {
        const electrical = this.spacecraft.getElectricalState();
        const mainEngine = this.spacecraft.getMainEngineState();

        return [
            {
                name: 'Reactor',
                health: electrical.reactor.status === 'online' ? 100 : 50,
                operational: electrical.reactor.status === 'online',
                repairing: false
            },
            {
                name: 'Main Engine',
                health: mainEngine.status === 'running' || mainEngine.status === 'ready' ? 100 : 80,
                operational: mainEngine.status !== 'damaged',
                repairing: false
            },
            {
                name: 'Life Support',
                health: 100,
                operational: true,
                repairing: false
            },
            {
                name: 'Sensors',
                health: 100,
                operational: true,
                repairing: false
            }
        ];
    }

    /**
     * Get active repairs (mock data)
     */
    private getActiveRepairs(): any[] {
        // TODO: Get actual repair data from spacecraft state
        // For now, return empty array (no active repairs)
        return [];
    }
}
