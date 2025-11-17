/**
 * demo-system.ts
 * A fully fleshed-out demo star system showcasing all game features
 */

import { StarSystem, generateStarSystem } from './StarSystem';
import { StarClass } from './CelestialBody';
import { SatelliteType } from '../../physics-modules/src/satellite';

/**
 * Create "Kepler Station" - A comprehensive demo system
 *
 * This system demonstrates ALL game features:
 * - Diverse planetary bodies (gas giants, terrestrial, moons)
 * - Multiple space stations with different purposes
 * - Satellite constellations (comms, nav, recon, weather)
 * - Asteroid mining operations
 * - Environmental hazards
 * - Trade routes and economy
 * - Missions and objectives
 * - Living traffic and NPCs
 */
export function createKeplerStationSystem(): StarSystem {
  const system = generateStarSystem('Kepler Station', {
    seed: 77777,
    starClass: StarClass.G, // Sun-like star
    numPlanets: { min: 6, max: 6 }, // Exactly 6 planets for a balanced system
    allowAsteroidBelt: true,
    allowStations: true,
    allowSatellites: true,
    allowHazards: true,
    civilizationLevel: 9 // High-tech hub system
  });

  return system;
}

/**
 * Get detailed system report for the demo
 */
export function getSystemReport(system: StarSystem): string {
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════════════════════════╗');
  lines.push('║                    KEPLER STATION SYSTEM                             ║');
  lines.push('║                    Stellar Survey Report                             ║');
  lines.push('╚══════════════════════════════════════════════════════════════════════╝');
  lines.push('');

  // Star information
  lines.push('═══ STELLAR DATA ═══');
  lines.push(`Star: ${system.star.name}`);
  lines.push(`Class: ${system.star.starClass} (${getStarDescription(system.star.starClass)})`);
  lines.push(`Temperature: ${system.star.temperature.toLocaleString()}K`);
  lines.push(`Luminosity: ${(system.star.luminosity / 3.828e26).toFixed(2)}× Sol`);
  const habZone = system.star.getHabitableZone();
  lines.push(`Habitable Zone: ${(habZone.inner / 1.496e11).toFixed(2)} - ${(habZone.outer / 1.496e11).toFixed(2)} AU`);
  lines.push('');

  // System statistics
  lines.push('═══ SYSTEM OVERVIEW ═══');
  lines.push(`Planets: ${system.planets.length}`);
  lines.push(`Moons: ${system.moons.length}`);
  lines.push(`Space Stations: ${system.stations.length}`);
  lines.push(`Satellites: ${system.satellites.length}`);
  lines.push(`Asteroids: ${system.asteroids.length.toLocaleString()}`);
  lines.push(`Hazards: ${system.hazardSystem.getActiveHazards().length}`);
  lines.push(`Habitable Worlds: ${system.getHabitablePlanets().length}`);
  lines.push('');

  // Detailed planet information
  lines.push('═══ PLANETARY BODIES ═══');
  system.planets.forEach((planet, i) => {
    const orbitAU = planet.orbital!.semiMajorAxis / 1.496e11;
    lines.push(`\n${i + 1}. ${planet.name} [${planet.planetClass}]`);
    lines.push(`   Orbit: ${orbitAU.toFixed(3)} AU (${getPlanetZone(orbitAU, habZone)})`);
    lines.push(`   Mass: ${(planet.physical.mass / 5.972e24).toFixed(2)} M⊕`);
    lines.push(`   Radius: ${(planet.physical.radius / 6.371e6).toFixed(2)} R⊕`);
    lines.push(`   Gravity: ${planet.physical.surfaceGravity.toFixed(2)} m/s²`);
    lines.push(`   Temperature: ${planet.surfaceTemperature.toFixed(0)}K (${(planet.surfaceTemperature - 273).toFixed(0)}°C)`);

    if (planet.hasAtmosphere) {
      lines.push(`   Atmosphere: ${(planet.physical.atmospherePressure! / 101325).toFixed(2)} atm`);
    } else {
      lines.push(`   Atmosphere: None (vacuum)`);
    }

    lines.push(`   Habitability: ${planet.isHabitable ? '✅ HABITABLE' : '❌ Uninhabitable'}`);

    if (planet.children.length > 0) {
      lines.push(`   Moons: ${planet.children.length} natural satellites`);
      planet.children.forEach((moon, mi) => {
        lines.push(`     ${mi + 1}. ${moon.name} (${(moon.physical.radius / 1000).toFixed(0)}km radius)`);
      });
    }

    if (planet.resources.size > 0) {
      const richResources = Array.from(planet.resources.entries())
        .filter(([_, abundance]) => abundance > 0.6)
        .map(([resource, abundance]) => `${resource} (${(abundance * 100).toFixed(0)}%)`)
        .join(', ');
      if (richResources) {
        lines.push(`   Resources: ${richResources}`);
      }
    }
  });
  lines.push('');

  // Space stations
  if (system.stations.length > 0) {
    lines.push('═══ SPACE STATIONS ═══');
    system.stations.forEach((station, i) => {
      lines.push(`\n${i + 1}. ${station.name} [${station.stationType}]`);
      lines.push(`   Faction: ${station.faction}`);
      lines.push(`   Population: ${station.population.toLocaleString()}`);
      lines.push(`   Docking Ports: ${station.dockingPorts.length}`);

      const services = Object.entries(station.services)
        .filter(([_, available]) => available)
        .map(([service]) => service);
      lines.push(`   Services: ${services.join(', ')}`);

      lines.push(`   Economy: ${getEconomyDescription(station.economy.wealthLevel)}`);
      lines.push(`   Trade Volume: ${station.economy.tradeVolume.toLocaleString()} credits/day`);

      if (station.economy.supplyGoods.length > 0) {
        lines.push(`   Exports: ${station.economy.supplyGoods.join(', ')}`);
      }
      if (station.economy.demandGoods.length > 0) {
        lines.push(`   Imports: ${station.economy.demandGoods.join(', ')}`);
      }
    });
    lines.push('');
  }

  // Satellite constellations
  if (system.satellites.length > 0) {
    lines.push('═══ SATELLITE NETWORK ═══');

    const commsSats = system.satellites.filter(s => s.type === SatelliteType.COMMUNICATIONS);
    const reconSats = system.satellites.filter(s => s.type === SatelliteType.RECONNAISSANCE);
    const navSats = system.satellites.filter(s => s.type === SatelliteType.NAVIGATION);
    const weatherSats = system.satellites.filter(s => s.type === SatelliteType.WEATHER);

    if (commsSats.length > 0) {
      lines.push(`\nCommunications Constellation: ${commsSats.length} satellites`);
      commsSats.forEach(sat => {
        const state = sat.getState();
        lines.push(`  • ${sat.name}: ${state.status} (${(state.orbital.altitude / 1000).toFixed(0)}km orbit)`);
      });
    }

    if (navSats.length > 0) {
      lines.push(`\nNavigation Constellation: ${navSats.length} satellites`);
      lines.push(`  Coverage: ${navSats.length >= 4 ? 'Global' : 'Partial'}`);
      lines.push(`  Accuracy: ${navSats.length >= 6 ? 'High' : navSats.length >= 4 ? 'Medium' : 'Low'}`);
    }

    if (reconSats.length > 0) {
      lines.push(`\nReconnaissance Network: ${reconSats.length} satellites`);
      reconSats.forEach(sat => {
        const state = sat.getState();
        const activeSensors = state.sensors.sensors.filter(s => s.operational).length;
        lines.push(`  • ${sat.name}: ${activeSensors} active sensors`);
      });
    }

    if (weatherSats.length > 0) {
      lines.push(`\nEnvironmental Monitoring: ${weatherSats.length} satellites`);
      lines.push(`  Real-time weather tracking active`);
    }

    lines.push('');
  }

  // NPC Traffic
  const npcShips = system.trafficManager.getAllVessels();
  if (npcShips.length > 0) {
    lines.push('═══ NPC TRAFFIC ═══');
    lines.push(`Active Vessels: ${npcShips.length}`);
    lines.push('');

    // Show traffic statistics
    const stats = system.trafficManager.getStatistics();
    lines.push(`Traffic Statistics:`);
    lines.push(`  Average Speed: ${(stats.avgSpeed / 1000).toFixed(1)} km/s`);
    lines.push(`  Max Speed: ${(stats.maxSpeed / 1000).toFixed(1)} km/s`);
    lines.push('');

    // Show vessels by type
    lines.push(`Vessels by Type:`);
    stats.vesselsByType.forEach((count, type) => {
      lines.push(`  • ${type}: ${count}`);
    });
    lines.push('');

    // Show sample ships (first 5)
    lines.push(`Sample Traffic:`);
    for (let i = 0; i < Math.min(5, npcShips.length); i++) {
      const ship = npcShips[i];
      const state = ship.getState();
      lines.push(`\n  ${i + 1}. ${ship.name} [${ship.type}]`);
      lines.push(`     Status: ${state.status}`);
      lines.push(`     Speed: ${(state.speed / 1000).toFixed(1)} km/s`);

      if (state.destinationName) {
        lines.push(`     Route: ${ship.originName || 'Unknown'} → ${state.destinationName}`);
        if (state.eta < Infinity) {
          const etaMinutes = Math.floor(state.eta / 60);
          const etaHours = Math.floor(etaMinutes / 60);
          if (etaHours > 0) {
            lines.push(`     ETA: ${etaHours}h ${etaMinutes % 60}m`);
          } else {
            lines.push(`     ETA: ${etaMinutes}m`);
          }
        }
      }

      if (state.cargo.length > 0) {
        const cargoSummary = state.cargo
          .map(c => `${c.amount.toFixed(0)}t ${c.type}`)
          .join(', ');
        lines.push(`     Cargo: ${cargoSummary}`);
      }
    }

    if (npcShips.length > 5) {
      lines.push(`\n  ... and ${npcShips.length - 5} more vessels`);
    }

    lines.push('');
  }

  // Hazards
  const hazards = system.hazardSystem.getActiveHazards();
  if (hazards.length > 0) {
    lines.push('═══ NAVIGATION HAZARDS ═══');
    hazards.forEach((hazard, i) => {
      lines.push(`\n⚠️  ${i + 1}. ${hazard.name} [${hazard.type}]`);
      lines.push(`   Severity: ${getSeverityBar(hazard.severity)}`);
      lines.push(`   Radius: ${(hazard.radius / 1000).toFixed(0)} km`);
      lines.push(`   Warning: ${getHazardWarning(hazard.type)}`);
    });
    lines.push('');
  }

  // Asteroid belt
  if (system.asteroids.length > 0) {
    lines.push('═══ ASTEROID BELT ═══');
    const metalCount = system.asteroids.filter(a => a.composition === 'METAL').length;
    const rockCount = system.asteroids.filter(a => a.composition === 'ROCK').length;
    const iceCount = system.asteroids.filter(a => a.composition === 'ICE').length;

    lines.push(`Total Asteroids: ${system.asteroids.length.toLocaleString()}`);
    lines.push(`Composition:`);
    lines.push(`  • Metallic: ${metalCount.toLocaleString()} (${((metalCount / system.asteroids.length) * 100).toFixed(1)}%)`);
    lines.push(`  • Rocky: ${rockCount.toLocaleString()} (${((rockCount / system.asteroids.length) * 100).toFixed(1)}%)`);
    lines.push(`  • Ice: ${iceCount.toLocaleString()} (${((iceCount / system.asteroids.length) * 100).toFixed(1)}%)`);

    const richAsteroids = system.asteroids.filter(a => a.mineralWealth > 0.7).length;
    lines.push(`Mining Prospects: ${richAsteroids} high-value targets identified`);
    lines.push('');
  }

  lines.push('═══ END REPORT ═══');
  lines.push('');

  return lines.join('\n');
}

function getStarDescription(starClass: StarClass): string {
  const descriptions: Record<StarClass, string> = {
    [StarClass.O]: 'Blue Supergiant, Very Hot',
    [StarClass.B]: 'Blue Giant, Hot',
    [StarClass.A]: 'Blue-White, Hot',
    [StarClass.F]: 'White, Warm',
    [StarClass.G]: 'Yellow, Sol-like',
    [StarClass.K]: 'Orange, Cool',
    [StarClass.M]: 'Red Dwarf, Cold',
    [StarClass.NEUTRON]: 'Neutron Star, Extreme',
    [StarClass.BLACK_HOLE]: 'Black Hole, Singularity'
  };
  return descriptions[starClass] || 'Unknown';
}

function getPlanetZone(orbitAU: number, habZone: { inner: number; outer: number }): string {
  const habInnerAU = habZone.inner / 1.496e11;
  const habOuterAU = habZone.outer / 1.496e11;

  if (orbitAU < habInnerAU) return 'Inner Zone - Too Hot';
  if (orbitAU > habOuterAU) return 'Outer Zone - Too Cold';
  return 'HABITABLE ZONE';
}

function getEconomyDescription(wealthLevel: number): string {
  if (wealthLevel > 0.8) return 'Thriving';
  if (wealthLevel > 0.6) return 'Prosperous';
  if (wealthLevel > 0.4) return 'Stable';
  if (wealthLevel > 0.2) return 'Struggling';
  return 'Impoverished';
}

function getSeverityBar(severity: number): string {
  const filled = Math.floor(severity);
  const empty = 5 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` (${severity}/5)`;
}

function getHazardWarning(type: string): string {
  const warnings: Record<string, string> = {
    'RADIATION_BELT': 'Intense radiation - shielding required',
    'DEBRIS_FIELD': 'High-velocity debris - evasive maneuvers recommended',
    'SOLAR_FLARE': 'Electromagnetic interference expected',
    'MAGNETIC_ANOMALY': 'Navigation systems may malfunction',
    'DUST_STORM': 'Reduced visibility and sensor interference',
    'ASTEROID_CLUSTER': 'Dense asteroid concentration - proceed with caution'
  };
  return warnings[type] || 'Unknown hazard type';
}

/**
 * Analyze what's missing or needs improvement in the system
 */
export function analyzeSystemCompleteness(system: StarSystem): {
  score: number;
  missing: string[];
  recommendations: string[];
} {
  const missing: string[] = [];
  const recommendations: string[] = [];
  let score = 0;

  // Check planets
  if (system.planets.length > 0) score += 15;
  else missing.push('Planets');

  // Check moons
  if (system.moons.length > 0) score += 10;
  else recommendations.push('Add moons to planets for realism');

  // Check stations
  if (system.stations.length > 0) score += 15;
  else missing.push('Space stations');

  // Check satellites
  if (system.satellites.length > 0) score += 15;
  else missing.push('Satellite network');

  // Check NPC traffic
  if (system.trafficManager.getVesselCount() > 0) score += 15;
  else missing.push('NPC ship traffic');

  // Check habitable worlds
  if (system.getHabitablePlanets().length > 0) score += 10;
  else recommendations.push('Add at least one habitable planet');

  // Check asteroids
  if (system.asteroids.length > 0) score += 10;
  else recommendations.push('Add asteroid belt for mining gameplay');

  // Check hazards
  if (system.hazardSystem.getActiveHazards().length > 0) score += 10;
  else recommendations.push('Add environmental hazards for challenge');

  // Check resources
  const planetsWithResources = system.planets.filter(p => p.resources.size > 0).length;
  if (planetsWithResources > 0) score += 10;
  else recommendations.push('Add resources to planets for economy');

  // Check diversity
  const planetTypes = new Set(system.planets.map(p => p.planetClass));
  if (planetTypes.size >= 3) score += 5;
  else recommendations.push('Add more diverse planet types');

  // Missing features (still to implement)
  missing.push('Dynamic events');
  missing.push('Local news/comms chatter');
  missing.push('Trade routes visualization');
  missing.push('Faction presence');
  missing.push('System history/lore');
  missing.push('Points of interest');
  missing.push('Derelict ships/debris');
  missing.push('Jump gate connections');
  missing.push('System security level');

  return { score, missing, recommendations };
}
