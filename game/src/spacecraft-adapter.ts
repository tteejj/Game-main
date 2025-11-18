/**
 * Spacecraft Adapter
 * Bridges the UI to the physics simulation
 */

// @ts-ignore - Import from parent directory physics-modules
import { Spacecraft } from '../../physics-modules/src/spacecraft';

export class SpacecraftAdapter {
    public spacecraft: Spacecraft;
    private updateCallbacks: Array<() => void> = [];

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

    setFuelValve(_open: boolean): void {
        // The main engine doesn't have a separate fuel valve in this implementation
        // Just track it as state if needed by UI
    }

    armIgnition(): void {
        // Arming is implicit in this implementation
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

    toggleBreaker(_index: number, _state: boolean): void {
        // Circuit breakers not exposed by index directly, stub for UI
    }

    toggleRadiators(_deploy: boolean): void {
        // Radiators not implemented as deployable, always active
    }

    // ========== NAVIGATION CONTROLS ==========

    setRadarActive(_active: boolean): void {
        // Radar activation not exposed directly, stub for UI
    }

    setRadarRange(_rangeKm: number): void {
        // Radar range not settable directly, stub for UI
    }

    getAutopilotMode(): string {
        // Autopilot not yet fully implemented, stub for UI
        return 'off';
    }

    setAutopilotMode(_mode: string): void {
        // Autopilot not yet fully implemented, stub for UI
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

    getWeaponsState(): any {
        return this.spacecraft.weapons.getState();
    }

    getWeaponsTargets(): any[] {
        return this.spacecraft.weapons.getState().targets;
    }

    getEWState(): any {
        return this.spacecraft.weapons.getEWState();
    }

    getCountermeasuresState(): any {
        return this.spacecraft.weapons.getCountermeasuresState();
    }

    // ========== TELEMETRY GETTERS ==========

    getState(): any {
        return this.spacecraft.getState();
    }

    getNavigationTelemetry(): any {
        return this.spacecraft.getNavigationTelemetry();
    }

    getMainEngineState(): any {
        return this.spacecraft.mainEngine.getState();
    }

    getElectricalState(): any {
        return this.spacecraft.getState().electrical;
    }

    getThermalState(): any {
        return this.spacecraft.getState().thermal;
    }

    getFuelState(): any {
        return this.spacecraft.getState().fuel;
    }

    getLifeSupportTelemetry(): any {
        return this.spacecraft.getLifeSupportTelemetry();
    }

    getSensorTelemetry(): any {
        return this.spacecraft.getSensorTelemetry();
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

    getLandingGearTelemetry(): any {
        return this.spacecraft.getLandingGearTelemetry();
    }

    // ========== DOCKING CONTROLS ==========

    initiateDocking(portId: string, target: any): boolean {
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

    getDockingGuidance(): any {
        return this.spacecraft.getDockingGuidance();
    }

    getDockingTelemetry(): any {
        return this.spacecraft.getDockingTelemetry();
    }

    // ========== COOLANT/THERMAL CONTROLS ==========

    getCoolantTelemetry(): any {
        return this.spacecraft.getCoolantTelemetry();
    }

    getThermalTelemetry(): any {
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

    getRadarContacts(): any[] {
        return this.spacecraft.getRadarContacts();
    }

    getOpticalContacts(): any[] {
        return this.spacecraft.getOpticalContacts();
    }

    getESMContacts(): any[] {
        return this.spacecraft.getESMContacts();
    }

    setESMMode(passive: boolean): void {
        this.spacecraft.setESMMode(passive);
    }

    // ========== AUTOPILOT/NAV COMPUTER ==========

    plotInterceptCourse(targetPosition: any, targetVelocity: any): any {
        return this.spacecraft.plotInterceptCourse(targetPosition, targetVelocity);
    }

    getNavSolution(): any {
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
