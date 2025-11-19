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
        const price = this.getMarketPrice(commodity.id);
        const totalCost = price * quantity;

        console.log(`💰 Bought ${quantity} ${commodity.name} for ${totalCost.toFixed(0)} credits`);

        // TODO: Integrate with player cargo/credits system
        // For now, just fire the trade event
        const game = (window as any).game;
        if (game && game.processTradeTransaction) {
            game.processTradeTransaction(totalCost, commodity.id);
        }

        // Update economy
        if (this.starSystem && this.starSystem.processEconomicTrade) {
            this.starSystem.processEconomicTrade(
                'PLAYER',
                this.getNearestStationFaction(),
                commodity.id,
                quantity,
                totalCost
            );
        }
    }

    public sellSelected(quantity: number = 100): void {
        const commodity = this.commodities[this.selectedIndex];
        const price = this.getMarketPrice(commodity.id) * 0.8; // Sell at 80% of buy price
        const totalValue = price * quantity;

        console.log(`💰 Sold ${quantity} ${commodity.name} for ${totalValue.toFixed(0)} credits`);

        // TODO: Integrate with player cargo/credits system
        const game = (window as any).game;
        if (game && game.processTradeTransaction) {
            game.processTradeTransaction(totalValue, commodity.id);
        }

        // Update economy
        if (this.starSystem && this.starSystem.processEconomicTrade) {
            this.starSystem.processEconomicTrade(
                this.getNearestStationFaction(),
                'PLAYER',
                commodity.id,
                quantity,
                totalValue
            );
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

        // Commodity list
        let yPos = this.y + 110;

        ctx.font = 'bold 16px "Courier New"';
        ctx.fillStyle = '#00ff00';
        ctx.fillText('COMMODITY', this.x + 30, yPos);
        ctx.fillText('BUY PRICE', this.x + 250, yPos);
        ctx.fillText('SELL PRICE', this.x + 390, yPos);

        yPos += 30;

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

            // Buy price (market price)
            const buyPrice = this.getMarketPrice(commodity.id);
            ctx.fillStyle = isSelected ? '#00ff00' : '#00ff00';
            ctx.fillText(buyPrice.toFixed(0) + ' cr', this.x + 250, yPos);

            // Sell price (80% of buy)
            const sellPrice = buyPrice * 0.8;
            ctx.fillStyle = isSelected ? '#ff6600' : '#ff6600';
            ctx.fillText(sellPrice.toFixed(0) + ' cr', this.x + 390, yPos);

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
