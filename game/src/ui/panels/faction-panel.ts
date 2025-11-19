/**
 * Faction Relations Panel
 * Shows player's diplomatic standing with all factions
 */

import { SpacecraftAdapter } from '../../spacecraft-adapter';

export class FactionPanel {
    private x: number;
    private y: number;
    private width: number;
    private height: number;
    private visible: boolean = false;
    private starSystem: any;  // StarSystem reference

    constructor(x: number, y: number, width: number, height: number, starSystem: any) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.starSystem = starSystem;
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
    }

    isVisible(): boolean {
        return this.visible;
    }

    toggle(): void {
        this.visible = !this.visible;
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.visible) return;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Border
        ctx.strokeStyle = '#4444ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Title
        ctx.fillStyle = '#88ccff';
        ctx.font = 'bold 16px "Courier New"';
        ctx.fillText('FACTION RELATIONS', this.x + 20, this.y + 30);

        // Get all factions
        const factions = [
            { id: 'UNITED_EARTH', name: 'United Earth' },
            { id: 'MARS_FEDERATION', name: 'Mars Federation' },
            { id: 'BELT_ALLIANCE', name: 'Belt Alliance' },
            { id: 'OUTER_COLONIES', name: 'Outer Colonies' },
            { id: 'INDEPENDENT', name: 'Independent Traders' }
        ];

        let yPos = this.y + 60;

        ctx.font = '14px "Courier New"';

        for (const faction of factions) {
            const relationship = this.starSystem.getFactionRelationship('PLAYER', faction.id);

            // Faction name
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(faction.name, this.x + 20, yPos);

            // Relationship value
            const value = relationship.relationshipValue.toFixed(0);
            const status = relationship.status;

            // Color based on relationship
            let statusColor = '#888888';
            if (relationship.relationshipValue >= 70) statusColor = '#00ff00';
            else if (relationship.relationshipValue >= 40) statusColor = '#88ff88';
            else if (relationship.relationshipValue >= 20) statusColor = '#aaffaa';
            else if (relationship.relationshipValue >= -20) statusColor = '#ffff88';
            else if (relationship.relationshipValue >= -50) statusColor = '#ffaa00';
            else if (relationship.relationshipValue >= -70) statusColor = '#ff6600';
            else statusColor = '#ff0000';

            ctx.fillStyle = statusColor;
            ctx.fillText(`${value}`, this.x + 250, yPos);

            // Status
            ctx.fillStyle = statusColor;
            ctx.fillText(status, this.x + 320, yPos);

            // Trend indicator
            const trend = relationship.trend;
            let trendSymbol = '→';
            if (trend === 'RAPIDLY_IMPROVING') trendSymbol = '↑↑';
            else if (trend === 'IMPROVING') trendSymbol = '↑';
            else if (trend === 'DETERIORATING') trendSymbol = '↓';
            else if (trend === 'RAPIDLY_DETERIORATING') trendSymbol = '↓↓';

            ctx.fillStyle = '#888888';
            ctx.fillText(trendSymbol, this.x + 480, yPos);

            yPos += 30;
        }

        // Diplomatic capital
        yPos += 20;
        ctx.fillStyle = '#88ccff';
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillText('Diplomatic Capital:', this.x + 20, yPos);

        yPos += 25;
        ctx.font = '12px "Courier New"';
        for (const faction of factions) {
            const relationship = this.starSystem.getFactionRelationship('PLAYER', faction.id);
            const capital = (relationship.diplomaticCapital || 0).toFixed(0);

            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(`${faction.name}:`, this.x + 30, yPos);

            ctx.fillStyle = capital > 50 ? '#00ff00' : '#ffaa00';
            ctx.fillText(`${capital}/100`, this.x + 300, yPos);

            yPos += 20;
        }

        // Controls hint
        ctx.fillStyle = '#666666';
        ctx.font = '12px "Courier New"';
        ctx.fillText('[F] Close', this.x + 20, this.y + this.height - 15);
    }

    handleKeyPress(key: string): void {
        if (key === 'f' || key === 'F') {
            this.toggle();
        }
    }
}
