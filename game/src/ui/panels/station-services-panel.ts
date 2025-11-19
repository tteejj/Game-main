/**
 * STATION SERVICES Panel (Station 7)
 * Docking, Refueling, Repairs, Trading
 * Integrates PlayerShipIntegration station services
 */

import { SpacecraftAdapter } from '../../spacecraft-adapter';
import { PlayerShipIntegration } from '../../../../universe-system/src/PlayerShipIntegration';

export class StationServicesPanel {
    private ctx: CanvasRenderingContext2D;
    private palette: any;
    private spacecraft: SpacecraftAdapter;
    private playerIntegration: PlayerShipIntegration;

    // UI State
    private currentTab: 'dock' | 'fuel' | 'repair' | 'trade' = 'dock';
    private selectedIndex: number = 0;
    private tradeMode: 'buy' | 'sell' = 'buy';
    private selectedCommodity: string = '';
    private tradeQuantity: number = 1;

    constructor(ctx: CanvasRenderingContext2D, palette: any, spacecraft: SpacecraftAdapter, playerIntegration: PlayerShipIntegration) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
        this.playerIntegration = playerIntegration;
    }

    handleInput(key: string): void {
        const keyLower = key.toLowerCase();

        // Tab switching: 1=Dock, 2=Fuel, 3=Repair, 4=Trade
        switch (keyLower) {
            case '1':
                this.currentTab = 'dock';
                this.selectedIndex = 0;
                console.log('Station Services: DOCKING');
                break;
            case '2':
                this.currentTab = 'fuel';
                this.selectedIndex = 0;
                console.log('Station Services: REFUELING');
                break;
            case '3':
                this.currentTab = 'repair';
                this.selectedIndex = 0;
                console.log('Station Services: REPAIRS');
                break;
            case '4':
                this.currentTab = 'trade';
                this.selectedIndex = 0;
                console.log('Station Services: TRADING');
                break;

            // Navigation
            case 'w':
            case 'arrowup':
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                break;
            case 's':
            case 'arrowdown':
                this.selectedIndex++;
                break;
            case 'a':
            case 'arrowleft':
                if (this.currentTab === 'trade') {
                    this.tradeQuantity = Math.max(1, this.tradeQuantity - 1);
                }
                break;
            case 'd':
            case 'arrowright':
                if (this.currentTab === 'trade') {
                    this.tradeQuantity += 1;
                }
                break;

            // Actions
            case 'enter':
            case 'e':
                this.executeAction();
                break;
            case 'q':
                if (this.currentTab === 'trade') {
                    this.tradeMode = this.tradeMode === 'buy' ? 'sell' : 'buy';
                }
                break;
        }
    }

    private executeAction(): void {
        const state = this.playerIntegration.getState();

        switch (this.currentTab) {
            case 'dock':
                if (state.isDocked) {
                    const result = this.playerIntegration.undock();
                    console.log(`📡 ${result.message}`);
                } else {
                    this.playerIntegration.requestDocking().then(result => {
                        console.log(`📡 ${result.message}`);
                    });
                }
                break;

            case 'fuel':
                if (state.isDocked) {
                    // Refuel main tank
                    const fuelNeeded = this.spacecraft.spacecraft.fuelSystem.getTotalCapacity() -
                                      this.spacecraft.spacecraft.fuelSystem.getTotalFuel();
                    const result = this.playerIntegration.refuel('main', fuelNeeded);
                    console.log(`⛽ ${result.message}`);
                } else {
                    console.log('❌ Must be docked to refuel');
                }
                break;

            case 'repair':
                if (state.isDocked) {
                    if (this.selectedIndex === 0) {
                        // Repair hull
                        const result = this.playerIntegration.repair('HULL');
                        console.log(`🔧 ${result.message}`);
                    }
                } else {
                    console.log('❌ Must be docked to repair');
                }
                break;

            case 'trade':
                if (state.isDocked) {
                    const commodities = ['Food', 'Water', 'Ore', 'Electronics', 'Medicine', 'Weapons'];
                    if (this.selectedIndex < commodities.length) {
                        const commodity = commodities[this.selectedIndex];
                        if (this.tradeMode === 'buy') {
                            const result = this.playerIntegration.buyCargo(commodity, this.tradeQuantity);
                            console.log(`💰 ${result.message}`);
                        } else {
                            const result = this.playerIntegration.sellCargo(commodity, this.tradeQuantity);
                            console.log(`💰 ${result.message}`);
                        }
                    }
                } else {
                    console.log('❌ Must be docked to trade');
                }
                break;
        }
    }

    render(): void {
        const ctx = this.ctx;

        // Title
        ctx.font = 'bold 20px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText('STATION SERVICES', 40, 40);

        // Tab bar
        this.renderTabBar();

        // Content based on current tab
        switch (this.currentTab) {
            case 'dock':
                this.renderDocking();
                break;
            case 'fuel':
                this.renderRefueling();
                break;
            case 'repair':
                this.renderRepairs();
                break;
            case 'trade':
                this.renderTrading();
                break;
        }

        // Controls hint
        ctx.font = '12px "Courier New"';
        ctx.fillStyle = this.palette.muted;
        let controlsText = '[1-4] Tabs | [W/S] Navigate | [ENTER] Execute';
        if (this.currentTab === 'trade') {
            controlsText = '[1-4] Tabs | [Q] Buy/Sell | [W/S] Select | [A/D] Quantity | [ENTER] Trade';
        }
        ctx.fillText(controlsText, 40, 700);
    }

    private renderTabBar(): void {
        const ctx = this.ctx;
        const tabs = ['DOCKING', 'FUEL', 'REPAIR', 'TRADE'];
        const tabKeys = ['dock', 'fuel', 'repair', 'trade'];

        let x = 40;
        ctx.font = '14px "Courier New"';

        tabs.forEach((tab, i) => {
            const isActive = this.currentTab === tabKeys[i];
            ctx.fillStyle = isActive ? this.palette.info : this.palette.muted;
            ctx.fillText(`[${i+1}] ${tab}`, x, 80);
            x += 150;
        });
    }

    private renderDocking(): void {
        const ctx = this.ctx;
        const state = this.playerIntegration.getState();

        this.drawBox(40, 100, 1180, 560, 'DOCKING CONTROL');

        ctx.font = '16px "Courier New"';
        let y = 140;

        if (state.isDocked && state.dockedAt) {
            // Docked status
            ctx.fillStyle = this.palette.info;
            ctx.fillText(`✓ DOCKED AT: ${state.dockedAt.name}`, 60, y);
            y += 40;

            ctx.font = '14px "Courier New"';
            ctx.fillStyle = this.palette.primary;
            ctx.fillText(`Station Type: ${state.dockedAt.type}`, 80, y);
            y += 25;
            ctx.fillText(`Faction: ${state.dockedAt.faction}`, 80, y);
            y += 25;
            ctx.fillText(`Services Available: Refuel, Repair, Trade, Missions`, 80, y);
            y += 50;

            ctx.fillStyle = this.palette.warning;
            ctx.font = '16px "Courier New"';
            ctx.fillText('Press [ENTER] to UNDOCK', 60, y);

        } else if (state.nearestStation) {
            // Station in range
            ctx.fillStyle = this.palette.primary;
            ctx.fillText(`Nearest Station: ${state.nearestStation.name}`, 60, y);
            y += 30;

            ctx.font = '14px "Courier New"';
            ctx.fillText(`Distance: ${(state.distanceToStation / 1000).toFixed(1)} km`, 80, y);
            y += 25;
            ctx.fillText(`Type: ${state.nearestStation.type}`, 80, y);
            y += 25;
            ctx.fillText(`Faction: ${state.nearestStation.faction}`, 80, y);
            y += 50;

            if (state.distanceToStation <= 1000) {
                ctx.fillStyle = this.palette.info;
                ctx.font = '16px "Courier New"';
                ctx.fillText('Press [ENTER] to REQUEST DOCKING', 60, y);
            } else {
                ctx.fillStyle = this.palette.danger;
                ctx.font = '14px "Courier New"';
                ctx.fillText(`⚠ Station too far for docking (max 1.0 km)`, 60, y);
                y += 30;
                ctx.fillStyle = this.palette.muted;
                ctx.fillText(`Navigate closer to request docking`, 60, y);
            }
        } else {
            // No station in range
            ctx.fillStyle = this.palette.muted;
            ctx.fillText('No station in range', 60, y);
            y += 40;
            ctx.font = '14px "Courier New"';
            ctx.fillText('Use Navigation (F3) to locate stations in this system', 60, y);
        }
    }

    private renderRefueling(): void {
        const ctx = this.ctx;
        const state = this.playerIntegration.getState();

        this.drawBox(40, 100, 1180, 560, 'REFUELING SERVICES');

        ctx.font = '14px "Courier New"';
        let y = 140;

        if (!state.isDocked) {
            ctx.fillStyle = this.palette.danger;
            ctx.fillText('⚠ Must be docked at a station to refuel', 60, y);
            return;
        }

        // Fuel status
        const totalFuel = this.spacecraft.spacecraft.fuelSystem.getTotalFuel();
        const totalCapacity = this.spacecraft.spacecraft.fuelSystem.getTotalCapacity();
        const fuelPct = (totalFuel / totalCapacity) * 100;

        ctx.fillStyle = this.palette.primary;
        ctx.fillText(`Current Fuel: ${totalFuel.toFixed(0)} / ${totalCapacity.toFixed(0)} kg (${fuelPct.toFixed(1)}%)`, 60, y);
        y += 30;

        // Fuel bar
        ctx.strokeStyle = this.palette.primary;
        ctx.strokeRect(60, y, 800, 30);
        ctx.fillStyle = fuelPct > 20 ? this.palette.info : this.palette.danger;
        ctx.fillRect(60, y, 800 * (fuelPct / 100), 30);
        y += 50;

        // Refuel option
        const fuelNeeded = totalCapacity - totalFuel;
        const fuelCost = Math.floor(fuelNeeded * 2); // 2 credits per kg

        if (fuelNeeded > 0) {
            ctx.fillStyle = this.palette.info;
            ctx.font = '16px "Courier New"';
            ctx.fillText(`Press [ENTER] to REFUEL`, 60, y);
            y += 30;

            ctx.font = '14px "Courier New"';
            ctx.fillStyle = this.palette.warning;
            ctx.fillText(`Fuel needed: ${fuelNeeded.toFixed(0)} kg`, 80, y);
            y += 25;
            ctx.fillText(`Cost: ${fuelCost} CR`, 80, y);
            y += 25;
            ctx.fillStyle = state.credits >= fuelCost ? this.palette.primary : this.palette.danger;
            ctx.fillText(`Your credits: ${state.credits.toFixed(0)} CR`, 80, y);
        } else {
            ctx.fillStyle = this.palette.info;
            ctx.fillText('✓ Fuel tanks full', 60, y);
        }
    }

    private renderRepairs(): void {
        const ctx = this.ctx;
        const state = this.playerIntegration.getState();

        this.drawBox(40, 100, 1180, 560, 'REPAIR SERVICES');

        ctx.font = '14px "Courier New"';
        let y = 140;

        if (!state.isDocked) {
            ctx.fillStyle = this.palette.danger;
            ctx.fillText('⚠ Must be docked at a station to repair', 60, y);
            return;
        }

        // Hull integrity
        const hullPct = this.spacecraft.spacecraft.hull * 100;
        const hullDamage = 100 - hullPct;
        const repairCost = Math.floor(hullDamage * 50); // 50 credits per %

        ctx.fillStyle = this.palette.primary;
        ctx.fillText(`Hull Integrity: ${hullPct.toFixed(1)}%`, 60, y);
        y += 30;

        // Hull bar
        ctx.strokeStyle = this.palette.primary;
        ctx.strokeRect(60, y, 800, 30);
        ctx.fillStyle = hullPct > 50 ? this.palette.info : this.palette.danger;
        ctx.fillRect(60, y, 800 * (hullPct / 100), 30);
        y += 50;

        // Repair options
        if (hullDamage > 0) {
            const isSelected = this.selectedIndex === 0;
            ctx.fillStyle = isSelected ? this.palette.info : this.palette.primary;

            if (isSelected) ctx.fillText('>', 50, y);
            ctx.font = '16px "Courier New"';
            ctx.fillText(`Repair Hull (${hullDamage.toFixed(1)}% damage)`, 70, y);
            y += 30;

            ctx.font = '14px "Courier New"';
            ctx.fillStyle = this.palette.warning;
            ctx.fillText(`Cost: ${repairCost} CR`, 90, y);
            y += 25;
            ctx.fillStyle = state.credits >= repairCost ? this.palette.primary : this.palette.danger;
            ctx.fillText(`Your credits: ${state.credits.toFixed(0)} CR`, 90, y);
            y += 40;

            if (isSelected) {
                ctx.fillStyle = this.palette.info;
                ctx.fillText('Press [ENTER] to repair', 70, y);
            }
        } else {
            ctx.fillStyle = this.palette.info;
            ctx.fillText('✓ Hull at 100% integrity', 60, y);
        }
    }

    private renderTrading(): void {
        const ctx = this.ctx;
        const state = this.playerIntegration.getState();

        this.drawBox(40, 100, 1180, 560, `TRADING - [${this.tradeMode.toUpperCase()}]`);

        ctx.font = '14px "Courier New"';
        let y = 120;

        if (!state.isDocked) {
            ctx.fillStyle = this.palette.danger;
            ctx.fillText('⚠ Must be docked at a station to trade', 60, y);
            return;
        }

        // Trade mode indicator
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText(`[Q] Mode: ${this.tradeMode === 'buy' ? 'BUYING' : 'SELLING'}`, 600, 95);

        // Cargo status
        ctx.font = '12px "Courier New"';
        ctx.fillStyle = this.palette.warning;
        y = 140;
        ctx.fillText(`Cargo: ${state.cargoUsed}/${state.cargoCapacity} | Credits: ${state.credits.toFixed(0)} CR`, 60, y);
        y += 40;

        // Commodities
        const commodities = ['Food', 'Water', 'Ore', 'Electronics', 'Medicine', 'Weapons'];
        const basePrices = [10, 5, 20, 50, 100, 200];

        ctx.font = '14px "Courier New"';

        commodities.forEach((commodity, i) => {
            const isSelected = i === this.selectedIndex;
            const basePrice = basePrices[i];
            const buyPrice = Math.floor(basePrice * (1.2 + Math.random() * 0.3));
            const sellPrice = Math.floor(basePrice * (0.8 + Math.random() * 0.2));
            const price = this.tradeMode === 'buy' ? buyPrice : sellPrice;
            const owned = state.cargo.get(commodity) || 0;

            ctx.fillStyle = isSelected ? this.palette.info : this.palette.primary;

            if (isSelected) ctx.fillText('>', 50, y);
            ctx.fillText(`${commodity}`, 70, y);

            ctx.font = '12px "Courier New"';
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(`Price: ${price} CR/unit | Owned: ${owned}`, 300, y);

            if (isSelected) {
                ctx.fillStyle = this.palette.info;
                ctx.fillText(`Quantity: ${this.tradeQuantity} [A/D to adjust]`, 600, y);
                const totalCost = price * this.tradeQuantity;
                ctx.fillText(`Total: ${totalCost} CR`, 900, y);

                if (this.tradeMode === 'buy') {
                    if (state.credits < totalCost) {
                        ctx.fillStyle = this.palette.danger;
                        ctx.fillText('Insufficient credits', 1050, y);
                    } else if (state.cargoUsed + this.tradeQuantity > state.cargoCapacity) {
                        ctx.fillStyle = this.palette.danger;
                        ctx.fillText('Insufficient cargo space', 1050, y);
                    }
                } else {
                    if (owned < this.tradeQuantity) {
                        ctx.fillStyle = this.palette.danger;
                        ctx.fillText(`Only have ${owned}`, 1050, y);
                    }
                }
            }

            ctx.font = '14px "Courier New"';
            y += 40;
        });

        // Instructions
        y += 30;
        ctx.font = '12px "Courier New"';
        ctx.fillStyle = this.palette.muted;
        ctx.fillText('[ENTER] Execute trade | [Q] Toggle Buy/Sell | [W/S] Select commodity | [A/D] Adjust quantity', 60, y);
    }

    private drawBox(x: number, y: number, w: number, h: number, title: string): void {
        const ctx = this.ctx;

        ctx.strokeStyle = this.palette.primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        if (title) {
            ctx.fillStyle = this.palette.primary;
            ctx.font = 'bold 14px "Courier New"';
            ctx.fillText(title, x + 10, y - 5);
        }
    }
}
