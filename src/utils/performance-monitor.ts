/**
 * PerformanceMonitor - Tracks and displays frame times and system performance
 */

import { ColorPalette } from './color-palettes';

export interface PerformanceStats {
  fps: number;
  avgFrameTime: number;
  maxFrameTime: number;
  updates: Record<string, { avg: number; max: number; count: number }>;
}

/**
 * Performance monitoring class for game loop optimization
 */
export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private updateTimes: Map<string, number[]> = new Map();
  private maxSamples: number = 60; // Track last 60 samples

  /**
   * Start timing a frame
   */
  startFrame(): number {
    return performance.now();
  }

  /**
   * End timing a frame and record the time
   */
  endFrame(startTime: number): void {
    const frameTime = performance.now() - startTime;
    this.frameTimes.push(frameTime);

    // Keep only last N frames
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }

  /**
   * Start timing a specific update operation
   */
  startUpdate(label: string): number {
    return performance.now();
  }

  /**
   * End timing an update operation and record it
   */
  endUpdate(label: string, startTime: number): void {
    const updateTime = performance.now() - startTime;

    if (!this.updateTimes.has(label)) {
      this.updateTimes.set(label, []);
    }

    const times = this.updateTimes.get(label)!;
    times.push(updateTime);

    // Keep only last N samples
    if (times.length > this.maxSamples) {
      times.shift();
    }
  }

  /**
   * Get current performance statistics
   */
  getStats(): PerformanceStats {
    const avgFrameTime = this.frameTimes.length > 0
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 0;
    const maxFrameTime = this.frameTimes.length > 0
      ? Math.max(...this.frameTimes)
      : 0;
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    const updates: Record<string, { avg: number; max: number; count: number }> = {};
    this.updateTimes.forEach((times, label) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const count = times.length;
      updates[label] = { avg, max, count };
    });

    return { fps, avgFrameTime, maxFrameTime, updates };
  }

  /**
   * Render performance stats overlay
   */
  renderStats(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    palette: ColorPalette
  ): void {
    const stats = this.getStats();

    ctx.save();

    // Draw background box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const boxWidth = 300;
    const boxHeight = 100 + Object.keys(stats.updates).length * 15;
    ctx.fillRect(x, y, boxWidth, boxHeight);

    // Draw border
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    // Draw title
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PERFORMANCE MONITOR', x + 10, y + 10);

    // Draw FPS
    ctx.fillStyle = this.getFPSColor(stats.fps, palette);
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${stats.fps.toFixed(1)}`, x + 10, y + 30);

    // Draw frame time
    ctx.fillStyle = palette.primary;
    ctx.fillText(`Frame: ${stats.avgFrameTime.toFixed(2)}ms (max: ${stats.maxFrameTime.toFixed(2)}ms)`, x + 10, y + 45);

    // Draw separator
    ctx.strokeStyle = palette.secondary;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 60);
    ctx.lineTo(x + boxWidth - 10, y + 60);
    ctx.stroke();

    // Draw update times
    let updateY = y + 70;
    ctx.fillStyle = palette.secondary;
    ctx.fillText('System Update Times:', x + 10, updateY);
    updateY += 15;

    ctx.font = '10px monospace';
    Object.entries(stats.updates)
      .sort((a, b) => b[1].avg - a[1].avg) // Sort by avg time descending
      .slice(0, 8) // Show top 8
      .forEach(([label, times]) => {
        const color = this.getUpdateTimeColor(times.avg, palette);
        ctx.fillStyle = color;
        ctx.fillText(
          `  ${label.padEnd(15)}: ${times.avg.toFixed(2)}ms (max: ${times.max.toFixed(2)}ms)`,
          x + 10,
          updateY
        );
        updateY += 15;
      });

    ctx.restore();
  }

  /**
   * Render mini performance overlay (just FPS)
   */
  renderMini(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    palette: ColorPalette
  ): void {
    const stats = this.getStats();

    ctx.save();
    ctx.fillStyle = this.getFPSColor(stats.fps, palette);
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${stats.fps.toFixed(1)}`, x, y);
    ctx.restore();
  }

  /**
   * Get color for FPS based on performance
   */
  private getFPSColor(fps: number, palette: ColorPalette): string {
    if (fps >= 50) return palette.primary;    // Good
    if (fps >= 30) return palette.warning;    // Warning
    return palette.critical;                   // Critical
  }

  /**
   * Get color for update time based on performance
   */
  private getUpdateTimeColor(time: number, palette: ColorPalette): string {
    if (time < 5) return palette.primary;      // Good (< 5ms)
    if (time < 15) return palette.warning;     // Warning (5-15ms)
    return palette.critical;                    // Critical (> 15ms)
  }

  /**
   * Reset all performance data
   */
  reset(): void {
    this.frameTimes = [];
    this.updateTimes.clear();
  }

  /**
   * Check if performance is degraded
   */
  isPerformanceDegraded(): boolean {
    const stats = this.getStats();
    return stats.fps < 30 || stats.avgFrameTime > 33;
  }

  /**
   * Get the slowest system update
   */
  getSlowestUpdate(): { label: string; time: number } | null {
    const stats = this.getStats();
    let slowest: { label: string; time: number } | null = null;

    Object.entries(stats.updates).forEach(([label, times]) => {
      if (!slowest || times.avg > slowest.time) {
        slowest = { label, time: times.avg };
      }
    });

    return slowest;
  }
}
