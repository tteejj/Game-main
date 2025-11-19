/**
 * TradingPanel - Simple commodity trading UI
 * Shows available commodities at nearest station with buy/sell prices
 */

export class TradingPanel {
    private x: number;
    private y: number;
    private width: number;
    private height: number;
    private ctx: CanvasRenderingContext2D;
    private starSystem: any;
    private visible: boolean = false;
    private selectedIndex: number = 0;

    // Available commodities
    private commodities = [
        { id: 'FOOD', name: 'Food', basePrice: 100 },
        { id: 'WATER', name: 'Water', basePrice: 50 },
        { id: 'FUEL', name: 'Fuel', basePrice: 200 },
        { id: 'ELECTRONICS', name: 'Electronics', basePrice: 500 },
        { id: 'WEAPONS', name: 'Weapons', basePrice: 1000 },
        { id: 'MEDICINE', name: 'Medicine', basePrice: 300 }
    ];

    constructor(
        x: number,
        y: number,
        width: number,
        height: number,
        starSystem: any
    ) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.starSystem = starSystem;

        const canvas = document.querySelector('canvas');
        if (!canvas) throw new Error('Canvas not found');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;
    }

    public toggle(): void {
        this.visible = !this.visible;
    }

    public isVisible(): boolean {
        return this.visible;
    }

    public selectNext(): void {
        this.selectedIndex = (this.selectedIndex + 1) % this.commodities.length;
    }

    public selectPrevious(): void {
        this.selectedIndex = (this.selectedIndex - 1 + this.commodities.length) % this.commodities.length;
    }

    public buySelected(quantity: number = 100): void {
        const commodity = this.commodities[this.selectedIndex];
        const game = (window as any).game;

        if (game && game.buyCommodity) {
            game.buyCommodity(commodity.id, quantity);
        }
    }

    public sellSelected(quantity: number = 100): void {
        const commodity = this.commodities[this.selectedIndex];
        const game = (window as any).game;

        if (game && game.sellCommodity) {
            game.sellCommodity(commodity.id, quantity);
        }
    }

    private getNearestStationFaction(): string {
        // TODO: Actually find nearest station
        const factions = ['UNITED_EARTH', 'MARS_FEDERATION', 'BELT_ALLIANCE', 'OUTER_COLONIES', 'INDEPENDENT'];
        return factions[Math.floor(Math.random() * factions.length)];
    }

    private getMarketPrice(commodityId: string): number {
        const commodity = this.commodities.find(c => c.id === commodityId);
        if (!commodity) return 100;

        // Use economic system to calculate price
        if (this.starSystem && this.starSystem.economicNeeds) {
            const nearestStation = 'station_1'; // TODO: Get actual nearest station
            return this.starSystem.economicNeeds.calculateMarketPrice(
                commodityId,
                nearestStation,
                commodity.basePrice
            );
        }

        return commodity.basePrice;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.visible) return;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Title
        ctx.font = 'bold 24px "Courier New"';
        ctx.fillStyle = '#00ffff';
        ctx.fillText('COMMODITY TRADING', this.x + 20, this.y + 40);

        ctx.font = '14px "Courier New"';
        ctx.fillStyle = '#888888';
        ctx.fillText('Press T to toggle | ↑↓ Select | B Buy | S Sell', this.x + 20, this.y + 70);

        // Player status
        const game = (window as any).game;
        if (game) {
            ctx.font = 'bold 16px "Courier New"';
            ctx.fillStyle = '#00ff00';
            const credits = game.playerCredits || 0;
            ctx.fillText(`Credits: ${credits.toFixed(0)}`, this.x + 20, this.y + 100);

            // Cargo capacity
            const cargo = game.playerCargo || new Map();
            const maxCargo = game.maxCargoCapacity || 1000;
            const currentCargo = Array.from(cargo.values()).reduce((sum: number, qty: number) => sum + qty, 0);
            ctx.fillText(`Cargo: ${currentCargo}/${maxCargo}`, this.x + 280, this.y + 100);
        }

        // Commodity list
        let yPos = this.y + 130;

        ctx.font = 'bold 16px "Courier New"';
        ctx.fillStyle = '#00ff00';
        ctx.fillText('COMMODITY', this.x + 30, yPos);
        ctx.fillText('HELD', this.x + 200, yPos);
        ctx.fillText('BUY', this.x + 280, yPos);
        ctx.fillText('SELL', this.x + 390, yPos);

        yPos += 30;

        const game2 = (window as any).game;
        const playerCargo = game2?.playerCargo || new Map();

        for (let i = 0; i < this.commodities.length; i++) {
            const commodity = this.commodities[i];
            const isSelected = i === this.selectedIndex;

            // Highlight selection
            if (isSelected) {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
                ctx.fillRect(this.x + 15, yPos - 20, this.width - 30, 30);
            }

            ctx.font = '16px "Courier New"';
            ctx.fillStyle = isSelected ? '#00ffff' : '#ffffff';

            // Commodity name
            ctx.fillText(commodity.name, this.x + 30, yPos);

            // Held quantity
            const held = playerCargo.get(commodity.id) || 0;
            ctx.fillStyle = isSelected ? '#ffff00' : '#ffaa00';
            ctx.fillText(held.toString(), this.x + 200, yPos);

            // Buy price (market price)
            const buyPrice = this.getMarketPrice(commodity.id);
            ctx.fillStyle = isSelected ? '#00ff00' : '#00ff00';
            ctx.fillText(buyPrice.toFixed(0), this.x + 280, yPos);

            // Sell price (80% of buy)
            const sellPrice = buyPrice * 0.8;
            ctx.fillStyle = isSelected ? '#ff6600' : '#ff6600';
            ctx.fillText(sellPrice.toFixed(0), this.x + 390, yPos);

            yPos += 35;
        }

        // Instructions
        yPos = this.y + this.height - 80;
        ctx.font = '14px "Courier New"';
        ctx.fillStyle = '#888888';
        ctx.fillText('B: Buy 100 units of selected commodity', this.x + 30, yPos);
        ctx.fillText('S: Sell 100 units of selected commodity', this.x + 30, yPos + 25);
        ctx.fillText('T: Close trading panel', this.x + 30, yPos + 50);
    }
}
