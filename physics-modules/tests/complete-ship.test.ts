/**
 * Complete Ship Tests
 *
 * Comprehensive tests for the CompleteShip unified implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompleteShip, CompleteSimulation, CompleteShipConfig } from '../src/complete-ship';
import { World, CelestialBodyFactory } from '../src/world';
import { WeaponType } from '../src/weapons';
import { MaterialType } from '../src/hull-damage';
import { PowerSourceType, PowerPriority } from '../src/power-budget';
import { CrewStatus } from '../src/life-support';
import { SystemType, SystemStatus } from '../src/system-damage';

describe('CompleteShip', () => {
  let world: World;
  let moon: any;

  beforeEach(() => {
    world = new World();
    moon = CelestialBodyFactory.createMoon();
    world.addBody(moon);
  });

  function createMinimalShipConfig(position: any, velocity: any): CompleteShipConfig {
    return {
      name: 'Test Ship',
      class: 'Test-class',
      mass: 10000,
      radius: 10,
      position,
      velocity,
      orientation: { w: 1, x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },

      compartments: [{
        id: 'main',
        name: 'Main',
        volume: 100,
        pressure: 101325,
        atmosphereIntegrity: 1.0,
        structuralIntegrity: 1.0,
        breaches: [],
        systems: [],
        connectedCompartments: []
      }],

      armorLayers: [{
        id: 'armor',
        material: MaterialType.STEEL,
        thickness: 0.02,
        hardness: 500,
        density: 7850,
        integrity: 1.0,
        ablationDepth: 0
      }],

      powerSources: [{
        id: 'reactor',
        type: PowerSourceType.REACTOR,
        maxOutput: 50,
        currentOutput: 0,
        efficiency: 0.9,
        powered: true
      }],

      powerConsumers: [{
        id: 'life-support',
        name: 'Life Support',
        powerDraw: 5,
        priority: PowerPriority.CRITICAL,
        powered: true,
        actualPower: 0
      }],

      batteries: [{
        id: 'battery',
        capacity: 100,
        currentCharge: 80,
        maxChargeRate: 20,
        maxDischargeRate: 30,
        efficiency: 0.95
      }],

      thermalComponents: [],
      thermalCompartments: [{
        id: 'main',
        name: 'Main',
        temperature: 293,
        volume: 100,
        airMass: 120,
        connectedCompartments: []
      }],
      coolingSystems: [],

      systems: [{
        id: 'reactor-sys',
        name: 'Reactor',
        type: SystemType.POWER,
        compartmentId: 'main',
        integrity: 1.0,
        status: SystemStatus.ONLINE,
        powerDraw: 0,
        operational: true,
        isCritical: true
      }],

      crew: [{
        id: 'pilot',
        name: 'Pilot',
        location: 'main',
        health: 1.0,
        oxygenLevel: 1.0,
        status: CrewStatus.HEALTHY
      }],

      lifeSupport: {
        oxygenGenerationRate: 0.5,
        co2ScrubberRate: 0.5,
        powered: true
      },

      weapons: []
    };
  }

  describe('Ship Creation and Identity', () => {
    it('should create a ship with all subsystems', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);

      expect(ship.name).toBe('Test Ship');
      expect(ship.class).toBe('Test-class');
      expect(ship.id).toBeDefined();
      expect(ship.getId()).toBe(ship.id);
    });

    it('should have all subsystems initialized', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);

      expect(ship.hull).toBeDefined();
      expect(ship.power).toBeDefined();
      expect(ship.thermal).toBeDefined();
      expect(ship.lifeSupport).toBeDefined();
      expect(ship.systemDamage).toBeDefined();
      expect(ship.damageControl).toBeDefined();
      expect(ship.combatComputer).toBeDefined();
    });

    it('should exist as celestial body in world', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);
      const worldBody = ship.getWorldBody();

      expect(worldBody).toBeDefined();
      expect(worldBody.mass).toBe(10000);
      expect(worldBody.radius).toBe(10);
    });
  });

  describe('Physics Integration', () => {
    it('should update position based on velocity', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 100, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);
      const initialPos = ship.getPosition();

      ship.update(1);

      const newPos = ship.getPosition();
      expect(newPos.x).toBeGreaterThan(initialPos.x);
    });

    it('should apply gravity from moon', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);
      const initialZ = ship.getPosition().z;

      for (let i = 0; i < 10; i++) {
        ship.update(1);
      }

      // Should fall toward moon
      expect(ship.getPosition().z).toBeLessThan(initialZ);
      expect(ship.getVelocity().z).toBeLessThan(0);
    });

    it('should respond to applied forces', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);

      ship.applyForce({ x: 100000, y: 0, z: 0 });
      ship.update(1);

      expect(ship.getVelocity().x).toBeGreaterThan(0);
    });

    it('should respond to impulses', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);

      ship.applyImpulse({ x: 100, y: 0, z: 0 });

      expect(ship.getVelocity().x).toBeGreaterThan(0);
    });
  });

  describe('Subsystems Integration', () => {
    it('should update power system', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);

      ship.update(0.1);

      const stats = ship.power.getStatistics();
      expect(stats.totalGeneration).toBeGreaterThan(0);
    });

    it('should update thermal system', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);

      ship.update(0.1);

      const stats = ship.thermal.getStatistics();
      expect(stats.averageTemperature).toBeGreaterThan(0);
    });

    it('should update life support system', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);

      ship.update(1);

      const stats = ship.lifeSupport.getStatistics();
      expect(stats.healthyCrew).toBe(1);
    });
  });

  describe('Weapon System', () => {
    it('should add and retrieve weapons', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);

      ship.addWeapon({
        id: 'railgun',
        type: WeaponType.RAILGUN,
        mountPoint: { x: 5, y: 0, z: 0 },
        aimDirection: { x: 1, y: 0, z: 0 },
        damage: 5000000,
        projectileSpeed: 3000,
        projectileMass: 2,
        range: 50000,
        rateOfFire: 10,
        powerDraw: 10000,
        heatGeneration: 2000000,
        ammoCapacity: 100,
        ammoRemaining: 100,
        cooldown: 0,
        compartmentId: 'main'
      });

      const weapons = ship.getWeapons();
      expect(weapons.length).toBe(1);
      expect(weapons[0].id).toBe('railgun');

      const weapon = ship.getWeapon('railgun');
      expect(weapon).toBeDefined();
      expect(weapon?.type).toBe(WeaponType.RAILGUN);
    });

    it('should fire weapon and create projectile', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );
      config.weapons = [{
        id: 'railgun',
        type: WeaponType.RAILGUN,
        mountPoint: { x: 5, y: 0, z: 0 },
        aimDirection: { x: 1, y: 0, z: 0 },
        damage: 5000000,
        projectileSpeed: 3000,
        projectileMass: 2,
        range: 50000,
        rateOfFire: 10,
        powerDraw: 10000,
        heatGeneration: 2000000,
        ammoCapacity: 100,
        ammoRemaining: 100,
        cooldown: 0,
        compartmentId: 'main'
      }];

      const ship = new CompleteShip(config, world);

      const result = ship.fireWeapon('railgun', { x: 1, y: 0, z: 0 });

      expect(result.success).toBe(true);
      expect(result.projectile).toBeDefined();
    });

    it('should emit weaponFired event', (done) => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );
      config.weapons = [{
        id: 'railgun',
        type: WeaponType.RAILGUN,
        mountPoint: { x: 5, y: 0, z: 0 },
        aimDirection: { x: 1, y: 0, z: 0 },
        damage: 5000000,
        projectileSpeed: 3000,
        projectileMass: 2,
        range: 50000,
        rateOfFire: 10,
        powerDraw: 10000,
        heatGeneration: 2000000,
        ammoCapacity: 100,
        ammoRemaining: 100,
        cooldown: 0,
        compartmentId: 'main'
      }];

      const ship = new CompleteShip(config, world);

      ship.on('weaponFired', (result) => {
        expect(result.success).toBe(true);
        expect(result.projectile).toBeDefined();
        done();
      });

      ship.fireWeapon('railgun', { x: 1, y: 0, z: 0 });
    });
  });

  describe('Status Reporting', () => {
    it('should return complete status', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);
      ship.update(0.1);

      const status = ship.getStatus();

      expect(status.ship).toBeDefined();
      expect(status.ship.id).toBe(ship.id);
      expect(status.ship.hullIntegrity).toBeCloseTo(1.0);

      expect(status.power).toBeDefined();
      expect(status.power.generation).toBeGreaterThanOrEqual(0);

      expect(status.thermal).toBeDefined();
      expect(status.lifeSupport).toBeDefined();
      expect(status.damage).toBeDefined();
      expect(status.weapons).toBeDefined();
    });

    it('should report hull integrity correctly', () => {
      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = new CompleteShip(config, world);

      expect(ship.getHullIntegrity()).toBeCloseTo(1.0);
    });
  });
});

describe('CompleteSimulation', () => {
  let world: World;
  let moon: any;

  beforeEach(() => {
    world = new World();
    moon = CelestialBodyFactory.createMoon();
    world.addBody(moon);
  });

  function createMinimalShipConfig(position: any, velocity: any): CompleteShipConfig {
    return {
      name: 'Test Ship',
      class: 'Test-class',
      mass: 10000,
      radius: 10,
      position,
      velocity,
      orientation: { w: 1, x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },

      compartments: [{
        id: 'main',
        name: 'Main',
        volume: 100,
        pressure: 101325,
        atmosphereIntegrity: 1.0,
        structuralIntegrity: 1.0,
        breaches: [],
        systems: [],
        connectedCompartments: []
      }],

      armorLayers: [{
        id: 'armor',
        material: MaterialType.STEEL,
        thickness: 0.02,
        hardness: 500,
        density: 7850,
        integrity: 1.0,
        ablationDepth: 0
      }],

      powerSources: [{
        id: 'reactor',
        type: PowerSourceType.REACTOR,
        maxOutput: 50,
        currentOutput: 0,
        efficiency: 0.9,
        powered: true
      }],

      powerConsumers: [{
        id: 'life-support',
        name: 'Life Support',
        powerDraw: 5,
        priority: PowerPriority.CRITICAL,
        powered: true,
        actualPower: 0
      }],

      batteries: [{
        id: 'battery',
        capacity: 100,
        currentCharge: 80,
        maxChargeRate: 20,
        maxDischargeRate: 30,
        efficiency: 0.95
      }],

      thermalComponents: [],
      thermalCompartments: [{
        id: 'main',
        name: 'Main',
        temperature: 293,
        volume: 100,
        airMass: 120,
        connectedCompartments: []
      }],
      coolingSystems: [],

      systems: [{
        id: 'reactor-sys',
        name: 'Reactor',
        type: SystemType.POWER,
        compartmentId: 'main',
        integrity: 1.0,
        status: SystemStatus.ONLINE,
        powerDraw: 0,
        operational: true,
        isCritical: true
      }],

      crew: [{
        id: 'pilot',
        name: 'Pilot',
        location: 'main',
        health: 1.0,
        oxygenLevel: 1.0,
        status: CrewStatus.HEALTHY
      }],

      lifeSupport: {
        oxygenGenerationRate: 0.5,
        co2ScrubberRate: 0.5,
        powered: true
      },

      weapons: []
    };
  }

  describe('Simulation Management', () => {
    it('should add and retrieve ships', () => {
      const simulation = new CompleteSimulation(world);

      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = simulation.addShip(config);

      expect(ship).toBeDefined();
      expect(simulation.getShip(ship.id)).toBe(ship);

      const allShips = simulation.getAllShips();
      expect(allShips.length).toBe(1);
      expect(allShips[0]).toBe(ship);
    });

    it('should remove ships', () => {
      const simulation = new CompleteSimulation(world);

      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );

      const ship = simulation.addShip(config);
      simulation.removeShip(ship.id);

      expect(simulation.getShip(ship.id)).toBeUndefined();
      expect(simulation.getAllShips().length).toBe(0);
    });

    it('should update all ships', () => {
      const simulation = new CompleteSimulation(world);

      const config1 = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 100, y: 0, z: 0 }
      );
      const config2 = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 200000 },
        { x: 50, y: 0, z: 0 }
      );

      const ship1 = simulation.addShip(config1);
      const ship2 = simulation.addShip(config2);

      const pos1Before = ship1.getPosition().x;
      const pos2Before = ship2.getPosition().x;

      simulation.update(1);

      expect(ship1.getPosition().x).toBeGreaterThan(pos1Before);
      expect(ship2.getPosition().x).toBeGreaterThan(pos2Before);
    });
  });

  describe('Projectile and Missile Tracking', () => {
    it('should track fired projectiles', () => {
      const simulation = new CompleteSimulation(world);

      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );
      config.weapons = [{
        id: 'railgun',
        type: WeaponType.RAILGUN,
        mountPoint: { x: 5, y: 0, z: 0 },
        aimDirection: { x: 1, y: 0, z: 0 },
        damage: 5000000,
        projectileSpeed: 3000,
        projectileMass: 2,
        range: 50000,
        rateOfFire: 10,
        powerDraw: 10000,
        heatGeneration: 2000000,
        ammoCapacity: 100,
        ammoRemaining: 100,
        cooldown: 0,
        compartmentId: 'main'
      }];

      const ship = simulation.addShip(config);

      ship.fireWeapon('railgun', { x: 1, y: 0, z: 0 });

      simulation.update(0.1);

      const projectiles = simulation.getAllProjectiles();
      expect(projectiles.length).toBe(1);
    });

    it('should clean up dead projectiles', () => {
      const simulation = new CompleteSimulation(world);

      const config = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 0, y: 0, z: 0 }
      );
      config.weapons = [{
        id: 'railgun',
        type: WeaponType.RAILGUN,
        mountPoint: { x: 5, y: 0, z: 0 },
        aimDirection: { x: 1, y: 0, z: 0 },
        damage: 5000000,
        projectileSpeed: 3000,
        projectileMass: 2,
        range: 50000,
        rateOfFire: 10,
        powerDraw: 10000,
        heatGeneration: 2000000,
        ammoCapacity: 100,
        ammoRemaining: 100,
        cooldown: 0,
        compartmentId: 'main'
      }];

      const ship = simulation.addShip(config);

      ship.fireWeapon('railgun', { x: 1, y: 0, z: 0 });

      // Update for a long time to expire projectile
      for (let i = 0; i < 70; i++) {
        simulation.update(1);
      }

      const projectiles = simulation.getAllProjectiles();
      expect(projectiles.length).toBe(0);
    });
  });

  describe('Collision Detection', () => {
    it('should detect ship-ship collisions', () => {
      const simulation = new CompleteSimulation(world);

      const config1 = createMinimalShipConfig(
        { x: 0, y: 0, z: moon.radius + 100000 },
        { x: 50, y: 0, z: 0 }
      );
      const config2 = createMinimalShipConfig(
        { x: 100, y: 0, z: moon.radius + 100000 },
        { x: -50, y: 0, z: 0 }
      );

      const ship1 = simulation.addShip(config1);
      const ship2 = simulation.addShip(config2);

      let collision1 = false;
      let collision2 = false;

      ship1.on('collision', () => { collision1 = true; });
      ship2.on('collision', () => { collision2 = true; });

      // Update until collision
      for (let i = 0; i < 5; i++) {
        simulation.update(0.1);
        if (collision1 && collision2) break;
      }

      // At least one should detect collision
      expect(collision1 || collision2).toBe(true);
    });
  });

  describe('Simulation Time', () => {
    it('should track simulation time', () => {
      const simulation = new CompleteSimulation(world);

      expect(simulation.getSimulationTime()).toBe(0);

      simulation.update(1);
      expect(simulation.getSimulationTime()).toBe(1);

      simulation.update(5);
      expect(simulation.getSimulationTime()).toBe(6);
    });
  });
});
