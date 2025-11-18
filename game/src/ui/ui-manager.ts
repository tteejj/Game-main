/**
 * UI Manager
 * Manages control station panels and rendering
 */

import { SpacecraftAdapter } from '../spacecraft-adapter';
import { HelmPanel } from './panels/helm-panel';
import { EngineeringPanel } from './panels/engineering-panel';
import { NavigationPanel } from './panels/navigation-panel';
import { LifeSupportPanel } from './panels/lifesupport-panel';
import { WeaponsPanel } from './panels/weapons-panel';
import { HUD } from './hud';
import { AlertSystem, AlertDisplay, AlertPriority, AlertCategory } from './alert-system';

export type StationPanel = HelmPanel | EngineeringPanel | NavigationPanel | LifeSupportPanel | WeaponsPanel;

export class UIManager {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private activeStationIndex: number = 0; // Start with Helm (Station 1)
    private stations: StationPanel[];
    private hud: HUD;
    private spacecraft: SpacecraftAdapter;

    // Alert system
    public alertSystem: AlertSystem;
    public alertDisplay: AlertDisplay;

    // Color palette (green monochrome by default)
    palette = {
        background: '#000000',
        primary: '#00ff00',
        secondary: '#00aa00',
        muted: '#006600',
        warning: '#ffff00',
        danger: '#ff0000',
        info: '#00ffff'
    };

    constructor(canvas: HTMLCanvasElement, spacecraft: SpacecraftAdapter) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context');
        }
        this.ctx = ctx;
        this.spacecraft = spacecraft;

        // Initialize alert system
        this.alertSystem = new AlertSystem();
        this.alertDisplay = new AlertDisplay(this.alertSystem, this.palette);

        // Initialize all station panels with spacecraft reference
        this.stations = [
            new HelmPanel(this.ctx, this.palette, spacecraft),           // Station 1
            new EngineeringPanel(this.ctx, this.palette, spacecraft),    // Station 2
            new NavigationPanel(this.ctx, this.palette, spacecraft),     // Station 3
            new LifeSupportPanel(this.ctx, this.palette, spacecraft),    // Station 4
            new WeaponsPanel(this.ctx, this.palette, spacecraft)         // Station 5
        ];

        // Initialize HUD
        this.hud = new HUD(this.ctx, this.palette, spacecraft, canvas);

        // Start rendering
        this.startRenderLoop();
    }

    /**
     * Set the active station
     */
    setActiveStation(stationNum: number): void {
        if (stationNum >= 1 && stationNum <= this.stations.length) {
            this.activeStationIndex = stationNum - 1; // Convert to 0-based index
            console.log(`Switched to Station ${stationNum}: ${this.stations[this.activeStationIndex].constructor.name}`);
        }
    }

    /**
     * Handle input for active station
     */
    handleInput(key: string): void {
        const activeStation = this.stations[this.activeStationIndex];
        if (activeStation && typeof activeStation.handleInput === 'function') {
            activeStation.handleInput(key);
        }
    }

    /**
     * Start the render loop
     */
    private startRenderLoop(): void {
        const render = () => {
            this.render();
            requestAnimationFrame(render);
        };
        render();
    }

    /**
     * Render the active station
     */
    private render(): void {
        // Clear canvas
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update alert system
        this.alertSystem.update();
        this.monitorSpacecraftState();

        // Render active station
        const activeStation = this.stations[this.activeStationIndex];
        if (activeStation) {
            activeStation.render();
        }

        // Render HUD overlay (on top of everything)
        this.hud.render();

        // Render station-specific alerts
        this.renderStationAlerts();

        // Render station indicator
        this.renderStationIndicator();

        // Render critical alerts top bar (rendered last so it appears on top)
        this.alertDisplay.renderTopBar(this.ctx, 0, 0, this.canvas.width);
    }

    /**
     * Render station-specific alerts
     */
    private renderStationAlerts(): void {
        const stationNum = this.activeStationIndex + 1;

        // Render alerts for other stations (bottom right)
        this.alertDisplay.renderStationIndicators(
            this.ctx,
            this.canvas.width - 210,
            this.canvas.height - 200,
            stationNum
        );

        // Render category-specific alerts based on station (top left corner)
        switch (stationNum) {
            case 1: // Helm - Navigation alerts
                this.alertDisplay.renderCornerBlock(
                    this.ctx,
                    10,
                    50,
                    AlertCategory.NAVIGATION,
                    'NAVIGATION ALERTS'
                );
                break;
            case 2: // Engineering - Power, thermal, fuel alerts
                this.alertDisplay.renderCornerBlock(
                    this.ctx,
                    10,
                    50,
                    AlertCategory.POWER,
                    'POWER ALERTS'
                );
                this.alertDisplay.renderCornerBlock(
                    this.ctx,
                    10,
                    180,
                    AlertCategory.THERMAL,
                    'THERMAL ALERTS'
                );
                this.alertDisplay.renderCornerBlock(
                    this.ctx,
                    200,
                    50,
                    AlertCategory.FUEL,
                    'FUEL ALERTS'
                );
                break;
            case 3: // Navigation - Navigation and systems
                this.alertDisplay.renderCornerBlock(
                    this.ctx,
                    10,
                    50,
                    AlertCategory.NAVIGATION,
                    'NAVIGATION'
                );
                this.alertDisplay.renderCornerBlock(
                    this.ctx,
                    10,
                    180,
                    AlertCategory.SYSTEMS,
                    'SYSTEMS'
                );
                break;
            case 4: // Life Support - Life support and hull
                this.alertDisplay.renderCornerBlock(
                    this.ctx,
                    10,
                    50,
                    AlertCategory.LIFE_SUPPORT,
                    'LIFE SUPPORT'
                );
                this.alertDisplay.renderCornerBlock(
                    this.ctx,
                    200,
                    50,
                    AlertCategory.HULL,
                    'HULL INTEGRITY'
                );
                break;
            case 5: // Weapons - Combat alerts
                this.alertDisplay.renderCornerBlock(
                    this.ctx,
                    10,
                    50,
                    AlertCategory.COMBAT,
                    'COMBAT STATUS'
                );
                break;
        }
    }

    /**
     * Render station indicator in top-right corner
     */
    private renderStationIndicator(): void {
        const stationNum = this.activeStationIndex + 1;
        const stationNames = ['HELM', 'ENGINEERING', 'NAVIGATION', 'LIFE SUPPORT', 'WEAPONS'];
        const stationName = stationNames[this.activeStationIndex] || 'UNKNOWN';

        this.ctx.font = '16px "Courier New"';
        this.ctx.fillStyle = this.palette.info;
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`[F${stationNum}] ${stationName}`, this.canvas.width - 20, 30);
        this.ctx.textAlign = 'left'; // Reset
    }

    /**
     * Monitor spacecraft state and generate alerts
     */
    private monitorSpacecraftState(): void {
        const state = this.spacecraft.getState();
        const electrical = this.spacecraft.getElectricalState();
        const fuelState = this.spacecraft.getFuelState();
        const thermal = this.spacecraft.getThermalState();
        const lifeSupport = this.spacecraft.getLifeSupportTelemetry();
        const weaponsState = this.spacecraft.getWeaponsState();

        // Critical: Hull integrity
        if (state.hull && state.hull.integrity < 30) {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.HULL);
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P0_CRITICAL,
                    AlertCategory.HULL,
                    `Hull integrity critical: ${state.hull.integrity.toFixed(0)}%`,
                    { station: 2, persistent: true }
                );
            }
        } else if (state.hull && state.hull.integrity < 60) {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.HULL);
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P2_WARNING,
                    AlertCategory.HULL,
                    `Hull integrity degraded: ${state.hull.integrity.toFixed(0)}%`,
                    { station: 2 }
                );
            }
        }

        // Critical: Power
        const batteryPercent = electrical.battery.chargePercent;
        if (batteryPercent < 10) {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.POWER)
                .filter(a => a.message.includes('Battery critical'));
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P0_CRITICAL,
                    AlertCategory.POWER,
                    `Battery critical: ${batteryPercent.toFixed(0)}%`,
                    { station: 2, persistent: true }
                );
            }
        } else if (batteryPercent < 30) {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.POWER)
                .filter(a => a.message.includes('Low battery'));
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P1_URGENT,
                    AlertCategory.POWER,
                    `Low battery: ${batteryPercent.toFixed(0)}%`,
                    { station: 2 }
                );
            }
        }

        // Reactor offline
        if (electrical.reactor.status === 'offline' || electrical.reactor.status === 'scrammed') {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.POWER)
                .filter(a => a.message.includes('Reactor'));
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P1_URGENT,
                    AlertCategory.POWER,
                    `Reactor ${electrical.reactor.status.toUpperCase()}`,
                    { station: 2, persistent: true }
                );
            }
        }

        // Critical: Fuel
        const totalFuel = fuelState.tanks.reduce((sum: number, tank: any) => sum + tank.currentMass, 0);
        const totalCapacity = fuelState.tanks.reduce((sum: number, tank: any) => sum + tank.capacity, 0);
        const fuelPercent = (totalFuel / totalCapacity) * 100;
        if (fuelPercent < 5) {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.FUEL)
                .filter(a => a.message.includes('Fuel critical'));
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P0_CRITICAL,
                    AlertCategory.FUEL,
                    `Fuel critical: ${fuelPercent.toFixed(0)}%`,
                    { station: 2, persistent: true }
                );
            }
        } else if (fuelPercent < 20) {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.FUEL)
                .filter(a => a.message.includes('Low fuel'));
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P2_WARNING,
                    AlertCategory.FUEL,
                    `Low fuel: ${fuelPercent.toFixed(0)}%`,
                    { station: 2 }
                );
            }
        }

        // Critical: Thermal
        if (thermal.nodes?.reactor?.temperature > 800) {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.THERMAL)
                .filter(a => a.message.includes('Reactor overheat'));
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P0_CRITICAL,
                    AlertCategory.THERMAL,
                    `Reactor overheat: ${thermal.nodes.reactor.temperature.toFixed(0)}K`,
                    { station: 2, persistent: true }
                );
            }
        } else if (thermal.nodes?.reactor?.temperature > 600) {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.THERMAL)
                .filter(a => a.message.includes('Reactor temperature'));
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P2_WARNING,
                    AlertCategory.THERMAL,
                    `Reactor temperature high: ${thermal.nodes.reactor.temperature.toFixed(0)}K`,
                    { station: 2 }
                );
            }
        }

        // Life support
        if (lifeSupport.compartments) {
            lifeSupport.compartments.forEach((comp: any) => {
                if (comp.breached) {
                    const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.LIFE_SUPPORT)
                        .filter(a => a.message.includes(`${comp.name} BREACH`));
                    if (existingAlerts.length === 0) {
                        this.alertSystem.addAlert(
                            AlertPriority.P0_CRITICAL,
                            AlertCategory.LIFE_SUPPORT,
                            `${comp.name} BREACH DETECTED`,
                            { station: 4, persistent: true }
                        );
                    }
                }
                if (comp.onFire) {
                    const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.LIFE_SUPPORT)
                        .filter(a => a.message.includes(`${comp.name} FIRE`));
                    if (existingAlerts.length === 0) {
                        this.alertSystem.addAlert(
                            AlertPriority.P0_CRITICAL,
                            AlertCategory.LIFE_SUPPORT,
                            `${comp.name} FIRE`,
                            { station: 4, persistent: true }
                        );
                    }
                }
                if (comp.pressure < 50) {
                    const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.LIFE_SUPPORT)
                        .filter(a => a.message.includes(`${comp.name} pressure`));
                    if (existingAlerts.length === 0) {
                        this.alertSystem.addAlert(
                            AlertPriority.P1_URGENT,
                            AlertCategory.LIFE_SUPPORT,
                            `${comp.name} pressure low: ${comp.pressure.toFixed(0)} kPa`,
                            { station: 4 }
                        );
                    }
                }
            });
        }

        // Combat alerts
        if (!weaponsState.weaponsSafety) {
            const targets = weaponsState.targets || [];
            if (targets.length > 0 && weaponsState.threatAssessment) {
                if (weaponsState.threatAssessment.criticalThreats > 0) {
                    const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.COMBAT)
                        .filter(a => a.message.includes('CRITICAL THREAT'));
                    if (existingAlerts.length === 0) {
                        this.alertSystem.addAlert(
                            AlertPriority.P0_CRITICAL,
                            AlertCategory.COMBAT,
                            `CRITICAL THREAT DETECTED: ${weaponsState.threatAssessment.criticalThreats} hostile(s)`,
                            { station: 5, persistent: false }
                        );
                    }
                } else if (weaponsState.threatAssessment.totalHostiles > 0) {
                    const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.COMBAT)
                        .filter(a => a.message.includes('hostiles detected'));
                    if (existingAlerts.length === 0) {
                        this.alertSystem.addAlert(
                            AlertPriority.P1_URGENT,
                            AlertCategory.COMBAT,
                            `${weaponsState.threatAssessment.totalHostiles} hostiles detected`,
                            { station: 5, persistent: false }
                        );
                    }
                }
            }
        }

        // Navigation: Collision warning (example - would need actual collision detection)
        const navData = this.spacecraft.getNavigationTelemetry();
        if (navData.altitude < 1000 && navData.verticalSpeed < -20) {
            const existingAlerts = this.alertSystem.getAlertsByCategory(AlertCategory.NAVIGATION)
                .filter(a => a.message.includes('IMPACT'));
            if (existingAlerts.length === 0) {
                this.alertSystem.addAlert(
                    AlertPriority.P0_CRITICAL,
                    AlertCategory.NAVIGATION,
                    `COLLISION IMMINENT - ${navData.altitude.toFixed(0)}m alt, ${Math.abs(navData.verticalSpeed).toFixed(0)}m/s descent`,
                    { station: 3, persistent: false }
                );
            }
        }
    }
}
