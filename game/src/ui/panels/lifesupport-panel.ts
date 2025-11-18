/**
 * LIFE SUPPORT / ENVIRONMENTAL Station
 * Atmosphere management, compartments, fire suppression
 * Based on design: 01-CONTROL-STATIONS.md
 */

import { SpacecraftAdapter } from '../../spacecraft-adapter';

export class LifeSupportPanel {
    private ctx: CanvasRenderingContext2D;
    private palette: any;
    private spacecraft: SpacecraftAdapter;

    // State
    private selectedCompartment: number = 5; // Center compartment
    // Removed unused state variables - to be re-added when functionality is implemented

    constructor(ctx: CanvasRenderingContext2D, palette: any, spacecraft: SpacecraftAdapter) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
    }

    handleInput(key: string): void {
        const keyLower = key.toLowerCase();
        const lifeSupport = this.spacecraft.getLifeSupportTelemetry();
        const compartmentId = this.getCompartmentId(this.selectedCompartment);

        switch (keyLower) {
            case '1': case '2': case '3': case '4': case '5': case '6':
                this.selectedCompartment = parseInt(key);
                console.log(`Selected compartment: ${this.selectedCompartment}`);
                break;
            case 'o':
                this.spacecraft.toggleO2Generator(!lifeSupport.o2GeneratorOn);
                console.log(`O2 Generator: ${!lifeSupport.o2GeneratorOn ? 'ON' : 'OFF'}`);
                break;
            case 's':
                this.spacecraft.toggleCO2Scrubber(!lifeSupport.co2ScrubberOn);
                console.log(`CO2 Scrubber: ${!lifeSupport.co2ScrubberOn ? 'ON' : 'OFF'}`);
                break;
            case 'd':
                // Toggle door - prompt for adjacent compartment
                // For now, toggle all doors connected to selected compartment
                const adjacentComps = this.getAdjacentCompartments(this.selectedCompartment);
                if (adjacentComps.length > 0) {
                    const adjId = this.getCompartmentId(adjacentComps[0]);
                    this.spacecraft.toggleBulkheadDoor(compartmentId, adjId);
                    console.log(`Toggled door between ${compartmentId} and ${adjId}`);
                }
                break;
            case 'b':
                // Seal breach in selected compartment
                const sealed = this.spacecraft.sealBreach(compartmentId);
                console.log(sealed ? `Breach sealed in ${compartmentId}` : `No breach to seal in ${compartmentId}`);
                break;
            case 'v':
                // Vent compartment to space
                this.spacecraft.ventCompartment(compartmentId);
                console.log(`Venting ${compartmentId} to space...`);
                break;
            case 'f':
                // Suppress fire
                const suppressed = this.spacecraft.suppressFire(compartmentId);
                console.log(suppressed ? `Fire suppressed in ${compartmentId}` : `No fire in ${compartmentId}`);
                break;
        }
    }

    private getCompartmentId(compNum: number): string {
        const compartmentNames = ['bow', 'bridge', 'engineering', 'port', 'center', 'stern'];
        return compartmentNames[compNum - 1] || 'center';
    }

    private getAdjacentCompartments(compNum: number): number[] {
        const adjacency: { [key: number]: number[] } = {
            1: [2, 4],  // bow -> bridge, port
            2: [1, 3, 5],  // bridge -> bow, engineering, center
            3: [2, 6],  // engineering -> bridge, stern
            4: [1, 5],  // port -> bow, center
            5: [2, 4, 6],  // center -> bridge, port, stern
            6: [3, 5]   // stern -> engineering, center
        };
        return adjacency[compNum] || [];
    }

    render(): void {
        const ctx = this.ctx;
        const lifeSupport = this.spacecraft.getLifeSupportTelemetry();

        ctx.font = 'bold 20px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText('LIFE SUPPORT', 40, 40);

        ctx.font = '14px "Courier New"';

        // Ship layout diagram
        let y = 80;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('SHIP LAYOUT (6 COMPARTMENTS)', 40, y);
        y += 30;
        ctx.fillText('[1]──[2]──[3]', 60, y);
        y += 25;
        ctx.fillText(' │    │    │', 60, y);
        y += 25;
        ctx.fillText('[4]──[5]──[6]', 60, y);
        y += 30;
        ctx.fillStyle = this.palette.secondary;
        ctx.fillText('1=Bow   2=Bridge  3=Engineering', 60, y);
        y += 20;
        ctx.fillText('4=Port  5=Center  6=Stern', 60, y);

        // Selected compartment display
        y += 50;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText(`COMPARTMENT: #${this.selectedCompartment}  (1-6 to select)`, 40, y);
        y += 30;

        // Atmosphere readings
        ctx.fillText('ATMOSPHERE', 60, y);
        y += 25;
        const o2Color = lifeSupport.o2Percent < 19 ? this.palette.warning : this.palette.primary;
        ctx.fillStyle = o2Color;
        ctx.fillText(`O2:    ${lifeSupport.o2Percent}%  (NORM: 21%)`, 80, y);
        y += 20;
        ctx.fillStyle = this.palette.secondary;
        ctx.fillText(`CO2:   ${lifeSupport.co2Percent}%  (NORM: <1%)`, 80, y);
        y += 20;
        ctx.fillText(`PRESS: ${lifeSupport.pressure}kPa  (NORM: 101kPa)`, 80, y);
        y += 20;
        ctx.fillText(`TEMP:  ${lifeSupport.temperature}K  (NORM: 293K)`, 80, y);

        // Compartment status
        y += 50;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('COMPARTMENT STATUS', 40, y);
        y += 25;

        const compartmentId = this.getCompartmentId(this.selectedCompartment);
        const breachStatus = this.spacecraft.getBreachStatus();
        const doorStatus = this.spacecraft.getDoorStatus();
        const compartmentBreach = breachStatus.find(b => b.id === compartmentId);

        // Breach status
        if (compartmentBreach && compartmentBreach.breached) {
            ctx.fillStyle = this.palette.danger;
            const breachPercent = (compartmentBreach.breachSize * 100).toFixed(1);
            ctx.fillText(`⚠ HULL BREACH: ${breachPercent}%  (B=Seal)`, 60, y);
            y += 25;
        } else {
            ctx.fillStyle = this.palette.primary;
            ctx.fillText(`Hull: INTACT`, 60, y);
            y += 25;
        }

        // Door status for adjacent compartments
        const adjacentComps = this.getAdjacentCompartments(this.selectedCompartment);
        ctx.fillStyle = this.palette.secondary;
        ctx.fillText('Doors:  (D=Toggle)', 60, y);
        y += 20;
        adjacentComps.forEach(adjNum => {
            const adjId = this.getCompartmentId(adjNum);
            const door = doorStatus.find(d =>
                (d.comp1 === compartmentId && d.comp2 === adjId) ||
                (d.comp2 === compartmentId && d.comp1 === adjId)
            );
            const doorOpen = door ? door.open : false;
            const doorColor = doorOpen ? this.palette.primary : this.palette.warning;
            ctx.fillStyle = doorColor;
            ctx.fillText(`  → ${adjId}: ${doorOpen ? 'OPEN' : 'CLOSED'}`, 80, y);
            y += 18;
        });

        // Global systems
        y += 30;
        ctx.fillStyle = this.palette.primary;
        ctx.fillText('GLOBAL SYSTEMS', 40, y);
        y += 25;
        ctx.fillStyle = lifeSupport.o2GeneratorOn ? this.palette.primary : this.palette.danger;
        ctx.fillText(`O2 Generator: ${lifeSupport.o2GeneratorOn ? 'ON' : 'OFF'}  (O)`, 60, y);
        y += 25;
        ctx.fillStyle = lifeSupport.co2ScrubberOn ? this.palette.primary : this.palette.danger;
        ctx.fillText(`CO2 Scrubber: ${lifeSupport.co2ScrubberOn ? 'ON' : 'OFF'}  (S)`, 60, y);

        // Keyboard hints
        const hintsY = ctx.canvas.height - 30;
        ctx.fillStyle = this.palette.muted;
        ctx.font = '12px "Courier New"';
        ctx.fillText('1-6=Comp  O=O2  S=Scrub  D=Door  B=SealBreach  V=Vent  F=Fire', 40, hintsY);
    }
}
