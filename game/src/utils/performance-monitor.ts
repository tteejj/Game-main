/**
 * Performance Monitor - Tracks frame times and system performance
 * Based on ACTION_PLAN_PHASE_4.md specifications
 */

export class PerformanceMonitor {
    private frameTimes: number[] = [];
    private updateTimes: Map<string, number[]> = new Map();

    startFrame(): number {
        return performance.now();
    }

    endFrame(startTime: number): void {
        const frameTime = performance.now() - startTime;
        this.frameTimes.push(frameTime);

        // Keep only last 60 frames
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
    }

    startUpdate(label: string): number {
        return performance.now();
    }

    endUpdate(label: string, startTime: number): void {
        const updateTime = performance.now() - startTime;

        if (!this.updateTimes.has(label)) {
            this.updateTimes.set(label, []);
        }

        const times = this.updateTimes.get(label)!;
        times.push(updateTime);

        if (times.length > 60) {
            times.shift();
        }
    }

    getStats(): {
        fps: number;
        avgFrameTime: number;
        updates: Record<string, { avg: number; max: number }>;
    } {
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        const fps = 1000 / avgFrameTime;

        const updates: Record<string, { avg: number; max: number }> = {};
        this.updateTimes.forEach((times, label) => {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const max = Math.max(...times);
            updates[label] = { avg, max };
        });

        return { fps, avgFrameTime, updates };
    }

    renderStats(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        const stats = this.getStats();

        ctx.fillStyle = '#00ff00';
        ctx.font = '12px "Courier New"';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.fillText(`FPS: ${stats.fps.toFixed(1)}`, x, y);
        y += 15;
        ctx.fillText(`Frame: ${stats.avgFrameTime.toFixed(2)}ms`, x, y);
        y += 20;

        Object.entries(stats.updates).forEach(([label, times]) => {
            ctx.fillText(`${label}: ${times.avg.toFixed(2)}ms (max ${times.max.toFixed(2)}ms)`, x, y);
            y += 15;
        });
    }
}
