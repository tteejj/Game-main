/**
 * WEAPONS Station Panel
 * Fire control, targeting, weapons status, EW/Countermeasures
 * Based on design: 01-CONTROL-STATIONS.md
 */

import { SpacecraftAdapter } from '../../spacecraft-adapter';
import { PlayerShipIntegration } from '../../../../universe-system/src/PlayerShipIntegration';

export class WeaponsPanel {
    private ctx: CanvasRenderingContext2D;
    private palette: any;
    private spacecraft: SpacecraftAdapter;

    // State
    private selectedWeaponIndex: number = 0;
    private selectedTargetIndex: number = 0;
    private weaponsSafetyOn: boolean = true;
    private pointDefenseActive: boolean = true;
    private autoEngageHostiles: boolean = false;
    private ewSystemActive: boolean = false;
    private countermeasuresArmed: boolean = false;

    // Player integration for combat
    private playerIntegration: PlayerShipIntegration | null = null;

    constructor(ctx: CanvasRenderingContext2D, palette: any, spacecraft: SpacecraftAdapter) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
    }

    /**
     * Set player integration for combat system
     */
    setPlayerIntegration(integration: PlayerShipIntegration): void {
        this.playerIntegration = integration;
        console.log('✅ Weapons panel connected to player combat system');
    }

    handleInput(key: string): void {
        const keyLower = key.toLowerCase();

        switch (keyLower) {
            case 's':
                // Toggle weapons safety
                this.weaponsSafetyOn = !this.weaponsSafetyOn;
                this.spacecraft.setWeaponsSafety(this.weaponsSafetyOn);
                console.log(`Weapons safety: ${this.weaponsSafetyOn ? 'ON' : 'OFF'}`);
                break;
            case 'p':
                // Toggle point defense
                this.pointDefenseActive = !this.pointDefenseActive;
                this.spacecraft.setPointDefense(this.pointDefenseActive);
                console.log(`Point defense: ${this.pointDefenseActive ? 'ACTIVE' : 'INACTIVE'}`);
                break;
            case 'a':
                // Toggle auto-engage hostiles
                this.autoEngageHostiles = !this.autoEngageHostiles;
                this.spacecraft.setAutoEngageHostiles(this.autoEngageHostiles);
                console.log(`Auto-engage: ${this.autoEngageHostiles ? 'ON' : 'OFF'}`);
                break;
            case 'w':
                // Cycle weapons up
                const weaponsState = this.spacecraft.getWeaponsState();
                const totalWeapons = this.getTotalWeaponsCount(weaponsState);
                if (totalWeapons > 0) {
                    this.selectedWeaponIndex = (this.selectedWeaponIndex + 1) % totalWeapons;
                }
                break;
            case 'x':
                // Cycle weapons down
                const weaponsState2 = this.spacecraft.getWeaponsState();
                const totalWeapons2 = this.getTotalWeaponsCount(weaponsState2);
                if (totalWeapons2 > 0) {
                    this.selectedWeaponIndex = (this.selectedWeaponIndex - 1 + totalWeapons2) % totalWeapons2;
                }
                break;
            case 't':
                // Cycle targets using PlayerShipIntegration
                if (this.playerIntegration) {
                    this.playerIntegration.cycleTargets();
                    const combatState = this.playerIntegration.getCombatState();
                    if (combatState.currentTarget) {
                        this.selectedTargetIndex = 0;
                        console.log(`Target: ${combatState.currentTarget.name} @ ${Math.floor(combatState.currentTarget.distance)}km`);
                    }
                } else {
                    // Fallback to spacecraft targets
                    const targets = this.spacecraft.getWeaponsTargets();
                    if (targets.length > 0) {
                        this.selectedTargetIndex = (this.selectedTargetIndex + 1) % targets.length;
                    }
                }
                break;
            case 'f':
                // Fire primary weapon (only if safety off)
                if (!this.weaponsSafetyOn) {
                    if (this.playerIntegration) {
                        // Use player integration combat system
                        const result = this.playerIntegration.firePrimaryWeapon();
                        console.log(`Primary weapon fired: ${result.hit ? 'HIT' : 'MISS'}`);
                        if (result.hit && result.damage) {
                            const damageVal = typeof result.damage === 'number' ? result.damage : (result.damage as any).totalDamage || result.damage;
                            console.log(`  Damage: ${damageVal} HP`);
                        }
                    } else {
                        // Fallback to spacecraft weapons
                        this.spacecraft.fireWeapon(this.selectedWeaponIndex, this.selectedTargetIndex);
                        console.log('Primary weapon fired');
                    }
                }
                break;
            case 'g':
                // Fire secondary weapon (only if safety off)
                if (!this.weaponsSafetyOn) {
                    if (this.playerIntegration) {
                        const result = this.playerIntegration.fireSecondaryWeapon();
                        console.log(`Secondary weapon fired: ${result.hit ? 'HIT' : 'MISS'}`);
                        if (result.hit && result.damage) {
                            const damageVal = typeof result.damage === 'number' ? result.damage : (result.damage as any).totalDamage || result.damage;
                            console.log(`  Damage: ${damageVal} HP`);
                        }
                    }
                }
                break;
            case 'h':
                // Toggle shields
                if (this.playerIntegration) {
                    const result = this.playerIntegration.toggleShields();
                    console.log(`🛡️ ${result.message}`);
                }
                break;
            case 'v':
                // Toggle evasion mode
                if (this.playerIntegration) {
                    const result = this.playerIntegration.toggleEvasion();
                    console.log(`🎯 ${result.message}`);
                }
                break;
            case 'e':
                // Engage target with all weapons
                if (!this.weaponsSafetyOn) {
                    this.spacecraft.engageTarget(this.selectedTargetIndex, 'all');
                    console.log('Target engaged');
                }
                break;
            case 'j':
                // Toggle EW (Electronic Warfare) jamming system
                this.ewSystemActive = !this.ewSystemActive;
                this.spacecraft.setEWJamming(this.ewSystemActive);
                console.log(`EW Jamming: ${this.ewSystemActive ? 'ACTIVE' : 'INACTIVE'}`);
                break;
            case 'c':
                // Arm countermeasures
                this.countermeasuresArmed = !this.countermeasuresArmed;
                this.spacecraft.setCountermeasuresArmed(this.countermeasuresArmed);
                console.log(`Countermeasures: ${this.countermeasuresArmed ? 'ARMED' : 'SAFE'}`);
                break;
            case 'd':
                // Deploy countermeasures (chaff/flares)
                if (this.countermeasuresArmed) {
                    this.spacecraft.deployCountermeasures();
                    console.log('Countermeasures deployed');
                }
                break;
        }
    }

    private getTotalWeaponsCount(weaponsState: any): number {
        let count = 0;
        if (weaponsState.kineticWeapons) count += weaponsState.kineticWeapons.length;
        if (weaponsState.missileLaunchers) count += weaponsState.missileLaunchers.length;
        if (weaponsState.laserWeapons) count += weaponsState.laserWeapons.length;
        if (weaponsState.particleBeams) count += weaponsState.particleBeams.length;
        return count;
    }

    render(): void {
        const ctx = this.ctx;
        const weaponsState = this.spacecraft.getWeaponsState();

        // Get targets from combat system if available
        let targets: any[];
        let inCombat = false;
        if (this.playerIntegration) {
            const combatState = this.playerIntegration.getCombatState();
            targets = combatState.currentTarget ? [combatState.currentTarget] : [];
            inCombat = combatState.inCombat;
        } else {
            targets = this.spacecraft.getWeaponsTargets();
        }

        ctx.font = 'bold 20px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText('WEAPONS', 40, 40);

        // Combat status indicator
        if (inCombat) {
            ctx.fillStyle = this.palette.danger;
            ctx.font = 'bold 16px "Courier New"';
            ctx.fillText('⚠ COMBAT', 1000, 40);
        }

        ctx.font = '14px "Courier New"';

        // Fire Control Status (top section)
        let y = 80;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('FIRE CONTROL', 40, y);
        y += 25;

        // Safety status
        ctx.fillStyle = this.weaponsSafetyOn ? this.palette.warning : this.palette.danger;
        ctx.fillText(`SAFETY: ${this.weaponsSafetyOn ? 'ON' : 'OFF'}  (S)`, 60, y);
        y += 20;

        // Point defense
        ctx.fillStyle = this.pointDefenseActive ? this.palette.primary : this.palette.muted;
        ctx.fillText(`Point Defense: ${this.pointDefenseActive ? 'ACTIVE' : 'OFF'}  (P)`, 60, y);
        y += 20;

        // Auto-engage
        ctx.fillStyle = this.autoEngageHostiles ? this.palette.primary : this.palette.muted;
        ctx.fillText(`Auto-Engage: ${this.autoEngageHostiles ? 'ON' : 'OFF'}  (A)`, 60, y);
        y += 20;

        // Shields (if player integration available)
        if (this.playerIntegration) {
            const combatState = this.playerIntegration.getCombatState();
            ctx.fillStyle = combatState.shieldsUp ? this.palette.info : this.palette.muted;
            ctx.fillText(`Shields: ${combatState.shieldsUp ? 'UP' : 'DOWN'}  (H)`, 60, y);
            y += 20;

            // Evasion mode
            ctx.fillStyle = combatState.evasionMode ? this.palette.info : this.palette.muted;
            ctx.fillText(`Evasion: ${combatState.evasionMode ? 'ACTIVE' : 'OFF'}  (V)`, 60, y);
            y += 10;
        }

        y += 10;

        // Weapons List (left side)
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('WEAPONS', 40, y);
        y += 25;

        let weaponIndex = 0;

        // Kinetic weapons
        if (weaponsState.kineticWeapons) {
            weaponsState.kineticWeapons.forEach((weapon: any) => {
                const isSelected = weaponIndex === this.selectedWeaponIndex;
                ctx.fillStyle = isSelected ? this.palette.info : this.palette.secondary;

                const statusColor = weapon.status === 'ready' || weapon.status === 'tracking'
                    ? this.palette.primary
                    : weapon.status === 'damaged'
                    ? this.palette.danger
                    : this.palette.muted;

                ctx.fillStyle = statusColor;
                const marker = isSelected ? '>' : ' ';
                ctx.fillText(`${marker} ${weapon.type.toUpperCase()}: ${weapon.status}`, 60, y);

                // Enhanced ammo display with percentage
                if (weapon.ammo !== undefined && weapon.maxAmmo !== undefined) {
                    const ammoPercent = (weapon.ammo / weapon.maxAmmo) * 100;
                    const ammoColor = ammoPercent > 50 ? this.palette.primary :
                                     ammoPercent > 20 ? this.palette.warning :
                                     this.palette.danger;
                    ctx.fillStyle = ammoColor;
                    ctx.fillText(`[${weapon.ammo}/${weapon.maxAmmo}]`, 260, y);
                } else if (weapon.ammo !== undefined) {
                    ctx.fillStyle = this.palette.muted;
                    ctx.fillText(`[${weapon.ammo}]`, 260, y);
                }

                y += 18;

                // Cooldown timer
                if (weapon.cooldown !== undefined && weapon.cooldown > 0) {
                    ctx.fillStyle = this.palette.warning;
                    ctx.font = '12px "Courier New"';
                    ctx.fillText(`  Cooldown: ${weapon.cooldown.toFixed(1)}s`, 70, y);
                    ctx.font = '14px "Courier New"';
                    y += 18;
                }

                // Hit probability (if selected and target is selected)
                if (isSelected && targets.length > 0 && this.selectedTargetIndex < targets.length) {
                    const hitProb = this.calculateHitProbability(weapon, targets[this.selectedTargetIndex]);
                    const probColor = hitProb > 70 ? this.palette.primary :
                                     hitProb > 40 ? this.palette.warning :
                                     this.palette.danger;
                    ctx.fillStyle = probColor;
                    ctx.font = '12px "Courier New"';
                    ctx.fillText(`  Hit Prob: ${hitProb.toFixed(0)}%`, 70, y);
                    ctx.font = '14px "Courier New"';
                    y += 18;
                }

                y += 4;
                weaponIndex++;
            });
        }

        // Missile launchers
        if (weaponsState.missileLaunchers) {
            weaponsState.missileLaunchers.forEach((launcher: any) => {
                const isSelected = weaponIndex === this.selectedWeaponIndex;
                const ammoPercent = (launcher.loaded / launcher.capacity) * 100;
                const statusColor = ammoPercent > 50 ? this.palette.primary :
                                   ammoPercent > 20 ? this.palette.warning :
                                   this.palette.danger;

                ctx.fillStyle = statusColor;
                const marker = isSelected ? '>' : ' ';
                ctx.fillText(`${marker} MISSILE: ${launcher.loaded}/${launcher.capacity}`, 60, y);

                y += 18;

                // Reload time (if reloading)
                if (launcher.reloading && launcher.reloadTimeRemaining > 0) {
                    ctx.fillStyle = this.palette.warning;
                    ctx.font = '12px "Courier New"';
                    ctx.fillText(`  Reloading: ${launcher.reloadTimeRemaining.toFixed(1)}s`, 70, y);
                    ctx.font = '14px "Courier New"';
                    y += 18;
                }

                // Hit probability for missiles (if selected)
                if (isSelected && targets.length > 0 && this.selectedTargetIndex < targets.length) {
                    const hitProb = 85; // Missiles have high hit probability due to guidance
                    ctx.fillStyle = this.palette.primary;
                    ctx.font = '12px "Courier New"';
                    ctx.fillText(`  Hit Prob: ${hitProb}% (Guided)`, 70, y);
                    ctx.font = '14px "Courier New"';
                    y += 18;
                }

                y += 4;
                weaponIndex++;
            });
        }

        // Energy weapons
        if (weaponsState.laserWeapons) {
            weaponsState.laserWeapons.forEach((laser: any) => {
                const isSelected = weaponIndex === this.selectedWeaponIndex;
                const statusColor = laser.ready ? this.palette.primary : this.palette.muted;

                ctx.fillStyle = statusColor;
                const marker = isSelected ? '>' : ' ';
                ctx.fillText(`${marker} LASER: ${laser.status}`, 60, y);

                // Enhanced capacitor charge display
                if (laser.capacitorCharge !== undefined) {
                    const chargePercent = laser.capacitorCharge * 100;
                    const chargeColor = chargePercent > 80 ? this.palette.primary :
                                       chargePercent > 30 ? this.palette.warning :
                                       this.palette.danger;
                    ctx.fillStyle = chargeColor;
                    ctx.fillText(`[${chargePercent.toFixed(0)}%]`, 260, y);
                }

                y += 18;

                // Recharge rate
                if (laser.capacitorCharge !== undefined && laser.capacitorCharge < 1.0) {
                    ctx.fillStyle = this.palette.muted;
                    ctx.font = '12px "Courier New"';
                    ctx.fillText(`  Recharging...`, 70, y);
                    ctx.font = '14px "Courier New"';
                    y += 18;
                }

                // Hit probability for lasers (nearly 100% if charged)
                if (isSelected && targets.length > 0 && this.selectedTargetIndex < targets.length && laser.ready) {
                    const hitProb = 95; // Lasers are extremely accurate
                    ctx.fillStyle = this.palette.primary;
                    ctx.font = '12px "Courier New"';
                    ctx.fillText(`  Hit Prob: ${hitProb}% (Instant)`, 70, y);
                    ctx.font = '14px "Courier New"';
                    y += 18;
                }

                y += 4;
                weaponIndex++;
            });
        }

        if (weaponsState.particleBeams) {
            weaponsState.particleBeams.forEach((beam: any) => {
                const isSelected = weaponIndex === this.selectedWeaponIndex;
                const statusColor = beam.ready ? this.palette.primary : this.palette.muted;

                ctx.fillStyle = statusColor;
                const marker = isSelected ? '>' : ' ';
                ctx.fillText(`${marker} P-BEAM: ${beam.status}`, 60, y);

                y += 20;
                weaponIndex++;
            });
        }

        // Targets (right side)
        y = 80;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('TARGETS', 450, y);
        y += 25;

        if (targets.length === 0) {
            ctx.fillStyle = this.palette.muted;
            ctx.fillText('No targets detected', 470, y);
        } else {
            targets.slice(0, 10).forEach((target: any, index: number) => {
                const isSelected = index === this.selectedTargetIndex;
                const marker = isSelected ? '>' : ' ';

                // Color by threat level
                let color = this.palette.secondary;
                if (target.threat === 'critical') color = this.palette.danger;
                else if (target.threat === 'high') color = this.palette.warning;
                else if (target.threat === 'medium') color = this.palette.info;

                ctx.fillStyle = color;
                ctx.fillText(`${marker} ${target.type.toUpperCase()}`, 470, y);

                // Distance
                const dx = target.position.x;
                const dy = target.position.y;
                const dz = target.position.z;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

                ctx.fillStyle = this.palette.muted;
                ctx.fillText(`${dist.toFixed(1)}km`, 600, y);

                y += 20;
            });
        }

        // EW/Countermeasures (bottom right)
        y = 400;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('EW / COUNTERMEASURES', 450, y);
        y += 25;

        // EW Jamming
        ctx.fillStyle = this.ewSystemActive ? this.palette.info : this.palette.muted;
        ctx.fillText(`EW Jamming: ${this.ewSystemActive ? 'ACTIVE' : 'OFF'}  (J)`, 470, y);
        y += 20;

        // Get EW state
        const ewState = this.spacecraft.getEWState();
        if (this.ewSystemActive && ewState) {
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(`Power: ${(ewState.jammingPower || 0).toFixed(0)}W`, 490, y);
            y += 18;
            ctx.fillText(`Range: ${((ewState.effectiveRange || 0) / 1000).toFixed(1)}km`, 490, y);
            y += 25;
        } else {
            y += 43;
        }

        // Countermeasures
        ctx.fillStyle = this.countermeasuresArmed ? this.palette.warning : this.palette.muted;
        ctx.fillText(`CM Armed: ${this.countermeasuresArmed ? 'YES' : 'NO'}  (C)`, 470, y);
        y += 20;

        const cmState = this.spacecraft.getCountermeasuresState();
        if (cmState) {
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(`Chaff: ${cmState.chaffCount || 0}`, 490, y);
            y += 18;
            ctx.fillText(`Flares: ${cmState.flareCount || 0}`, 490, y);
            y += 18;
            ctx.fillText(`Deploy: D`, 490, y);
        }

        // Threat assessment (bottom left)
        y = 500;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('THREAT ASSESSMENT', 40, y);
        y += 25;

        if (weaponsState.threatAssessment) {
            const threat = weaponsState.threatAssessment;

            ctx.fillStyle = threat.totalHostiles > 0 ? this.palette.warning : this.palette.secondary;
            ctx.fillText(`Hostiles: ${threat.totalHostiles}`, 60, y);
            y += 20;

            ctx.fillStyle = threat.criticalThreats > 0 ? this.palette.danger : this.palette.secondary;
            ctx.fillText(`Critical: ${threat.criticalThreats}`, 60, y);
            y += 20;

            ctx.fillStyle = threat.incomingMissiles > 0 ? this.palette.danger : this.palette.secondary;
            ctx.fillText(`Incoming: ${threat.incomingMissiles}`, 60, y);
        }

        // Power draw
        const infoY = 620;
        ctx.fillStyle = this.palette.primary;
        const powerDraw = weaponsState.powerDraw || 0;
        ctx.fillText(`Power Draw: ${(powerDraw / 1000).toFixed(1)}kW`, 40, infoY);

        // Keyboard hints
        const hintsY = ctx.canvas.height - 30;
        ctx.fillStyle = this.palette.muted;
        ctx.font = '12px "Courier New"';
        ctx.fillText('S=Safety P=PointDef A=AutoEng W/X=Weapon T=Target F=Fire E=Engage J=EW C/D=CM', 40, hintsY);
    }

    /**
     * Calculate hit probability for kinetic weapons based on distance, relative velocity, and weapon characteristics
     */
    private calculateHitProbability(weapon: any, target: any): number {
        // Calculate distance to target
        const dx = target.position.x;
        const dy = target.position.y;
        const dz = target.position.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz) * 1000; // Convert km to meters

        // Base hit probability by weapon type
        let baseProb = 50;
        if (weapon.type === 'railgun') {
            baseProb = 75; // Railguns are more accurate
        } else if (weapon.type === 'autocannon') {
            baseProb = 60; // Autocannons have decent accuracy
        }

        // Distance factor (probability decreases with distance)
        const maxRange = weapon.maxRange || 1000000; // Default 1000km
        const distanceFactor = 1 - (distance / maxRange);
        const distanceModifier = Math.max(0, Math.min(1, distanceFactor));

        // Relative velocity factor (harder to hit fast-moving targets)
        let relativeVelocityModifier = 1.0;
        if (target.velocity) {
            const relVel = Math.sqrt(
                target.velocity.x ** 2 +
                target.velocity.y ** 2 +
                target.velocity.z ** 2
            );
            // Reduce probability for targets moving > 100 m/s
            if (relVel > 100) {
                relativeVelocityModifier = Math.max(0.3, 1 - ((relVel - 100) / 1000));
            }
        }

        // Target size factor (larger targets are easier to hit)
        let sizeModifier = 1.0;
        if (target.type === 'capital_ship') {
            sizeModifier = 1.2;
        } else if (target.type === 'fighter') {
            sizeModifier = 0.7;
        } else if (target.type === 'missile') {
            sizeModifier = 0.5;
        }

        // Calculate final probability
        let hitProb = baseProb * distanceModifier * relativeVelocityModifier * sizeModifier;

        // Clamp to reasonable range
        hitProb = Math.max(5, Math.min(95, hitProb));

        return hitProb;
    }
}
