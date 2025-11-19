/**
 * SpaceRenderer - Renders the 3D space scene with spacecraft, planets, stations, and NPCs
 * Converts 3D world coordinates to 2D screen space with camera following
 */

import { ColorPalette } from '../utils/color-palettes';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface RenderableSpacecraft {
  position: Vector3;
  rotation: number;
  engineFiring: boolean;
  name: string;
}

export interface RenderableCelestialBody {
  position: Vector3;
  radius: number;
  name: string;
  type: 'star' | 'planet' | 'moon' | 'asteroid';
  atmosphere?: {
    density: number;
  };
}

export interface RenderableStation {
  position: Vector3;
  name: string;
  faction?: string;
}

export interface RenderableNPCShip {
  position: Vector3;
  heading: number;
  hostile: boolean;
  name?: string;
}

export interface RenderableHazard {
  position: Vector3;
  radius: number;
  type: string;
}

export interface RenderableTarget {
  position: Vector3;
  name: string;
  distance: number;
}

export interface SpaceScene {
  spacecraft: RenderableSpacecraft;
  celestialBodies: RenderableCelestialBody[];
  stations: RenderableStation[];
  npcShips: RenderableNPCShip[];
  hazards?: RenderableHazard[];
  targetedContact?: RenderableTarget | null;
  showTrajectory?: boolean;
  trajectory?: Vector3[];
}

/**
 * Camera for world-to-screen coordinate conversion
 */
class Camera {
  private position: Vector3 = { x: 0, y: 0, z: 0 };
  private zoom: number = 0.5; // Start zoomed out
  private screenWidth: number = 1280;
  private screenHeight: number = 720;

  update(targetPosition: Vector3, screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // Smoothly follow target
    const smoothing = 0.1;
    this.position.x += (targetPosition.x - this.position.x) * smoothing;
    this.position.y += (targetPosition.y - this.position.y) * smoothing;
    this.position.z += (targetPosition.z - this.position.z) * smoothing;
  }

  worldToScreen(worldPos: Vector3): { x: number; y: number } {
    // Convert 3D world coordinates to 2D screen coordinates
    // Z axis is ignored (top-down view)
    const screenX = this.screenWidth / 2 + (worldPos.x - this.position.x) * this.zoom / 1000;
    const screenY = this.screenHeight / 2 + (worldPos.y - this.position.y) * this.zoom / 1000;

    return { x: screenX, y: screenY };
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(10, zoom));
  }

  getZoom(): number {
    return this.zoom;
  }
}

/**
 * Main space renderer class
 */
export class SpaceRenderer {
  private ctx: CanvasRenderingContext2D;
  private palette: ColorPalette;
  private camera: Camera;
  private starFieldCache: ImageData | null = null;

  constructor(ctx: CanvasRenderingContext2D, palette: ColorPalette) {
    this.ctx = ctx;
    this.palette = palette;
    this.camera = new Camera();
  }

  /**
   * Render complete space scene
   */
  render(scene: SpaceScene, width: number, height: number): void {
    // 1. Clear and set background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    // 2. Draw star field (static background)
    this.renderStarField(width, height);

    // 3. Update camera to follow spacecraft
    this.camera.update(scene.spacecraft.position, width, height);

    // 4. Render celestial bodies (planets, moons)
    this.renderCelestialBodies(scene.celestialBodies);

    // 5. Render space stations
    this.renderStations(scene.stations);

    // 6. Render NPC ships
    this.renderNPCShips(scene.npcShips);

    // 7. Render player spacecraft
    this.renderSpacecraft(scene.spacecraft);

    // 8. Render trajectories and UI overlays
    if (scene.showTrajectory && scene.trajectory) {
      this.renderTrajectory(scene.trajectory);
    }

    // 9. Render hazard zones
    if (scene.hazards) {
      this.renderHazards(scene.hazards);
    }

    // 10. Render targeting reticles
    if (scene.targetedContact) {
      this.renderTargetingReticle(scene.targetedContact);
    }

    // 11. Render zoom indicator
    this.renderZoomIndicator(width, height);
  }

  /**
   * Render static star field background
   */
  private renderStarField(width: number, height: number): void {
    // Use deterministic random for consistent star positions
    const seed = 12345;
    let rng = seed;
    const next = () => {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };

    this.ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 200; i++) {
      const x = next() * width;
      const y = next() * height;
      const brightness = next();

      this.ctx.globalAlpha = brightness * 0.5 + 0.5;
      this.ctx.fillRect(x, y, 1, 1);
    }
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * Render player spacecraft
   */
  private renderSpacecraft(spacecraft: RenderableSpacecraft): void {
    const screenPos = this.camera.worldToScreen(spacecraft.position);

    this.ctx.save();
    this.ctx.translate(screenPos.x, screenPos.y);
    this.ctx.rotate(spacecraft.rotation);

    // Draw ship as triangle
    this.ctx.beginPath();
    this.ctx.moveTo(15, 0);       // Nose
    this.ctx.lineTo(-10, -8);     // Left wing
    this.ctx.lineTo(-5, 0);       // Center back
    this.ctx.lineTo(-10, 8);      // Right wing
    this.ctx.closePath();

    this.ctx.fillStyle = this.palette.primary;
    this.ctx.fill();
    this.ctx.strokeStyle = this.palette.accent;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw engine thrust indicator
    if (spacecraft.engineFiring) {
      this.ctx.beginPath();
      this.ctx.moveTo(-5, 0);
      this.ctx.lineTo(-15, -3);
      this.ctx.lineTo(-15, 3);
      this.ctx.closePath();
      this.ctx.fillStyle = this.palette.warning;
      this.ctx.fill();
    }

    this.ctx.restore();

    // Draw ship label
    this.ctx.fillStyle = this.palette.primary;
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(spacecraft.name || 'PLAYER', screenPos.x + 20, screenPos.y);
  }

  /**
   * Render celestial bodies
   */
  private renderCelestialBodies(bodies: RenderableCelestialBody[]): void {
    bodies.forEach(body => {
      const screenPos = this.camera.worldToScreen(body.position);

      // Scale radius for visibility
      const screenRadius = Math.max(10, body.radius * this.camera.getZoom() / 10000);

      // Draw body
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);

      // Color based on type
      const colors: Record<string, string> = {
        'star': '#ffff00',
        'planet': this.palette.primary,
        'moon': this.palette.secondary,
        'asteroid': '#888888'
      };
      this.ctx.fillStyle = colors[body.type] || this.palette.primary;
      this.ctx.fill();

      this.ctx.strokeStyle = this.palette.accent;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Draw atmosphere if present
      if (body.atmosphere && body.atmosphere.density > 0) {
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.2, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.palette.primary;
        this.ctx.globalAlpha = 0.3;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
      }

      // Draw label
      this.ctx.fillStyle = this.palette.secondary;
      this.ctx.font = '10px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(body.name, screenPos.x + screenRadius + 5, screenPos.y);
    });
  }

  /**
   * Render space stations
   */
  private renderStations(stations: RenderableStation[]): void {
    stations.forEach(station => {
      const screenPos = this.camera.worldToScreen(station.position);

      // Draw station as octagon
      this.ctx.beginPath();
      const sides = 8;
      const radius = 8;
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = screenPos.x + Math.cos(angle) * radius;
        const y = screenPos.y + Math.sin(angle) * radius;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }

      this.ctx.strokeStyle = this.palette.accent;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw station label
      this.ctx.fillStyle = this.palette.accent;
      this.ctx.font = '10px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(station.name, screenPos.x + 10, screenPos.y);
    });
  }

  /**
   * Render NPC ships
   */
  private renderNPCShips(ships: RenderableNPCShip[]): void {
    ships.forEach(ship => {
      const screenPos = this.camera.worldToScreen(ship.position);

      // Draw ship as small triangle
      this.ctx.save();
      this.ctx.translate(screenPos.x, screenPos.y);
      this.ctx.rotate(ship.heading || 0);

      this.ctx.beginPath();
      this.ctx.moveTo(6, 0);
      this.ctx.lineTo(-4, -3);
      this.ctx.lineTo(-4, 3);
      this.ctx.closePath();

      // Color by faction/threat
      const color = ship.hostile ? this.palette.critical : this.palette.secondary;
      this.ctx.fillStyle = color;
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  /**
   * Render trajectory prediction
   */
  private renderTrajectory(trajectory: Vector3[]): void {
    if (!trajectory || trajectory.length === 0) return;

    this.ctx.beginPath();
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeStyle = this.palette.warning;
    this.ctx.lineWidth = 1;

    trajectory.forEach((point, index) => {
      const screenPos = this.camera.worldToScreen(point);
      if (index === 0) {
        this.ctx.moveTo(screenPos.x, screenPos.y);
      } else {
        this.ctx.lineTo(screenPos.x, screenPos.y);
      }
    });

    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  /**
   * Render hazard zones
   */
  private renderHazards(hazards: RenderableHazard[]): void {
    hazards.forEach(hazard => {
      const screenPos = this.camera.worldToScreen(hazard.position);
      const screenRadius = Math.max(20, hazard.radius * this.camera.getZoom() / 1000);

      // Draw hazard zone as pulsing circle
      const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;

      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.palette.critical;
      this.ctx.globalAlpha = pulse * 0.5;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.globalAlpha = 1.0;

      // Draw hazard label
      this.ctx.fillStyle = this.palette.critical;
      this.ctx.font = '10px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`⚠ ${hazard.type}`, screenPos.x + screenRadius + 5, screenPos.y);
    });
  }

  /**
   * Render targeting reticle
   */
  private renderTargetingReticle(target: RenderableTarget): void {
    const screenPos = this.camera.worldToScreen(target.position);

    // Draw targeting brackets
    const size = 20;
    const gap = 5;

    this.ctx.strokeStyle = this.palette.accent;
    this.ctx.lineWidth = 2;

    // Top-left bracket
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x - size, screenPos.y - size + gap);
    this.ctx.lineTo(screenPos.x - size, screenPos.y - size);
    this.ctx.lineTo(screenPos.x - size + gap, screenPos.y - size);
    this.ctx.stroke();

    // Top-right bracket
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x + size, screenPos.y - size + gap);
    this.ctx.lineTo(screenPos.x + size, screenPos.y - size);
    this.ctx.lineTo(screenPos.x + size - gap, screenPos.y - size);
    this.ctx.stroke();

    // Bottom-left bracket
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x - size, screenPos.y + size - gap);
    this.ctx.lineTo(screenPos.x - size, screenPos.y + size);
    this.ctx.lineTo(screenPos.x - size + gap, screenPos.y + size);
    this.ctx.stroke();

    // Bottom-right bracket
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x + size, screenPos.y + size - gap);
    this.ctx.lineTo(screenPos.x + size, screenPos.y + size);
    this.ctx.lineTo(screenPos.x + size - gap, screenPos.y + size);
    this.ctx.stroke();

    // Draw target info
    this.ctx.fillStyle = this.palette.accent;
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(target.name || 'TARGET', screenPos.x + 25, screenPos.y - 5);
    this.ctx.fillText(`${target.distance.toFixed(0)} km`, screenPos.x + 25, screenPos.y + 5);
  }

  /**
   * Render zoom indicator
   */
  private renderZoomIndicator(width: number, height: number): void {
    const zoom = this.camera.getZoom();
    const text = `ZOOM: ${zoom.toFixed(2)}x`;

    this.ctx.fillStyle = this.palette.secondary;
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, 10, height - 20);
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    this.camera.setZoom(this.camera.getZoom() * 1.25);
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    this.camera.setZoom(this.camera.getZoom() * 0.8);
  }

  /**
   * Update palette
   */
  setPalette(palette: ColorPalette): void {
    this.palette = palette;
  }
}
