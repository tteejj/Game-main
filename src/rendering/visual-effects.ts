/**
 * VisualEffects - Handles particle effects, explosions, weapon fire, etc.
 */

import { ColorPalette } from '../utils/color-palettes';

interface Effect {
  type: string;
  startTime: number;
  duration: number;
  [key: string]: any;
}

interface ExplosionEffect extends Effect {
  type: 'explosion';
  position: { x: number; y: number };
  size: number;
}

interface LaserEffect extends Effect {
  type: 'laser';
  from: { x: number; y: number };
  to: { x: number; y: number };
}

interface ImpactEffect extends Effect {
  type: 'impact';
  position: { x: number; y: number };
  size: number;
}

interface TrailEffect extends Effect {
  type: 'trail';
  position: { x: number; y: number };
  velocity: { x: number; y: number };
}

/**
 * Visual effects manager
 */
export class VisualEffects {
  private ctx: CanvasRenderingContext2D;
  private palette: ColorPalette;
  private activeEffects: Effect[] = [];

  constructor(ctx: CanvasRenderingContext2D, palette: ColorPalette) {
    this.ctx = ctx;
    this.palette = palette;
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
    } as ExplosionEffect);
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
    } as LaserEffect);
  }

  /**
   * Add impact effect (hit marker)
   */
  addImpact(position: { x: number; y: number }, size: number = 10): void {
    this.activeEffects.push({
      type: 'impact',
      position,
      size,
      startTime: Date.now(),
      duration: 300 // 0.3 seconds
    } as ImpactEffect);
  }

  /**
   * Add engine trail effect
   */
  addTrail(position: { x: number; y: number }, velocity: { x: number; y: number }): void {
    this.activeEffects.push({
      type: 'trail',
      position: { ...position },
      velocity: { ...velocity },
      startTime: Date.now(),
      duration: 500 // 0.5 seconds
    } as TrailEffect);
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
          this.renderExplosion(effect as ExplosionEffect, progress);
          break;
        case 'laser':
          this.renderLaser(effect as LaserEffect, progress);
          break;
        case 'impact':
          this.renderImpact(effect as ImpactEffect, progress);
          break;
        case 'trail':
          this.renderTrail(effect as TrailEffect, progress);
          break;
      }
    });
  }

  /**
   * Render explosion effect
   */
  private renderExplosion(effect: ExplosionEffect, progress: number): void {
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

    // Draw particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particleX = effect.position.x + Math.cos(angle) * radius * 1.5;
      const particleY = effect.position.y + Math.sin(angle) * radius * 1.5;

      this.ctx.fillStyle = '#ff8800';
      this.ctx.fillRect(particleX - 2, particleY - 2, 4, 4);
    }

    this.ctx.restore();
  }

  /**
   * Render laser beam effect
   */
  private renderLaser(effect: LaserEffect, progress: number): void {
    this.ctx.save();
    this.ctx.globalAlpha = 1 - progress;

    // Draw main beam
    this.ctx.beginPath();
    this.ctx.moveTo(effect.from.x, effect.from.y);
    this.ctx.lineTo(effect.to.x, effect.to.y);
    this.ctx.strokeStyle = this.palette.accent;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Draw glow
    this.ctx.globalAlpha = (1 - progress) * 0.5;
    this.ctx.strokeStyle = this.palette.primary;
    this.ctx.lineWidth = 6;
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Render impact/hit effect
   */
  private renderImpact(effect: ImpactEffect, progress: number): void {
    const size = effect.size * (1 + progress * 0.5);
    const alpha = 1 - progress;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // Draw X pattern
    this.ctx.strokeStyle = this.palette.warning;
    this.ctx.lineWidth = 2;

    // Draw X
    this.ctx.beginPath();
    this.ctx.moveTo(effect.position.x - size, effect.position.y - size);
    this.ctx.lineTo(effect.position.x + size, effect.position.y + size);
    this.ctx.moveTo(effect.position.x + size, effect.position.y - size);
    this.ctx.lineTo(effect.position.x - size, effect.position.y + size);
    this.ctx.stroke();

    // Draw circle
    this.ctx.beginPath();
    this.ctx.arc(effect.position.x, effect.position.y, size * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Render engine trail effect
   */
  private renderTrail(effect: TrailEffect, progress: number): void {
    const alpha = 1 - progress;
    const offsetX = effect.velocity.x * progress * 20;
    const offsetY = effect.velocity.y * progress * 20;

    this.ctx.save();
    this.ctx.globalAlpha = alpha * 0.6;

    // Draw trail particles
    for (let i = 0; i < 5; i++) {
      const particleProgress = i / 5;
      const x = effect.position.x - offsetX * particleProgress;
      const y = effect.position.y - offsetY * particleProgress;
      const size = 3 * (1 - particleProgress);

      this.ctx.fillStyle = this.palette.warning;
      this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }

    this.ctx.restore();
  }

  /**
   * Clear all active effects
   */
  clear(): void {
    this.activeEffects = [];
  }

  /**
   * Get number of active effects
   */
  getActiveCount(): number {
    return this.activeEffects.length;
  }

  /**
   * Update palette
   */
  setPalette(palette: ColorPalette): void {
    this.palette = palette;
  }
}
