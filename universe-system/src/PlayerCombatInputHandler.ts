/**
 * PlayerCombatInputHandler - Maps keyboard/mouse input to combat actions
 */

import { PlayerShipIntegration } from './PlayerShipIntegration';
import { InputManager } from '../../src/core/input';

export interface CombatInputBindings {
  // Targeting
  targetNearestHostile: string; // Default: 'T'
  cycleTargets: string; // Default: 'TAB'

  // Weapons
  firePrimary: string; // Default: 'SPACE' or Mouse button 0
  fireSecondary: string; // Default: 'F' or Mouse button 2

  // Tactical toggles
  toggleWeapons: string; // Default: 'W'
  toggleShields: string; // Default: 'S'
  toggleEvasion: string; // Default: 'E'
}

export class PlayerCombatInputHandler {
  private player: PlayerShipIntegration;
  private input: InputManager;
  private bindings: CombatInputBindings;

  // UI callback for displaying messages
  private messageCallback?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;

  constructor(
    player: PlayerShipIntegration,
    input: InputManager,
    bindings?: Partial<CombatInputBindings>
  ) {
    this.player = player;
    this.input = input;

    // Default key bindings
    this.bindings = {
      targetNearestHostile: 't',
      cycleTargets: 'tab',
      firePrimary: ' ', // Space
      fireSecondary: 'f',
      toggleWeapons: 'w',
      toggleShields: 's',
      toggleEvasion: 'e',
      ...bindings
    };
  }

  /**
   * Set callback for displaying messages to player
   */
  public setMessageCallback(callback: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void): void {
    this.messageCallback = callback;
  }

  /**
   * Update combat input (call every frame)
   */
  public update(): void {
    // Targeting
    if (this.input.isKeyJustPressed(this.bindings.targetNearestHostile)) {
      this.handleTargetNearestHostile();
    }

    if (this.input.isKeyJustPressed(this.bindings.cycleTargets)) {
      this.handleCycleTargets();
    }

    // Weapons (hold to fire continuously)
    if (this.input.isKeyPressed(this.bindings.firePrimary) || this.input.isMouseButtonPressed(0)) {
      this.handleFirePrimary();
    }

    if (this.input.isKeyPressed(this.bindings.fireSecondary) || this.input.isMouseButtonPressed(2)) {
      this.handleFireSecondary();
    }

    // Tactical toggles (just pressed, not hold)
    if (this.input.isKeyJustPressed(this.bindings.toggleWeapons)) {
      this.handleToggleWeapons();
    }

    if (this.input.isKeyJustPressed(this.bindings.toggleShields)) {
      this.handleToggleShields();
    }

    if (this.input.isKeyJustPressed(this.bindings.toggleEvasion)) {
      this.handleToggleEvasion();
    }
  }

  /**
   * Get help text for combat controls
   */
  public getControlsHelp(): string {
    return `
=== COMBAT CONTROLS ===
${this.bindings.targetNearestHostile.toUpperCase()} - Target nearest hostile
${this.bindings.cycleTargets.toUpperCase()} - Cycle targets
${this.bindings.firePrimary === ' ' ? 'SPACE' : this.bindings.firePrimary.toUpperCase()} / Left Click - Fire primary weapon
${this.bindings.fireSecondary.toUpperCase()} / Right Click - Fire secondary weapon
${this.bindings.toggleWeapons.toUpperCase()} - Toggle weapons armed/safe
${this.bindings.toggleShields.toUpperCase()} - Toggle shields
${this.bindings.toggleEvasion.toUpperCase()} - Toggle evasive maneuvers
    `.trim();
  }

  // Private handlers
  private handleTargetNearestHostile(): void {
    const result = this.player.targetNearestHostile();

    if (result.success && result.target) {
      this.showMessage(result.message, 'success');
      console.log(`[COMBAT INPUT] ${result.message}`);
    } else {
      this.showMessage(result.message, 'warning');
      console.log(`[COMBAT INPUT] ${result.message}`);
    }
  }

  private handleCycleTargets(): void {
    const result = this.player.cycleTargets();

    if (result.success && result.target) {
      this.showMessage(result.message, 'info');
      console.log(`[COMBAT INPUT] ${result.message}`);
    } else {
      this.showMessage(result.message, 'warning');
    }
  }

  private handleFirePrimary(): void {
    const combatState = this.player.getCombatState();

    if (!combatState.weaponsHot) {
      return; // Weapons are safe
    }

    const result = this.player.firePrimaryWeapon();

    if (result.hit) {
      const messageType = result.criticalHit ? 'success' : 'info';
      this.showMessage(result.message, messageType);
      console.log(`[COMBAT INPUT] ${result.message}`);

      if (result.targetDestroyed) {
        this.showMessage('TARGET DESTROYED!', 'success');
      }
    } else if (result.message !== 'Shot missed target') {
      // Only show non-miss failures
      this.showMessage(result.message, 'warning');
    }
  }

  private handleFireSecondary(): void {
    const combatState = this.player.getCombatState();

    if (!combatState.weaponsHot) {
      return; // Weapons are safe
    }

    const result = this.player.fireSecondaryWeapon();

    if (result.hit) {
      const messageType = result.criticalHit ? 'success' : 'info';
      this.showMessage(result.message, messageType);
      console.log(`[COMBAT INPUT] ${result.message}`);

      if (result.targetDestroyed) {
        this.showMessage('TARGET DESTROYED!', 'success');
      }
    } else if (result.message !== 'Shot missed target') {
      // Only show non-miss failures
      this.showMessage(result.message, 'warning');
    }
  }

  private handleToggleWeapons(): void {
    const result = this.player.toggleWeapons();
    this.showMessage(result.message, result.weaponsHot ? 'warning' : 'info');
    console.log(`[COMBAT INPUT] ${result.message}`);
  }

  private handleToggleShields(): void {
    const result = this.player.toggleShields();
    this.showMessage(result.message, 'info');
    console.log(`[COMBAT INPUT] ${result.message}`);
  }

  private handleToggleEvasion(): void {
    const result = this.player.toggleEvasion();
    this.showMessage(result.message, 'info');
    console.log(`[COMBAT INPUT] ${result.message}`);
  }

  private showMessage(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    if (this.messageCallback) {
      this.messageCallback(message, type);
    }
  }
}
