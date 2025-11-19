/**
 * Spacecraft Adapter
 * Bridges the UI to the physics simulation
 */

// @ts-ignore - Import from parent directory physics-modules
import { Spacecraft } from '../../physics-modules/src/spacecraft';

export class SpacecraftAdapter {
    public spacecraft: Spacecraft;
    private updateCallbacks: Array<() => void> = [];

    // External sensor contacts (injected from game world)
    private externalRadarContacts: Record<string, unknown>[] = [];
    private externalOpticalContacts: Record<string, unknown>[] = [];

    // Terrain data (injected from game world)
    private terrainAltitude: number = 0;
    private terrainSlope: number = 0;
    private surfaceType: string = 'unknown';

    constructor() {
        // Initialize spacecraft at 15km altitude above moon
        this.spacecraft = new Spacecraft({
            shipPhysicsConfig: {
                initialPosition: { x: 0, y: 0, z: 1737400 + 15000 }, // Moon radius + 15km
                initialVelocity: { x: 0, y: 0, z: -40 } // Descending at 40 m/s
            }
        });

        // Start essential systems
        this.initializeSystems();
    }

    private initializeSystems(): void {
        // Start reactor (takes 30 seconds to come online)
        this.spacecraft.startReactor();

        // Start coolant pumps
        this.spacecraft.startCoolantPump(0);
        this.spacecraft.startCoolantPump(1);

        console.log('Spacecraft systems initializing...');
    }

    /**
     * Update physics simulation
     */
    update(deltaTime: number): void {
        this.spacecraft.update(deltaTime);

        // Notify UI of state changes
        this.updateCallbacks.forEach(cb => cb());
    }

    /**
     * Register callback for state updates
     */
    onUpdate(callback: () => void): void {
        this.updateCallbacks.push(callback);
    }

    // ========== HELM / PROPULSION CONTROLS ==========

    setFuelValve(open: boolean): void {
        if (open) {
            this.spacecraft.openMainEngineFuelValve();
        } else {
            this.spacecraft.closeMainEngineFuelValve();
        }
    }

    armIgnition(): void {
        this.spacecraft.armMainEngine();
    }

    fireEngine(): void {
        this.spacecraft.igniteMainEngine();
    }

    cutoffEngine(): void {
        this.spacecraft.shutdownMainEngine();
    }

    setThrottle(percent: number): void {
        this.spacecraft.setMainEngineThrottle(percent / 100);
    }

    setGimbal(x: number, y: number): void {
        // MainEngine.setGimbal takes degrees, not radians
        this.spacecraft.mainEngine.setGimbal(x, y);
    }

    fireRCS(thrusterIndex: number, fire: boolean): void {
        // RCS uses group names, not individual thrusters in this implementation
        // Map to basic groups for now
        const groups = ['bow-port', 'bow-starboard', 'mid-port', 'mid-starboard',
                        'stern-port', 'stern-starboard', 'dorsal', 'ventral'];
        const groupIndex = thrusterIndex % groups.length;
        if (fire) {
            this.spacecraft.activateRCS(groups[groupIndex]);
        } else {
            this.spacecraft.deactivateRCS(groups[groupIndex]);
        }
    }

    // ========== ENGINEERING CONTROLS ==========

    startReactor(): void {
        this.spacecraft.startReactor();
    }

    scramReactor(): void {
        this.spacecraft.electrical.SCRAM(0);
    }

    setReactorThrottle(percent: number): void {
        this.spacecraft.electrical.setReactorThrottle(percent / 100);
    }

    toggleBreaker(index: number, state: boolean): void {
        // Map index to breaker IDs
        const breakerIds = ['main_bus', 'engine', 'rcs', 'radar', 'weapons',
                           'life_support', 'comms', 'thermal', 'aux_1', 'aux_2'];
        if (index >= 0 && index < breakerIds.length) {
            this.spacecraft.setCircuitBreaker(breakerIds[index], state);
        }
    }

    toggleRadiators(deploy: boolean): void {
        if (deploy) {
            this.spacecraft.deployRadiators();
        } else {
            this.spacecraft.retractRadiators();
        }
    }

    // ========== NAVIGATION CONTROLS ==========

    setRadarActive(active: boolean): void {
        this.spacecraft.setRadarActive(active);
    }

    setRadarRange(rangeKm: number): void {
        this.spacecraft.setRadarRange(rangeKm * 1000); // Convert km to meters
    }

    getAutopilotMode(): string {
        return this.spacecraft.getAutopilotMode();
    }

    setAutopilotMode(mode: string): void {
        // Map string mode to AutopilotMode type
        const validModes = ['off', 'altitude_hold', 'vertical_speed_hold',
                           'suicide_burn', 'hover', 'landing', 'docking', 'orbital_insertion'];
        if (validModes.includes(mode)) {
            this.spacecraft.setAutopilotMode(mode as any);
        }
    }

    // ========== NEW AUTOPILOT CONTROLS ==========

    /**
     * Set docking target position for docking autopilot
     */
    setDockingTarget(position: { x: number; y: number; z: number }): void {
        this.spacecraft.flightControl.setDockingTarget(position);
    }

    /**
     * Set target orbit altitude for orbital insertion autopilot
     */
    setTargetOrbitAltitude(altitudeMeters: number): void {
        this.spacecraft.flightControl.setTargetOrbitAltitude(altitudeMeters);
    }

    /**
     * Get autopilot phase information
     */
    getAutopilotPhases(): any {
        const state = this.spacecraft.flightControl.getState();
        return {
            landing: state.landingPhase,
            docking: state.dockingPhase,
            orbitalInsertion: state.orbitalInsertionPhase
        };
    }

    // ========== WEAPONS CONTROLS ==========

    setWeaponsSafety(on: boolean): void {
        this.spacecraft.weapons.weaponsSafety = on;
    }

    setPointDefense(active: boolean): void {
        this.spacecraft.weapons.pointDefenseActive = active;
    }

    setAutoEngageHostiles(auto: boolean): void {
        this.spacecraft.weapons.autoEngageHostiles = auto;
    }

    setEWJamming(active: boolean): void {
        this.spacecraft.weapons.setEWJamming(active);
    }

    setCountermeasuresArmed(armed: boolean): void {
        this.spacecraft.weapons.setCountermeasuresArmed(armed);
    }

    deployCountermeasures(): boolean {
        return this.spacecraft.weapons.deployCountermeasures();
    }

    fireWeapon(_weaponIndex: number, targetIndex: number): void {
        const targets = this.spacecraft.weapons.getState().targets;
        if (targets.length === 0 || targetIndex >= targets.length) {
            console.log('No valid target selected');
            return;
        }

        const target = targets[targetIndex];

        // For now, just engage with the first available weapon type
        this.spacecraft.weapons.engageTarget(target.id, 'kinetic', 'manual');
    }

    engageTarget(targetIndex: number, weaponType: 'kinetic' | 'missile' | 'laser' | 'all'): void {
        const targets = this.spacecraft.weapons.getState().targets;
        if (targets.length === 0 || targetIndex >= targets.length) {
            console.log('No valid target selected');
            return;
        }

        const target = targets[targetIndex];
        this.spacecraft.weapons.engageTarget(target.id, weaponType, 'computer_assisted');
    }

    getWeaponsState(): Record<string, unknown> {
        return this.spacecraft.weapons.getState();
    }

    getWeaponsTargets(): unknown[] {
        return this.spacecraft.weapons.getState().targets as unknown[];
    }

    getEWState(): Record<string, unknown> {
        return this.spacecraft.weapons.getEWState();
    }

    getCountermeasuresState(): Record<string, unknown> {
        return this.spacecraft.weapons.getCountermeasuresState();
    }

    // ========== TELEMETRY GETTERS ==========

    getState(): Record<string, unknown> {
        return this.spacecraft.getState() as Record<string, unknown>;
    }

    getNavigationTelemetry(): Record<string, unknown> {
        return this.spacecraft.getNavigationTelemetry();
    }

    getMainEngineState(): Record<string, unknown> {
        return this.spacecraft.mainEngine.getState();
    }

    getElectricalState(): Record<string, unknown> {
        return this.spacecraft.getState().electrical as Record<string, unknown>;
    }

    getThermalState(): Record<string, unknown> {
        return this.spacecraft.getState().thermal as Record<string, unknown>;
    }

    getFuelState(): Record<string, unknown> {
        return this.spacecraft.getState().fuel as Record<string, unknown>;
    }

    getLifeSupportTelemetry(): Record<string, unknown> {
        return this.spacecraft.getLifeSupportTelemetry();
    }

    getSensorTelemetry(): Record<string, unknown> {
        return this.spacecraft.getSensorTelemetry();
    }

    getHullIntegrity(): number {
        // Calculate hull integrity from environmental system breach data
        // 100% = no breaches, decreases with breach severity
        const breaches = this.getBreachStatus();
        if (breaches.length === 0) {
            return 100;
        }

        // Calculate total damage from all breaches
        let totalDamage = 0;
        for (const breach of breaches) {
            if (breach.breached) {
                // breachSize is 0-1, convert to percentage damage
                totalDamage += breach.breachSize * 100;
            }
        }

        // Hull integrity is 100% minus accumulated damage, minimum 0%
        return Math.max(0, 100 - totalDamage);
    }

    getRadiationDose(): number {
        // Get radiation exposure from environmental system
        const radiation = this.spacecraft.environmental.radiationShielding;
        return radiation.currentRadiationLevel;
    }

    getCumulativeRadiationExposure(): number {
        // Get cumulative radiation from environmental system
        const radiation = this.spacecraft.environmental.radiationShielding;
        return radiation.cumulativeExposure;
    }

    // Apply hull damage (called from collision handler or hazards)
    applyHullDamage(damagePercent: number, location: string = 'compartment_1'): void {
        // Convert damage to breach size (0-1 scale)
        const breachSize = Math.min(1.0, damagePercent / 100);

        // Find the compartment and apply breach
        const compartment = this.spacecraft.environmental.compartments.get(location);
        if (compartment) {
            // Unseal compartment and mark as breached
            compartment.sealed = false;
            compartment.pressurized = false;

            // Update hull integrity tracking
            const hullStatus = this.spacecraft.environmental.hullIntegrity;
            hullStatus.breachDetected = true;
            hullStatus.leakRate += breachSize * 10; // kg/hr per breach size
            hullStatus.micrometeoriteHits += 1;

            console.log(`⚠️  Hull breach in ${location}: ${(breachSize * 100).toFixed(1)}% damage`);
            console.log(`   Leak rate: ${hullStatus.leakRate.toFixed(1)} kg/hr`);
        }
    }

    toggleO2Generator(on: boolean): void {
        this.spacecraft.toggleO2Generator(on);
    }

    toggleCO2Scrubber(on: boolean): void {
        this.spacecraft.toggleCO2Scrubber(on);
    }

    // ========== LANDING GEAR CONTROLS ==========

    deployLandingGear(): boolean {
        return this.spacecraft.deployLandingGear();
    }

    retractLandingGear(): boolean {
        return this.spacecraft.retractLandingGear();
    }

    toggleLandingLights(on: boolean): void {
        this.spacecraft.toggleLandingLights(on);
    }

    activateTerrainRadar(): boolean {
        return this.spacecraft.activateTerrainRadar();
    }

    deactivateTerrainRadar(): void {
        this.spacecraft.deactivateTerrainRadar();
    }

    checkLandingSafety(): { safe: boolean; reasons: string[] } {
        return this.spacecraft.checkLandingSafety();
    }

    getLandingGearTelemetry(): Record<string, unknown> {
        const telemetry = this.spacecraft.getLandingGearTelemetry();

        // Inject external terrain data
        if ((telemetry as any).terrainRadarActive) {
            (telemetry as any).terrainData = {
                altitude: this.terrainAltitude,
                slope: this.terrainSlope,
                surfaceType: this.surfaceType
            };
        }

        return telemetry;
    }

    // ========== DOCKING CONTROLS ==========

    initiateDocking(portId: string, target: Record<string, unknown>): boolean {
        return this.spacecraft.initiateDocking(portId, target);
    }

    attemptDockingCapture(): boolean {
        return this.spacecraft.attemptDockingCapture();
    }

    completeHardDock(): boolean {
        return this.spacecraft.completeHardDock();
    }

    undock(portId: string): boolean {
        return this.spacecraft.undock(portId);
    }

    getDockingGuidance(): Record<string, unknown> {
        return this.spacecraft.getDockingGuidance();
    }

    getDockingTelemetry(): Record<string, unknown> {
        return this.spacecraft.getDockingTelemetry();
    }

    // ========== COOLANT/THERMAL CONTROLS ==========

    getCoolantTelemetry(): Record<string, unknown> {
        return this.spacecraft.getCoolantTelemetry();
    }

    getThermalTelemetry(): Record<string, unknown> {
        return this.spacecraft.getThermalTelemetry();
    }

    toggleCoolantPump(loopId: number, on: boolean): void {
        if (on) {
            this.spacecraft.startCoolantPump(loopId);
        } else {
            this.spacecraft.stopCoolantPump(loopId);
        }
    }

    // ========== LIFE SUPPORT DOOR/BREACH CONTROLS ==========

    toggleBulkheadDoor(comp1Id: string, comp2Id: string): boolean {
        return this.spacecraft.toggleBulkheadDoor(comp1Id, comp2Id);
    }

    sealBreach(compartmentId: string): boolean {
        return this.spacecraft.sealBreach(compartmentId);
    }

    ventCompartment(compartmentId: string): void {
        this.spacecraft.ventCompartment(compartmentId);
    }

    suppressFire(compartmentId: string): boolean {
        return this.spacecraft.suppressFire(compartmentId);
    }

    getDoorStatus(): Array<{ comp1: string; comp2: string; open: boolean }> {
        return this.spacecraft.getDoorStatus();
    }

    getBreachStatus(): Array<{ id: string; breached: boolean; breachSize: number }> {
        return this.spacecraft.getBreachStatus();
    }

    // ========== FUEL TRANSFER/VENTING CONTROLS ==========

    transferFuel(sourceTankId: string, destTankId: string): boolean {
        return this.spacecraft.transferFuel(sourceTankId, destTankId);
    }

    stopFuelTransfer(tankId: string): boolean {
        return this.spacecraft.stopFuelTransfer(tankId);
    }

    emergencyFuelDump(tankId: string, enable: boolean): boolean {
        return this.spacecraft.emergencyFuelDump(tankId, enable);
    }

    getFuelTransferStatus(): Array<{ tankId: string; transferringTo: string | undefined; venting: boolean }> {
        return this.spacecraft.getFuelTransferStatus();
    }

    // ========== SENSOR CONTROLS ==========

    setRadarMode(mode: 'search' | 'track' | 'mapping' | 'off'): void {
        this.spacecraft.setRadarMode(mode);
    }

    setOpticalMode(mode: 'visual' | 'infrared' | 'combined'): void {
        this.spacecraft.setOpticalMode(mode);
    }

    initiateRadarTrack(contactId: string): boolean {
        return this.spacecraft.initiateRadarTrack(contactId);
    }

    dropRadarTrack(contactId: string): void {
        this.spacecraft.dropRadarTrack(contactId);
    }

    getRadarContacts(): Record<string, unknown>[] {
        // Combine internal sensor contacts with external game world contacts
        const internalContacts = this.spacecraft.getRadarContacts();
        return [...internalContacts, ...this.externalRadarContacts];
    }

    getOpticalContacts(): Record<string, unknown>[] {
        // Combine internal sensor contacts with external game world contacts
        const internalContacts = this.spacecraft.getOpticalContacts();
        return [...internalContacts, ...this.externalOpticalContacts];
    }

    // Inject external contacts from game world
    injectRadarContacts(contacts: Record<string, unknown>[]): void {
        this.externalRadarContacts = contacts;
    }

    injectOpticalContacts(contacts: Record<string, unknown>[]): void {
        this.externalOpticalContacts = contacts;
    }

    // Inject terrain data from game world
    injectTerrainData(altitude: number, slope: number, surfaceType: string): void {
        this.terrainAltitude = altitude;
        this.terrainSlope = slope;
        this.surfaceType = surfaceType;
    }

    getTerrainAltitude(): number {
        return this.terrainAltitude;
    }

    getESMContacts(): Record<string, unknown>[] {
        return this.spacecraft.getESMContacts();
    }

    setESMMode(passive: boolean): void {
        this.spacecraft.setESMMode(passive);
    }

    // ========== AUTOPILOT/NAV COMPUTER ==========

    plotInterceptCourse(
        targetPosition: Record<string, unknown>,
        targetVelocity: Record<string, unknown>
    ): Record<string, unknown> {
        return this.spacecraft.plotInterceptCourse(targetPosition, targetVelocity);
    }

    getNavSolution(): Record<string, unknown> {
        return this.spacecraft.getNavSolution();
    }

    // ========== ENGINEERING/COOLANT CONTROLS ==========

    openCoolantCrossConnect(): void {
        this.spacecraft.openCoolantCrossConnect();
    }

    closeCoolantCrossConnect(): void {
        this.spacecraft.closeCoolantCrossConnect();
    }

    getCoolantCrossConnectStatus(): boolean {
        return this.spacecraft.getCoolantCrossConnectStatus();
    }

    toggleCircuitBreaker(breakerId: string, on: boolean): void {
        this.spacecraft.toggleCircuitBreaker(breakerId, on);
    }

    getCircuitBreakers(): Array<{ id: string; name: string; on: boolean; tripped: boolean }> {
        return this.spacecraft.getCircuitBreakers();
    }

    // ========== PHYSICS INTERFACE ==========

    getPosition(): { x: number; y: number; z: number } {
        return this.spacecraft.physics.position;
    }

    setPosition(pos: { x: number; y: number; z: number }): void {
        this.spacecraft.physics.position = pos;
    }

    getVelocity(): { x: number; y: number; z: number } {
        return this.spacecraft.physics.velocity;
    }

    setVelocity(vel: { x: number; y: number; z: number }): void {
        this.spacecraft.physics.velocity = vel;
    }

    applyGravity(gravity: { x: number; y: number; z: number }, deltaTime: number): void {
        // Apply gravitational acceleration to velocity
        this.spacecraft.physics.velocity.x += gravity.x * deltaTime;
        this.spacecraft.physics.velocity.y += gravity.y * deltaTime;
        this.spacecraft.physics.velocity.z += gravity.z * deltaTime;
    }

    isEngineFiring(): boolean {
        const state = this.spacecraft.mainEngine.getState();
        return state.status === 'running' && state.currentThrustN > 0;
    }
}
