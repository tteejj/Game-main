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
    private crewSubMode: 'roster' | 'hire' = 'roster';
    private intelSubMode: 'database' | 'market' = 'database';
    private cargoSubMode: 'manifest' | 'smuggling' = 'manifest';
    private missionSubMode: 'available' | 'active' = 'available';

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

            // Submode switching
            case 'q':
                this.toggleSubMode();
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
            case 'x':
            case 'delete':
                this.executeDeleteAction();
                break;
            case 'p':
                this.executeSecondaryAction();
                break;
        }
    }

    private toggleSubMode(): void {
        switch (this.currentTab) {
            case 'missions':
                this.missionSubMode = this.missionSubMode === 'available' ? 'active' : 'available';
                this.selectedIndex = 0;
                break;
            case 'crew':
                this.crewSubMode = this.crewSubMode === 'roster' ? 'hire' : 'roster';
                this.selectedIndex = 0;
                break;
            case 'intel':
                this.intelSubMode = this.intelSubMode === 'database' ? 'market' : 'database';
                this.selectedIndex = 0;
                break;
            case 'cargo':
                this.cargoSubMode = this.cargoSubMode === 'manifest' ? 'smuggling' : 'manifest';
                this.selectedIndex = 0;
                break;
        }
    }

    private executeAction(): void {
        switch (this.currentTab) {
            case 'missions':
                if (this.missionSubMode === 'available') {
                    const missions = this.playerIntegration.getAvailableMissions();
                    if (this.selectedIndex < missions.length) {
                        const mission = missions[this.selectedIndex];
                        const result = this.playerIntegration.acceptMission(mission.id);
                        console.log(`✅ ${result.message}`);
                    }
                } else {
                    const active = this.playerIntegration.getActiveMissions();
                    if (this.selectedIndex < active.length) {
                        const mission = active[this.selectedIndex];
                        const result = this.playerIntegration.completeMission(mission.id);
                        console.log(`✅ ${result.message}`);
                    }
                }
                break;
            case 'crew':
                if (this.crewSubMode === 'hire') {
                    const available = this.playerIntegration.getAvailableCrewForHire(10);
                    if (this.selectedIndex < available.length) {
                        const crew = available[this.selectedIndex];
                        const result = this.playerIntegration.hireCrew(crew);
                        console.log(`✅ ${result.message}`);
                    }
                }
                // Roster mode has no primary action (use X to fire)
                break;
            case 'research':
                try {
                    const projects = this.playerIntegration.getAvailableResearch();
                    const active = this.playerIntegration.getActiveResearch();
                    if (!active && this.selectedIndex < projects.length) {
                        const project = projects[this.selectedIndex];
                        const projectId = (project as any).techId || (project as any).id || 'unknown';
                        const result = this.playerIntegration.startResearch(projectId);
                        console.log(`🔬 ${result.message}`);
                    }
                } catch (e) {
                    console.error('Research action failed:', e);
                }
                break;
            case 'intel':
                if (this.intelSubMode === 'market') {
                    const intel = this.playerIntegration.getAllIntel();
                    if (this.selectedIndex < intel.length) {
                        const data = intel[this.selectedIndex];
                        const result = this.playerIntegration.sellIntel(data.id);
                        console.log(`💰 ${result.message}`);
                    }
                }
                break;
            case 'cargo':
                if (this.cargoSubMode === 'smuggling') {
                    const contraband = this.playerIntegration.getContraband();
                    if (this.selectedIndex < contraband.length) {
                        const item = contraband[this.selectedIndex];
                        const result = this.playerIntegration.sellContrabandOnBlackMarket(item.commodity);
                        console.log(`🏴‍☠️ ${result.message}`);
                    }
                }
                break;
        }
    }

    private executeDeleteAction(): void {
        switch (this.currentTab) {
            case 'missions':
                if (this.missionSubMode === 'active') {
                    const active = this.playerIntegration.getActiveMissions();
                    if (this.selectedIndex < active.length) {
                        const mission = active[this.selectedIndex];
                        const result = this.playerIntegration.abandonMission(mission.id);
                        console.log(`❌ ${result.message}`);
                    }
                }
                break;
            case 'crew':
                if (this.crewSubMode === 'roster') {
                    const crew = this.playerIntegration.getCrew();
                    if (this.selectedIndex < crew.length) {
                        const member = crew[this.selectedIndex];
                        const result = this.playerIntegration.fireCrew(member.id);
                        console.log(`❌ ${result.message}`);
                    }
                }
                break;
        }
    }

    private executeSecondaryAction(): void {
        switch (this.currentTab) {
            case 'crew':
                if (this.crewSubMode === 'roster') {
                    const result = this.playerIntegration.payCrewSalaries();
                    console.log(`💰 ${result.message}`);
                }
                break;
            case 'cargo':
                if (this.cargoSubMode === 'smuggling') {
                    const result = this.playerIntegration.bribeOfficial();
                    console.log(`💸 ${result.message}`);
                }
                break;
            case 'intel':
                if (this.intelSubMode === 'database') {
                    const result = this.playerIntegration.gatherIntelFromNews();
                    console.log(`📡 ${result.message}`);
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
        let controlsText = '[1-5] Tabs | [Q] Submode | [W/S] Navigate | [ENTER] Accept/Start';
        if (this.currentTab === 'crew' && this.crewSubMode === 'roster') {
            controlsText = '[1-5] Tabs | [Q] Hire Mode | [W/S] Navigate | [X] Fire | [P] Pay Salaries';
        } else if (this.currentTab === 'missions' && this.missionSubMode === 'active') {
            controlsText = '[1-5] Tabs | [Q] Available | [W/S] Navigate | [ENTER] Complete | [X] Abandon';
        } else if (this.currentTab === 'cargo' && this.cargoSubMode === 'smuggling') {
            controlsText = '[1-5] Tabs | [Q] Manifest | [W/S] Navigate | [ENTER] Sell | [P] Bribe';
        } else if (this.currentTab === 'intel') {
            controlsText = '[1-5] Tabs | [Q] Toggle | [W/S] Navigate | [ENTER] Sell | [P] Gather';
        }
        ctx.fillText(controlsText, 40, 700);
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
        const availableMissions = this.playerIntegration.getAvailableMissions();
        const activeMissions = this.playerIntegration.getActiveMissions();

        // Show submode indicator
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillStyle = this.palette.info;
        const modeText = this.missionSubMode === 'available' ? '[AVAILABLE]' : '[ACTIVE]';
        ctx.fillText(modeText, 600, 95);

        if (this.missionSubMode === 'available') {
            // Available missions (full width)
            this.drawBox(40, 100, 1180, 560, 'AVAILABLE MISSIONS - [ENTER] Accept');

            let y = 140;
            ctx.font = '13px "Courier New"';

            availableMissions.slice(0, 10).forEach((mission, i) => {
                const isSelected = i === this.selectedIndex;
                ctx.fillStyle = isSelected ? this.palette.info : this.palette.primary;

                if (isSelected) ctx.fillText('>', 50, y);
                ctx.fillText(mission.title, 70, y);

                ctx.font = '11px "Courier New"';
                ctx.fillStyle = this.palette.secondary;
                ctx.fillText(mission.description.substring(0, 100), 70, y + 15);
                ctx.fillStyle = this.palette.warning;
                ctx.fillText(`Reward: ${mission.creditReward} CR | Type: ${mission.type}`, 70, y + 30);

                ctx.font = '13px "Courier New"';
                y += 52;
            });
        } else {
            // Active missions (full width with details)
            this.drawBox(40, 100, 1180, 560, 'ACTIVE MISSIONS - [ENTER] Complete | [X] Abandon');

            let y = 140;
            ctx.font = '13px "Courier New"';

            activeMissions.forEach((mission, i) => {
                const isSelected = i === this.selectedIndex;
                ctx.fillStyle = isSelected ? this.palette.info : this.palette.primary;

                if (isSelected) ctx.fillText('>', 50, y);
                ctx.fillText(mission.title, 70, y);

                ctx.font = '11px "Courier New"';
                ctx.fillStyle = this.palette.secondary;
                const progressPct = Math.floor((mission.currentObjective / mission.objectives.length) * 100);
                ctx.fillText(`Progress: ${progressPct}% | Reward: ${mission.creditReward} CR`, 70, y + 15);

                // Show current objective
                if (mission.objectives[mission.currentObjective]) {
                    const obj = mission.objectives[mission.currentObjective];
                    ctx.fillText(`Objective: ${obj.description}`, 70, y + 30);
                }

                ctx.font = '13px "Courier New"';
                y += 60;
            });
        }
    }

    private renderCrew(): void {
        const ctx = this.ctx;
        const crew = this.playerIntegration.getCrew();
        const available = this.playerIntegration.getAvailableCrewForHire(10);

        // Show submode indicator
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillStyle = this.palette.info;
        const modeText = this.crewSubMode === 'roster' ? '[ROSTER]' : '[HIRE]';
        ctx.fillText(modeText, 600, 95);

        if (this.crewSubMode === 'roster') {
            // Current crew roster
            this.drawBox(40, 100, 1180, 560, 'CREW ROSTER - [X] Fire | [P] Pay Salaries');

            // Show crew status
            const status = this.playerIntegration.getCrewStatus();
            ctx.font = '12px "Courier New"';
            ctx.fillStyle = this.palette.warning;
            ctx.fillText(`Crew: ${status.count}/${status.capacity} | Salaries: ${status.totalSalaries} CR/day | Morale: ${Math.floor(status.averageMorale * 100)}%`, 60, 125);

            let y = 160;
            ctx.font = '14px "Courier New"';

            crew.forEach((member, i) => {
                const isSelected = i === this.selectedIndex;
                ctx.fillStyle = isSelected ? this.palette.info : this.palette.primary;

                if (isSelected) ctx.fillText('>', 50, y);
                ctx.fillText(`${member.name} - ${member.role}`, 70, y);

                ctx.font = '12px "Courier New"';
                ctx.fillStyle = this.palette.secondary;
                const level = (member as any).skillLevel || (member as any).level || 1;
                const exp = member.experience || 0;
                const expNext = (member as any).experienceForNextLevel || (member as any).nextLevelExp || 100;
                ctx.fillText(`Level ${level} | XP: ${exp}/${expNext}`, 90, y + 18);
                ctx.fillText(`Salary: ${member.salary} CR/day | Morale: ${Math.floor(member.morale * 100)}%`, 90, y + 33);

                // Skills
                const skills = Object.entries(member.skills);
                let skillX = 520;
                skills.forEach(([skill, value]) => {
                    ctx.fillText(`${skill}: ${Math.floor((value as number) * 100)}%`, skillX, y + 18);
                    skillX += 170;
                });

                ctx.font = '14px "Courier New"';
                y += 70;
            });
        } else {
            // Available crew for hire
            this.drawBox(40, 100, 1180, 560, 'HIRE CREW - [ENTER] Hire');

            let y = 140;
            ctx.font = '14px "Courier New"';

            available.forEach((member, i) => {
                const isSelected = i === this.selectedIndex;
                ctx.fillStyle = isSelected ? this.palette.info : this.palette.primary;

                if (isSelected) ctx.fillText('>', 50, y);
                ctx.fillText(`${member.name} - ${member.role}`, 70, y);

                ctx.font = '12px "Courier New"';
                ctx.fillStyle = this.palette.secondary;
                ctx.fillText(`Salary: ${member.salary} CR/day | Hiring bonus: ${Math.floor(member.salary * 10)} CR`, 90, y + 18);

                // Skills
                const skills = Object.entries(member.skills);
                let skillX = 90;
                ctx.fillText('Skills: ', skillX, y + 33);
                skillX += 55;
                skills.forEach(([skill, value]) => {
                    ctx.fillText(`${skill}: ${Math.floor((value as number) * 100)}%`, skillX, y + 33);
                    skillX += 170;
                });

                ctx.font = '14px "Courier New"';
                y += 60;
            });
        }
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
            const activeName = (active as any).techId || (active as any).name || 'Research Project';
            ctx.fillText(activeName, 60, 130);

            // Progress bar
            const progress = (active as any).progress || 0;
            const progressNorm = progress > 1 ? progress / 1000 : progress; // Normalize if needed
            ctx.strokeStyle = this.palette.primary;
            ctx.strokeRect(60, 145, 800, 20);
            ctx.fillStyle = this.palette.info;
            ctx.fillRect(60, 145, 800 * Math.min(1, progressNorm), 20);

            ctx.fillStyle = this.palette.primary;
            ctx.font = '12px "Courier New"';
            ctx.fillText(`${Math.floor(progressNorm * 100)}% complete`, 870, 160);
        }

        // Available
        const availY = active ? 220 : 100;
        this.drawBox(40, availY, 780, active ? 440 : 560, 'AVAILABLE RESEARCH');

        let y = availY + 40;
        ctx.font = '13px "Courier New"';

        available.slice(0, 8).forEach((project: any, i) => {
            const isSelected = i === this.selectedIndex;
            ctx.fillStyle = isSelected ? this.palette.info : this.palette.primary;

            if (isSelected) ctx.fillText('>', 50, y);
            const name = project.techId || project.name || 'Research';
            ctx.fillText(name, 70, y);

            ctx.font = '11px "Courier New"';
            ctx.fillStyle = this.palette.secondary;
            const desc = project.description || 'Advanced research';
            ctx.fillText(desc.substring(0, 60), 70, y + 15);
            const cost = project.cost || project.researchCost || 1000;
            const time = project.timeRequired || 30;
            ctx.fillText(`Cost: ${cost} CR | Time: ${time} days`, 70, y + 30);

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

        // Show submode indicator
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillStyle = this.palette.info;
        const modeText = this.intelSubMode === 'database' ? '[DATABASE]' : '[MARKET]';
        ctx.fillText(modeText, 600, 95);

        if (this.intelSubMode === 'database') {
            this.drawBox(40, 100, 1180, 560, 'INTELLIGENCE DATABASE - [P] Gather from News');

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

            if (intel.length === 0) {
                ctx.fillStyle = this.palette.muted;
                ctx.fillText('No intelligence data. Press [P] to gather from news.', 60, 200);
            }
        } else {
            // Intel market - sell intel
            this.drawBox(40, 100, 1180, 560, 'INTEL MARKET - [ENTER] Sell Selected');

            let y = 140;
            ctx.font = '13px "Courier New"';

            intel.slice(0, 12).forEach((data, i) => {
                const isSelected = i === this.selectedIndex;
                ctx.fillStyle = isSelected ? this.palette.info : this.palette.warning;

                if (isSelected) ctx.fillText('>', 50, y);
                ctx.fillText(`[${data.type}] ${data.location}`, 70, y);

                ctx.font = '11px "Courier New"';
                ctx.fillStyle = this.palette.secondary;
                ctx.fillText(data.content.substring(0, 85), 90, y + 15);
                ctx.fillStyle = this.palette.warning;
                ctx.fillText(`Sell for: ${data.value} CR | Reliability: ${Math.floor(data.reliability * 100)}%`, 90, y + 30);

                ctx.font = '13px "Courier New"';
                y += 52;
            });

            if (intel.length === 0) {
                ctx.fillStyle = this.palette.muted;
                ctx.fillText('No intelligence to sell.', 60, 200);
            }
        }
    }

    private renderCargo(): void {
        const ctx = this.ctx;
        const contraband = this.playerIntegration.getContraband();
        const state = this.playerIntegration.getState();

        // Show submode indicator
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillStyle = this.palette.info;
        const modeText = this.cargoSubMode === 'manifest' ? '[MANIFEST]' : '[SMUGGLING]';
        ctx.fillText(modeText, 600, 95);

        if (this.cargoSubMode === 'manifest') {
            this.drawBox(40, 100, 1180, 560, 'CARGO MANIFEST');

            // Cargo capacity
            ctx.font = '14px "Courier New"';
            ctx.fillStyle = this.palette.primary;
            ctx.fillText(`Capacity: ${state.cargoUsed} / ${state.cargoCapacity} units`, 60, 130);

            let y = 170;
            ctx.font = '13px "Courier New"';

            // Regular cargo
            if (state.cargo.size > 0) {
                ctx.fillStyle = this.palette.info;
                ctx.fillText('LEGITIMATE CARGO:', 60, y);
                y += 30;

                state.cargo.forEach((qty, commodity) => {
                    ctx.fillStyle = this.palette.primary;
                    ctx.fillText(`${commodity}: ${qty} units`, 80, y);
                    y += 25;
                });
            } else {
                ctx.fillStyle = this.palette.muted;
                ctx.fillText('No cargo loaded', 60, y);
                y += 30;
            }

            // Contraband warning
            if (contraband.length > 0) {
                y += 20;
                ctx.fillStyle = this.palette.danger;
                ctx.fillText('⚠ CONTRABAND DETECTED:', 60, y);
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
        } else {
            // Smuggling operations
            this.drawBox(40, 100, 1180, 560, 'SMUGGLING OPERATIONS - [ENTER] Sell | [P] Bribe Official');

            let y = 140;
            ctx.font = '13px "Courier New"';

            if (contraband.length > 0) {
                contraband.forEach((item, i) => {
                    const isSelected = i === this.selectedIndex;
                    ctx.fillStyle = isSelected ? this.palette.info : this.palette.danger;

                    if (isSelected) ctx.fillText('>', 50, y);
                    ctx.fillText(`${item.commodity}: ${item.quantity} units`, 70, y);

                    ctx.font = '11px "Courier New"';
                    ctx.fillStyle = this.palette.secondary;
                    ctx.fillText(`Illegal in: ${item.illegalIn.join(', ')}`, 90, y + 15);
                    ctx.fillStyle = this.palette.warning;
                    const blackMarketPrice = Math.floor(item.quantity * 500 * (1 + Math.random()));
                    ctx.fillText(`Black market value: ~${blackMarketPrice} CR`, 90, y + 30);

                    ctx.font = '13px "Courier New"';
                    y += 52;
                });

                // Bribe info
                y += 30;
                ctx.fillStyle = this.palette.muted;
                ctx.font = '12px "Courier New"';
                ctx.fillText('⚠ Warning: Contraband detected during station scans will result in fines and reputation loss', 60, y);
                ctx.fillText('Press [P] to attempt to bribe inspection official (costs 1000 CR, 60% success rate)', 60, y + 20);
            } else {
                ctx.fillStyle = this.palette.muted;
                ctx.fillText('No contraband in cargo hold', 60, 200);
            }
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
