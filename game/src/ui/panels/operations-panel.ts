/**
 * OPERATIONS Station (Station 6)
 * Missions, Crew, Research, Intelligence, Cargo
 * Integrates PlayerShipIntegration with station UI
 */

import { SpacecraftAdapter } from '../../spacecraft-adapter';
import { PlayerShipIntegration } from '../../../../universe-system/src/PlayerShipIntegration';

export class OperationsPanel {
    private ctx: CanvasRenderingContext2D;
    private palette: any;
    private spacecraft: SpacecraftAdapter;
    private playerIntegration: PlayerShipIntegration;

    // UI State
    private currentTab: 'missions' | 'crew' | 'research' | 'intel' | 'cargo' = 'missions';
    private selectedIndex: number = 0;
    private scrollOffset: number = 0;

    constructor(ctx: CanvasRenderingContext2D, palette: any, spacecraft: SpacecraftAdapter, playerIntegration: PlayerShipIntegration) {
        this.ctx = ctx;
        this.palette = palette;
        this.spacecraft = spacecraft;
        this.playerIntegration = playerIntegration;
    }

    handleInput(key: string): void {
        const keyLower = key.toLowerCase();

        // Tab switching: 1=Missions, 2=Crew, 3=Research, 4=Intel, 5=Cargo
        switch (keyLower) {
            case '1':
                this.currentTab = 'missions';
                this.selectedIndex = 0;
                console.log('Operations: MISSIONS');
                break;
            case '2':
                this.currentTab = 'crew';
                this.selectedIndex = 0;
                console.log('Operations: CREW');
                break;
            case '3':
                this.currentTab = 'research';
                this.selectedIndex = 0;
                console.log('Operations: RESEARCH');
                break;
            case '4':
                this.currentTab = 'intel';
                this.selectedIndex = 0;
                console.log('Operations: INTEL');
                break;
            case '5':
                this.currentTab = 'cargo';
                this.selectedIndex = 0;
                console.log('Operations: CARGO');
                break;

            // Navigation
            case 'w':
            case 'arrowup':
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                break;
            case 's':
            case 'arrowdown':
                this.selectedIndex++;
                break;

            // Actions
            case 'enter':
            case 'e':
                this.executeAction();
                break;
        }
    }

    private executeAction(): void {
        switch (this.currentTab) {
            case 'missions':
                const missions = this.playerIntegration.getAvailableMissions();
                if (this.selectedIndex < missions.length) {
                    const mission = missions[this.selectedIndex];
                    this.playerIntegration.acceptMission(mission.id);
                    console.log(`✅ Mission accepted: ${mission.title}`);
                }
                break;
            case 'research':
                const projects = this.playerIntegration.getAvailableResearch();
                const active = this.playerIntegration.getActiveResearch();
                if (!active && this.selectedIndex < projects.length) {
                    const project = projects[this.selectedIndex];
                    const state = this.playerIntegration.getState();
                    this.playerIntegration.startResearch(project.id, state.credits);
                    console.log(`🔬 Research started: ${project.name}`);
                }
                break;
        }
    }

    render(): void {
        const ctx = this.ctx;

        // Title
        ctx.font = 'bold 20px "Courier New"';
        ctx.fillStyle = this.palette.info;
        ctx.fillText('OPERATIONS', 40, 40);

        // Tab bar
        this.renderTabBar();

        // Content based on current tab
        switch (this.currentTab) {
            case 'missions':
                this.renderMissions();
                break;
            case 'crew':
                this.renderCrew();
                break;
            case 'research':
                this.renderResearch();
                break;
            case 'intel':
                this.renderIntel();
                break;
            case 'cargo':
                this.renderCargo();
                break;
        }

        // Controls hint
        ctx.font = '12px "Courier New"';
        ctx.fillStyle = this.palette.muted;
        ctx.fillText('[1-5] Tabs | [W/S] Navigate | [ENTER] Accept/Start', 40, 700);
    }

    private renderTabBar(): void {
        const ctx = this.ctx;
        const tabs = ['MISSIONS', 'CREW', 'RESEARCH', 'INTEL', 'CARGO'];
        const tabKeys = ['missions', 'crew', 'research', 'intel', 'cargo'];

        let x = 40;
        ctx.font = '14px "Courier New"';

        tabs.forEach((tab, i) => {
            const isActive = this.currentTab === tabKeys[i];
            ctx.fillStyle = isActive ? this.palette.info : this.palette.muted;
            ctx.fillText(`[${i+1}] ${tab}`, x, 80);
            x += 150;
        });
    }

    private renderMissions(): void {
        const ctx = this.ctx;
        const missions = this.playerIntegration.getAvailableMissions();
        const activeMissions = this.playerIntegration.getActiveMissions();

        // Available missions (left)
        this.drawBox(40, 100, 580, 560, 'AVAILABLE MISSIONS');

        let y = 130;
        ctx.font = '13px "Courier New"';

        missions.slice(0, 10).forEach((mission, i) => {
            const isSelected = i === this.selectedIndex;
            ctx.fillStyle = isSelected ? this.palette.info : this.palette.primary;

            if (isSelected) ctx.fillText('>', 50, y);
            ctx.fillText(mission.title, 70, y);

            ctx.font = '11px "Courier New"';
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(mission.description.substring(0, 55), 70, y + 15);
            ctx.fillStyle = this.palette.warning;
            ctx.fillText(`${mission.creditReward} CR | ${mission.type}`, 70, y + 30);

            ctx.font = '13px "Courier New"';
            y += 52;
        });

        // Active missions (right)
        this.drawBox(640, 100, 580, 560, 'ACTIVE MISSIONS');

        y = 130;
        activeMissions.forEach(mission => {
            ctx.fillStyle = this.palette.primary;
            ctx.fillText(`• ${mission.title}`, 660, y);

            ctx.font = '11px "Courier New"';
            ctx.fillStyle = this.palette.secondary;
            const progressPct = Math.floor((mission.currentObjective / mission.objectives.length) * 100);
            ctx.fillText(`Progress: ${progressPct}%`, 670, y + 15);

            ctx.font = '13px "Courier New"';
            y += 45;
        });
    }

    private renderCrew(): void {
        const ctx = this.ctx;
        const crew = this.playerIntegration.getCrew();

        this.drawBox(40, 100, 1180, 560, 'CREW ROSTER');

        let y = 140;
        ctx.font = '14px "Courier New"';

        crew.forEach(member => {
            ctx.fillStyle = this.palette.primary;
            ctx.fillText(`${member.name} - ${member.role}`, 60, y);

            ctx.font = '12px "Courier New"';
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(`Level ${member.skillLevel} | XP: ${member.experience}/${member.experienceForNextLevel}`, 80, y + 18);
            ctx.fillText(`Salary: ${member.salary} CR/day | Morale: ${Math.floor(member.morale * 100)}%`, 80, y + 33);

            // Skills
            const skills = Object.entries(member.skills);
            let skillX = 500;
            skills.forEach(([skill, value]) => {
                ctx.fillText(`${skill}: ${Math.floor(value * 100)}%`, skillX, y + 18);
                skillX += 150;
            });

            ctx.font = '14px "Courier New"';
            y += 65;
        });
    }

    private renderResearch(): void {
        const ctx = this.ctx;
        const available = this.playerIntegration.getAvailableResearch();
        const active = this.playerIntegration.getActiveResearch();
        const completed = this.playerIntegration.getCompletedResearch();

        // Active research
        if (active) {
            this.drawBox(40, 100, 1180, 100, 'ACTIVE RESEARCH');
            ctx.font = '14px "Courier New"';
            ctx.fillStyle = this.palette.info;
            ctx.fillText(active.name, 60, 130);

            // Progress bar
            const progress = active.progress || 0;
            ctx.strokeStyle = this.palette.primary;
            ctx.strokeRect(60, 145, 800, 20);
            ctx.fillStyle = this.palette.info;
            ctx.fillRect(60, 145, 800 * progress, 20);

            ctx.fillStyle = this.palette.primary;
            ctx.font = '12px "Courier New"';
            ctx.fillText(`${Math.floor(progress * 100)}% complete`, 870, 160);
        }

        // Available
        const availY = active ? 220 : 100;
        this.drawBox(40, availY, 780, active ? 440 : 560, 'AVAILABLE RESEARCH');

        let y = availY + 40;
        ctx.font = '13px "Courier New"';

        available.slice(0, 8).forEach((project, i) => {
            const isSelected = i === this.selectedIndex;
            ctx.fillStyle = isSelected ? this.palette.info : this.palette.primary;

            if (isSelected) ctx.fillText('>', 50, y);
            ctx.fillText(project.name, 70, y);

            ctx.font = '11px "Courier New"';
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(project.description.substring(0, 60), 70, y + 15);
            ctx.fillText(`Cost: ${project.cost} CR | Time: ${project.timeRequired} days`, 70, y + 30);

            ctx.font = '13px "Courier New"';
            y += 50;
        });

        // Completed
        this.drawBox(840, availY, 380, active ? 440 : 560, 'COMPLETED');

        y = availY + 40;
        ctx.font = '12px "Courier New"';
        completed.forEach(id => {
            ctx.fillStyle = this.palette.primary;
            ctx.fillText(`✓ ${id}`, 860, y);
            y += 22;
        });
    }

    private renderIntel(): void {
        const ctx = this.ctx;
        const intel = this.playerIntegration.getAllIntel();

        this.drawBox(40, 100, 1180, 560, 'INTELLIGENCE DATABASE');

        let y = 140;
        ctx.font = '13px "Courier New"';

        intel.slice(0, 12).forEach(data => {
            ctx.fillStyle = this.palette.warning;
            ctx.fillText(`[${data.type}] ${data.location}`, 60, y);

            ctx.font = '11px "Courier New"';
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText(data.content.substring(0, 90), 80, y + 15);
            ctx.fillText(`Value: ${data.value} CR | Reliability: ${Math.floor(data.reliability * 100)}%`, 80, y + 30);

            ctx.font = '13px "Courier New"';
            y += 50;
        });
    }

    private renderCargo(): void {
        const ctx = this.ctx;
        const contraband = this.playerIntegration.getContraband();
        const state = this.playerIntegration.getState();

        this.drawBox(40, 100, 1180, 560, 'CARGO MANIFEST');

        // Cargo capacity
        ctx.font = '14px "Courier New"';
        ctx.fillStyle = this.palette.primary;
        ctx.fillText(`Capacity: ${state.cargoUsed} / ${state.cargoCapacity} units`, 60, 130);

        let y = 170;
        ctx.font = '13px "Courier New"';

        // Regular cargo
        state.cargo.forEach((qty, commodity) => {
            ctx.fillStyle = this.palette.primary;
            ctx.fillText(`${commodity}: ${qty} units`, 60, y);
            y += 25;
        });

        // Contraband
        if (contraband.length > 0) {
            y += 20;
            ctx.fillStyle = this.palette.danger;
            ctx.fillText('⚠ CONTRABAND:', 60, y);
            y += 30;

            contraband.forEach(item => {
                ctx.fillStyle = this.palette.danger;
                ctx.fillText(`${item.commodity}: ${item.quantity} units`, 80, y);
                ctx.font = '11px "Courier New"';
                ctx.fillStyle = this.palette.secondary;
                ctx.fillText(`Illegal in: ${item.illegalIn.join(', ')}`, 100, y + 15);
                ctx.font = '13px "Courier New"';
                y += 40;
            });
        }
    }

    private drawBox(x: number, y: number, w: number, h: number, title: string): void {
        const ctx = this.ctx;

        ctx.strokeStyle = this.palette.primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        if (title) {
            ctx.fillStyle = this.palette.primary;
            ctx.font = 'bold 14px "Courier New"';
            ctx.fillText(title, x + 10, y - 5);
        }
    }
}
