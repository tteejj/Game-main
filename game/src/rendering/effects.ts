/**
 * Visual Effects for space combat and events
 * Based on ACTION_PLAN_PHASE_4.md specifications
 */

interface Effect {
    type: string;
    startTime: number;
    duration: number;
    [key: string]: any;
}

export class VisualEffects {
    private ctx: CanvasRenderingContext2D;
    private activeEffects: Effect[] = [];

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    /**
     * Add explosion effect
     */
    addExplosion(position: { x: number; y: number }, size: number = 20): void {
        this.activeEffects.push({
            type: 'explosion',
            position,
            size,
            startTime: Date.now(),
            duration: 1000 // 1 second
        });
    }

    /**
     * Add weapon fire effect
     */
    addWeaponFire(from: { x: number; y: number }, to: { x: number; y: number }): void {
        this.activeEffects.push({
            type: 'laser',
            from,
            to,
            startTime: Date.now(),
            duration: 100 // 0.1 second
        });
    }

    /**
     * Update and render all active effects
     */
    update(currentTime: number): void {
        // Remove expired effects
        this.activeEffects = this.activeEffects.filter(effect => {
            return currentTime - effect.startTime < effect.duration;
        });

        // Render each effect
        this.activeEffects.forEach(effect => {
            const progress = (currentTime - effect.startTime) / effect.duration;

            switch (effect.type) {
                case 'explosion':
                    this.renderExplosion(effect, progress);
                    break;
                case 'laser':
                    this.renderLaser(effect, progress);
                    break;
            }
        });
    }

    private renderExplosion(effect: any, progress: number): void {
        const radius = effect.size * (1 + progress * 2);
        const alpha = 1 - progress;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;

        // Draw expanding ring
        this.ctx.beginPath();
        this.ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ff6600';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Draw inner flash
        this.ctx.beginPath();
        this.ctx.arc(effect.position.x, effect.position.y, radius * 0.5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fill();

        this.ctx.restore();
    }

    private renderLaser(effect: any, progress: number): void {
        this.ctx.save();
        this.ctx.globalAlpha = 1 - progress;

        this.ctx.beginPath();
        this.ctx.moveTo(effect.from.x, effect.from.y);
        this.ctx.lineTo(effect.to.x, effect.to.y);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Clear all effects
     */
    clear(): void {
        this.activeEffects = [];
    }

    /**
     * Get count of active effects
     */
    getActiveCount(): number {
        return this.activeEffects.length;
    }
}
