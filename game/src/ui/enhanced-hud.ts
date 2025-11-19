/**
 * Enhanced HUD (Heads-Up Display)
 *
 * Advanced overlay showing critical ship status across all screens
 * - Critical warnings and alerts
 * - System health indicators
 * - Combat status
 * - Autopilot status
 * - Performance metrics
 */

import { SpacecraftAdapter } from '../spacecraft-adapter';

export interface HUDConfig {
    showWarnings: boolean;
    showSystemHealth: boolean;
    showCombatStatus: boolean;
    showAutopilot: boolean;
    showPerformance: boolean;
    alertThresholds: {
        hullIntegrity: number;      // % below which to warn
        fuelRemaining: number;        // % below which to warn
        powerReserve: number;         // % below which to warn
        temperature: number;          // K above which to warn
    };
}

export class EnhancedHUD {
    private ctx: CanvasRenderingContext2D;
    private palette: any;
    private spacecraft: SpacecraftAdapter;
    private canvas: HTMLCanvasElement;
    private config: HUDConfig;

    // Alert state
    private alerts: Alert[] = [];
    private lastAlertCheck: number = 0;
    private alertCheckInterval: number = 1000; // Check every second

    // Performance tracking
    private fps: number = 60;
    private frameCount: number = 0;
    private lastFpsUpdate: number = 0;

    constructor(
        ctx: CanvasRenderingContext2D,
        palette: any,
        spacecraft: SpacecraftAdapter,
        canvas: HTMLCanvasElement,
        config?: Partial<HUDConfig>
    ) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
        this.canvas = canvas;

        this.config = {
            showWarnings: true,
            showSystemHealth: true,
            showCombatStatus: true,
            showAutopilot: true,
            showPerformance: true,
            alertThresholds: {
                hullIntegrity: 50,
                fuelRemaining: 20,
                powerReserve: 30,
                temperature: 800
            },
            ...config
        };
    }

    render(): void {
        this.updateAlerts();
        this.updateFPS();

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Top bar - Critical status
        this.renderTopBar();

        // Top right - System health indicators
        if (this.config.showSystemHealth) {
            this.renderSystemHealth(width - 250, 10);
        }

        // Top left - Alerts and warnings
        if (this.config.showWarnings && this.alerts.length > 0) {
            this.renderAlerts(10, 10);
        }

        // Bottom right - Combat status (if weapons armed)
        if (this.config.showCombatStatus) {
            const weaponsState = this.spacecraft.getWeaponsState();
            if (!weaponsState.weaponsSafety) {
                this.renderCombatStatus(width - 200, height - 120);
            }
        }

        // Bottom left - Autopilot status (if active)
        if (this.config.showAutopilot) {
            const autopilotMode = this.spacecraft.getAutopilotMode();
            if (autopilotMode !== 'off') {
                this.renderAutopilotStatus(10, height - 100);
            }
        }

        // Bottom center - Performance metrics (if enabled)
        if (this.config.showPerformance) {
            this.renderPerformanceMetrics(width / 2 - 100, height - 25);
        }
    }

    private renderTopBar(): void {
        const ctx = this.ctx;
        const width = this.canvas.width;

        // Semi-transparent background bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, 30);

        // Critical indicators (centered)
        ctx.font = 'bold 14px "Courier New"';
        ctx.textAlign = 'center';

        const state = this.spacecraft.getState();
        const electrical = this.spacecraft.getElectricalState();
        const fuelState = this.spacecraft.getFuelState();

        let x = width / 2 - 200;

        // Power status
        const batteryPercent = electrical.battery.chargePercent;
        const powerColor = batteryPercent > 50 ? this.palette.primary :
                          batteryPercent > 20 ? this.palette.warning :
                          this.palette.danger;
        ctx.fillStyle = powerColor;
        ctx.fillText(`PWR: ${batteryPercent.toFixed(0)}%`, x, 20);

        // Fuel status
        x += 150;
        const totalFuel = fuelState.tanks.reduce((sum: number, tank: any) => sum + tank.currentMass, 0);
        const totalCapacity = fuelState.tanks.reduce((sum: number, tank: any) => sum + tank.capacity, 0);
        const fuelPercent = (totalFuel / totalCapacity) * 100;
        const fuelColor = fuelPercent > 30 ? this.palette.primary :
                         fuelPercent > 10 ? this.palette.warning :
                         this.palette.danger;
        ctx.fillStyle = fuelColor;
        ctx.fillText(`FUEL: ${fuelPercent.toFixed(0)}%`, x, 20);

        // Reactor status
        x += 150;
        const reactorStatus = electrical.reactor.status;
        const reactorColor = reactorStatus === 'online' ? this.palette.primary :
                            reactorStatus === 'starting' ? this.palette.warning :
                            this.palette.danger;
        ctx.fillStyle = reactorColor;
        ctx.fillText(`REACTOR: ${reactorStatus.toUpperCase()}`, x, 20);

        ctx.textAlign = 'left';
    }

    private renderSystemHealth(x: number, y: number): void {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 230, 120);

        // Title
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText('SYSTEM HEALTH', x + 10, y + 20);

        // System indicators
        ctx.font = '11px "Courier New"';
        let sy = y + 35;

        const systems = this.getSystemHealthData();
        systems.forEach(system => {
            const healthColor = system.health > 80 ? this.palette.primary :
                               system.health > 50 ? this.palette.warning :
                               this.palette.danger;

            ctx.fillStyle = healthColor;
            ctx.fillText(`${system.name}:`, x + 10, sy);

            // Health bar
            const barWidth = 100;
            const barHeight = 8;
            const barX = x + 110;
            const barY = sy - 7;

            ctx.strokeStyle = this.palette.muted;
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = healthColor;
            ctx.fillRect(barX, barY, barWidth * (system.health / 100), barHeight);

            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(`${system.health.toFixed(0)}%`, barX + barWidth + 5, sy);

            sy += 18;
        });
    }

    private renderAlerts(x: number, y: number): void {
        const ctx = this.ctx;

        // Background
        const alertHeight = 25 * this.alerts.length + 10;
        ctx.fillStyle = 'rgba(139, 0, 0, 0.8)'; // Dark red background
        ctx.fillRect(x, y, 400, alertHeight);

        // Alerts
        ctx.font = 'bold 12px "Courier New"';
        let ay = y + 20;

        this.alerts.forEach(alert => {
            const color = alert.severity === 'critical' ? this.palette.danger :
                         alert.severity === 'warning' ? this.palette.warning :
                         this.palette.info;

            ctx.fillStyle = color;
            const prefix = alert.severity === 'critical' ? '⚠ CRITICAL: ' :
                          alert.severity === 'warning' ? '⚠ WARNING: ' :
                          'ℹ INFO: ';
            ctx.fillText(prefix + alert.message, x + 10, ay);
            ay += 25;
        });
    }

    private renderCombatStatus(x: number, y: number): void {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = 'rgba(139, 0, 0, 0.7)'; // Red tint
        ctx.fillRect(x, y, 190, 110);

        // Title
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillStyle = this.palette.danger;
        ctx.fillText('⚔ COMBAT MODE', x + 10, y + 20);

        // Weapon status
        const weaponsState = this.spacecraft.getWeaponsState();
        ctx.font = '11px "Courier New"';
        let cy = y + 40;

        ctx.fillStyle = this.palette.warning;
        ctx.fillText('Weapons: HOT', x + 10, cy);
        cy += 15;

        ctx.fillStyle = this.palette.secondary;
        ctx.fillText(`PD: ${weaponsState.pointDefenseActive ? 'ACTIVE' : 'OFF'}`, x + 10, cy);
        cy += 15;

        const targets = this.spacecraft.getWeaponsTargets();
        ctx.fillText(`Targets: ${targets.length}`, x + 10, cy);
        cy += 15;

        if (weaponsState.threatAssessment) {
            const threat = weaponsState.threatAssessment;
            const threatColor = threat.criticalThreats > 0 ? this.palette.danger :
                               threat.totalHostiles > 0 ? this.palette.warning :
                               this.palette.primary;
            ctx.fillStyle = threatColor;
            ctx.fillText(`Threats: ${threat.totalHostiles}`, x + 10, cy);
        }
    }

    private renderAutopilotStatus(x: number, y: number): void {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = 'rgba(0, 100, 0, 0.7)'; // Green tint
        ctx.fillRect(x, y, 250, 90);

        // Title
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillStyle = this.palette.warning;
        const autopilotMode = this.spacecraft.getAutopilotMode();
        const modeText = autopilotMode.toUpperCase().replace(/_/g, ' ');
        ctx.fillText(`AUTOPILOT: ${modeText}`, x + 10, y + 20);

        // Phase info
        const phases = this.spacecraft.getAutopilotPhases();
        ctx.font = '11px "Courier New"';
        ctx.fillStyle = this.palette.secondary;
        let ay = y + 40;

        if (autopilotMode === 'landing') {
            ctx.fillText(`Phase: ${phases.landing.toUpperCase()}`, x + 10, ay);
            ay += 15;
            const navData = this.spacecraft.getNavigationTelemetry();
            ctx.fillText(`Altitude: ${navData.altitude.toFixed(0)}m`, x + 10, ay);
            ay += 15;
            ctx.fillText(`V/S: ${navData.verticalSpeed.toFixed(1)}m/s`, x + 10, ay);
        } else if (autopilotMode === 'docking') {
            ctx.fillText(`Phase: ${phases.docking.toUpperCase()}`, x + 10, ay);
            ay += 15;
            ctx.fillText('Approach in progress...', x + 10, ay);
        } else if (autopilotMode === 'orbital_insertion') {
            const phaseText = phases.orbitalInsertion.toUpperCase().replace(/_/g, ' ');
            ctx.fillText(`Phase: ${phaseText}`, x + 10, ay);
            ay += 15;
            ctx.fillText('Burn in progress...', x + 10, ay);
        } else {
            ctx.fillText('Active', x + 10, ay);
        }
    }

    private renderPerformanceMetrics(x: number, y: number): void {
        const ctx = this.ctx;

        ctx.font = '11px "Courier New"';
        const fpsColor = this.fps > 50 ? this.palette.primary :
                        this.fps > 30 ? this.palette.warning :
                        this.palette.danger;
        ctx.fillStyle = fpsColor;
        ctx.fillText(`FPS: ${this.fps.toFixed(0)}`, x, y);
    }

    private updateAlerts(): void {
        const now = Date.now();
        if (now - this.lastAlertCheck < this.alertCheckInterval) {
            return;
        }
        this.lastAlertCheck = now;

        this.alerts = [];

        // Check various systems for alert conditions
        const electrical = this.spacecraft.getElectricalState();
        const fuelState = this.spacecraft.getFuelState();
        const thermal = this.spacecraft.getThermalState();

        // Power alerts
        const batteryPercent = electrical.battery.chargePercent;
        if (batteryPercent < this.config.alertThresholds.powerReserve) {
            this.alerts.push({
                severity: batteryPercent < 10 ? 'critical' : 'warning',
                message: `Low battery: ${batteryPercent.toFixed(0)}%`,
                system: 'power'
            });
        }

        // Fuel alerts
        const totalFuel = fuelState.tanks.reduce((sum: number, tank: any) => sum + tank.currentMass, 0);
        const totalCapacity = fuelState.tanks.reduce((sum: number, tank: any) => sum + tank.capacity, 0);
        const fuelPercent = (totalFuel / totalCapacity) * 100;
        if (fuelPercent < this.config.alertThresholds.fuelRemaining) {
            this.alerts.push({
                severity: fuelPercent < 5 ? 'critical' : 'warning',
                message: `Low fuel: ${fuelPercent.toFixed(0)}%`,
                system: 'fuel'
            });
        }

        // Thermal alerts
        if (thermal.nodes?.reactor?.temperature > this.config.alertThresholds.temperature) {
            this.alerts.push({
                severity: 'critical',
                message: `Reactor overheat: ${thermal.nodes.reactor.temperature.toFixed(0)}K`,
                system: 'thermal'
            });
        }

        // Reactor offline
        if (electrical.reactor.status === 'offline' || electrical.reactor.status === 'scrammed') {
            this.alerts.push({
                severity: 'warning',
                message: 'Reactor offline',
                system: 'power'
            });
        }
    }

    private getSystemHealthData(): SystemHealthInfo[] {
        const electrical = this.spacecraft.getElectricalState();
        const mainEngine = this.spacecraft.getMainEngineState();

        return [
            {
                name: 'Reactor',
                health: electrical.reactor.status === 'online' ? 100 : 50
            },
            {
                name: 'Main Engine',
                health: mainEngine.status === 'running' || mainEngine.status === 'ready' ? 100 : 80
            },
            {
                name: 'Life Support',
                health: 100
            },
            {
                name: 'Sensors',
                health: 100
            },
            {
                name: 'Weapons',
                health: 100
            }
        ];
    }

    private updateFPS(): void {
        this.frameCount++;
        const now = performance.now();

        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
    }

    setConfig(config: Partial<HUDConfig>): void {
        this.config = { ...this.config, ...config };
    }

    getConfig(): HUDConfig {
        return { ...this.config };
    }

    clearAlerts(): void {
        this.alerts = [];
    }
}

interface Alert {
    severity: 'critical' | 'warning' | 'info';
    message: string;
    system: string;
}

interface SystemHealthInfo {
    name: string;
    health: number;
}
