/**
 * WEAPONS Station Panel
 * Fire control, targeting, weapons status, EW/Countermeasures
 * Based on design: 01-CONTROL-STATIONS.md
 */

import { SpacecraftAdapter } from '../../spacecraft-adapter';

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

    constructor(ctx: CanvasRenderingContext2D, palette: any, spacecraft: SpacecraftAdapter) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
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
                // Cycle targets
                const targets = this.spacecraft.getWeaponsTargets();
                if (targets.length > 0) {
                    this.selectedTargetIndex = (this.selectedTargetIndex + 1) % targets.length;
                }
                break;
            case 'f':
                // Fire selected weapon (only if safety off)
                if (!this.weaponsSafetyOn) {
                    this.spacecraft.fireWeapon(this.selectedWeaponIndex, this.selectedTargetIndex);
                    console.log('Weapon fired');
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
        const targets = this.spacecraft.getWeaponsTargets();

        ctx.font = 'bold 20px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText('WEAPONS', 40, 40);

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
        y += 30;

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

                if (weapon.ammo !== undefined) {
                    ctx.fillStyle = this.palette.muted;
                    ctx.fillText(`[${weapon.ammo}]`, 260, y);
                }

                y += 20;
                weaponIndex++;
            });
        }

        // Missile launchers
        if (weaponsState.missileLaunchers) {
            weaponsState.missileLaunchers.forEach((launcher: any) => {
                const isSelected = weaponIndex === this.selectedWeaponIndex;
                const statusColor = launcher.loaded > 0 ? this.palette.primary : this.palette.muted;

                ctx.fillStyle = statusColor;
                const marker = isSelected ? '>' : ' ';
                ctx.fillText(`${marker} MISSILE: ${launcher.loaded}/${launcher.capacity}`, 60, y);

                y += 20;
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

                if (laser.capacitorCharge !== undefined) {
                    ctx.fillStyle = this.palette.muted;
                    ctx.fillText(`[${(laser.capacitorCharge * 100).toFixed(0)}%]`, 260, y);
                }

                y += 20;
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
}
