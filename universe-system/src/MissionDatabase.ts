/**
 * Mission Database - "Out There" Style Content
 * Concrete mission implementations focusing on exploration, resource scarcity, and narrative choices
 */

import {
  NarrativeMission,
  MissionStage,
  Choice,
  Outcome,
  Knowledge,
} from './NarrativeMission';

// ============================================================================
// KNOWLEDGE DEFINITIONS
// ============================================================================

const KNOWLEDGE_DATABASE: Knowledge[] = [
  {
    id: 'precursor_language_alpha',
    category: 'alien_language',
    title: 'Precursor Glyphs - Basic',
    description: 'Fundamental understanding of ancient alien writing system',
    loreText:
      'The symbols form a logographic system, each glyph representing complex concepts rather than sounds. Age: estimated 50,000+ years.',
    unlocksMissions: ['ancient_monolith_02', 'tomb_ship_depths'],
    marketValue: 5000,
  },
  {
    id: 'quantum_signature_data',
    category: 'scientific',
    title: 'Quantum Entanglement Phenomenon',
    description: 'Readings from naturally occurring quantum event',
    loreText:
      'Particles separated by thousands of kilometers maintaining impossible synchronization. Origin unknown. Implications: FTL communication may be possible.',
    techBonus: 'quantum_scanner',
    marketValue: 8000,
  },
  {
    id: 'syndicate_safe_routes',
    category: 'navigation',
    title: 'Smuggler Route Database',
    description: 'Unpatrolled navigation corridors through hostile space',
    loreText:
      'Encrypted star charts showing gaps in patrol coverage. Trade guilds pay premium for this intel.',
    navigationBonus: 'syndicate_routes',
    marketValue: 3000,
  },
  {
    id: 'living_nebula_consciousness',
    category: 'xenobiology',
    title: 'Nebula Intelligence Protocol',
    description: 'Evidence of cloud-based sentience',
    loreText:
      'The nebula responds to radio frequencies in patterns too complex for chance. It may be aware. It may be ancient. It may be lonely.',
    unlocksMissions: ['nebula_communion'],
    marketValue: 15000,
  },
];

// ============================================================================
// SIGNAL ENCOUNTERS (Discovery-Focused)
// ============================================================================

export const MISSION_DERELICT_BEACON: NarrativeMission = {
  id: 'signal_derelict_beacon_01',
  type: 'signal',
  title: 'Silent Beacon',
  description: 'Ancient distress signal detected. Origin: pre-colonial era vessel.',

  triggerConditions: {
    location: ['deep_space', 'debris_field'],
    probability: 0.3,
    minFuel: 100, // Need fuel to investigate
  },

  mood: 'mystery',
  narrativeWeight: 'major',
  isRepeatable: false,

  initialStageId: 'detection',

  stages: [
    {
      id: 'detection',
      title: 'Anomalous Signal',
      description: 'Your sensors detect a repeating pattern on emergency frequencies.',
      narrativeText:
        'The signal is faint, degraded by decades of stellar radiation. Pattern analysis suggests a pre-colonial distress beacon - over 80 years old. No recent traffic in this sector. Whatever happened here, no one came to help.\n\nThe signal source is 45,000 km off your current trajectory.',

      visualDescription:
        'Long-range sensors show a tumbling metallic object, no active power signature. Debris field surrounds it.',
      sensorData: 'Signal: 121.5 MHz emergency band | Age: 80-85 years | Mass: ~45,000 kg',

      choices: [
        {
          id: 'investigate_full',
          text: 'Full Investigation',
          description: 'Alter course, dock with derelict, search for survivors or salvage',
          requires: {
            fuel: 30,
            power: 100,
            time: 4,
          },
          isProbabilistic: true,
          isIrreversible: false,
          flavorText:
            'Someone sent that beacon. Even if they\'re gone, their story deserves to be known.',
          riskLevel: 'medium',

          outcomes: [
            {
              id: 'valuable_salvage',
              probability: 0.4,
              description: 'Derelict contains intact navigation computer and fuel reserves',
              narrativeText:
                'The airlock breaches with a hiss of escaping atmosphere. Inside: frozen bodies, perfectly preserved. The crew died quickly when life support failed. But their navigation computer is intact, containing star charts of uncharted routes.\n\nFuel tanks: half full. They almost made it.',
              resourceChange: {
                fuel: -30 + 150, // Cost to get there, but gain more
                power: -100,
                time: -4,
              },
              knowledgeGained: [KNOWLEDGE_DATABASE[2]], // syndicate_safe_routes
              setFlags: ['found_derelict_crew', 'salvage_ethical_questions'],
              techUnlock: 'nav_computer_mk2',
            },
            {
              id: 'dangerous_discovery',
              probability: 0.3,
              description: 'Derelict structure unstable, hull breach during investigation',
              narrativeText:
                'The hull groans as you dock. Too late, you realize the structural integrity is failing. A section tears away, explosive decompression. You barely escape.\n\nYou glimpse frozen faces through the viewport as the wreck tumbles into the dark.',
              resourceChange: {
                fuel: -30,
                power: -100,
                time: -4,
                hull: -15,
              },
              hullDamage: 15,
              setFlags: ['derelict_structural_failure', 'close_call'],
            },
            {
              id: 'mystery_deepens',
              probability: 0.3,
              description: 'Crew missing, signs of struggle, no bodies',
              narrativeText:
                'The ship is empty. Not abandoned - empty. No bodies, no blood, no remains. But signs of struggle: damaged panels, scorched walls, breached doors forced open from the inside.\n\nThe last log entry: "They\'re inside. They\'re in the walls."\n\nNothing else.',
              resourceChange: {
                fuel: -30 + 50, // Some salvageable fuel
                power: -100,
                time: -4,
              },
              setFlags: ['derelict_mystery', 'unknown_threat', 'cosmic_horror_hint'],
              nextStageId: 'mystery_investigation',
            },
          ],
        },
        {
          id: 'quick_scan',
          text: 'Remote Scan Only',
          description: 'Scan from distance, minimal resource investment',
          requires: {
            power: 25,
            time: 0.5,
          },
          isProbabilistic: false,
          isIrreversible: false,
          flavorText: 'Curiosity versus caution. Fuel is life.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'scan_data',
              probability: 1.0,
              description: 'Basic scan reveals ship class and approximate age',
              narrativeText:
                'Sensors identify the wreck: cargo hauler, Taurus-class, registered to Colonial Logistics Corp. Lost 83 years ago during the Frontier Expansion.\n\nNo life signs. No active systems. Just silence and debris.\n\nYou log the coordinates and continue on.',
              resourceChange: {
                power: -25,
                time: -0.5,
              },
              setFlags: ['scanned_derelict', 'chose_caution'],
            },
          ],
        },
        {
          id: 'ignore_signal',
          text: 'Ignore and Continue',
          description: 'Maintain current course, conserve all resources',
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'The dead can wait. The living need fuel.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'pass_by',
              probability: 1.0,
              description: 'You continue on course, leaving the beacon behind',
              narrativeText:
                'The signal fades behind you, swallowed by the vast dark. Somewhere out there, a ship full of people who never made it home.\n\nYou wonder if anyone will find them. You wonder if anyone will find you, if your fuel runs dry.\n\nThe beacon continues to transmit, patient and eternal.',
              resourceChange: {},
              setFlags: ['abandoned_derelict', 'pragmatic_choice'],
            },
          ],
        },
      ],
    },
    {
      id: 'mystery_investigation',
      title: 'Empty Ship',
      description: 'The crew vanished. Something happened here.',
      narrativeText:
        'You stand in the empty corridors. Emergency lights flicker. The ship\'s computer is corrupted, but you might be able to extract something from the backup core.\n\nOr you could leave. Now.',

      visualDescription: 'Claw marks on the interior hull. Blast doors sealed from both sides.',
      sensorData: 'No biological traces. No DNA. No evidence they ever existed.',

      choices: [
        {
          id: 'extract_logs',
          text: 'Extract Computer Logs',
          description: 'Attempt data recovery from damaged systems',
          requires: {
            power: 50,
            time: 2,
          },
          isProbabilistic: true,
          isIrreversible: false,
          riskLevel: 'medium',

          outcomes: [
            {
              id: 'horrific_truth',
              probability: 0.6,
              description: 'Recovered footage shows impossible events',
              narrativeText:
                'The video is corrupted, fragmentary:\n\nCrew at dinner. Laughter.\nAlarm. Confusion.\nSomething in the cargo bay.\nScreaming.\nStatic.\nEmpty corridors.\nSilence.\n\nThe timestamp shows it happened in 47 minutes.\n\nYou delete the files. Some things shouldn\'t be known.',
              resourceChange: {
                power: -50,
                time: -2,
              },
              setFlags: ['witnessed_horror', 'knowledge_burden'],
              crewEffect: 'morale_penalty',
            },
            {
              id: 'data_corrupted',
              probability: 0.4,
              description: 'Files too damaged to recover',
              narrativeText:
                'The data is gone. Corrupted beyond recovery. Maybe that\'s for the best.\n\nYou seal the ship and leave. The mystery remains.',
              resourceChange: {
                power: -50,
                time: -2,
              },
              setFlags: ['mystery_unsolved'],
            },
          ],
        },
        {
          id: 'flee_ship',
          text: 'Leave Immediately',
          description: 'Return to your ship and depart',
          isProbabilistic: false,
          isIrreversible: true,
          riskLevel: 'low',

          outcomes: [
            {
              id: 'survive_mystery',
              probability: 1.0,
              description: 'You escape the derelict',
              narrativeText:
                'Your instincts scream danger. You trust them.\n\nAs you undock, you see movement in the derelict\'s windows. Impossible. There\'s nothing aboard.\n\nYou don\'t look back.',
              resourceChange: {},
              setFlags: ['escaped_derelict', 'unsettling_experience'],
            },
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// RESOURCE CRISIS (Survival-Focused)
// ============================================================================

export const MISSION_DEAD_ZONE: NarrativeMission = {
  id: 'crisis_dead_zone_fuel',
  type: 'crisis',
  title: 'The Dead Zone',
  description: 'Fuel critically low. No stations in range. Survival requires sacrifice.',

  triggerConditions: {
    location: ['deep_space'],
    maxFuel: 150, // Only triggers when low on fuel
    probability: 0.5,
  },

  mood: 'desperation',
  narrativeWeight: 'critical',
  isRepeatable: false,

  initialStageId: 'crisis_moment',

  stages: [
    {
      id: 'crisis_moment',
      title: 'Fuel Critical',
      description: 'You are stranded between stars.',
      narrativeText:
        'The fuel gauge reads 8%. Navigation calculates 147 kg remaining. The nearest station requires 280 kg to reach.\n\nYou are 0.4 light-years from anything. The deep black surrounds you.\n\nYou have options. None are good.',

      visualDescription: 'Stars motionless. Engines cold. Life support humming, for now.',
      sensorData: 'Fuel: 8% (147 kg) | Range: 0.2 LY | Nearest station: 0.35 LY',

      choices: [
        {
          id: 'jettison_cargo',
          text: 'Jettison All Cargo',
          description: 'Reduce mass, extend range. Lose all cargo and profits.',
          requires: {
            cargo_space: 1, // Must have cargo to jettison
          },
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'Months of trading. Gone. But you\'ll be alive to trade again.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'cargo_jettisoned',
              probability: 1.0,
              description: 'Reduced mass extends fuel range by 35%',
              narrativeText:
                'You watch through the viewport as containers tumble into the void. Trade goods, rare minerals, personal effects. All of it, gone.\n\nThe fuel gauge estimate updates: 0.27 LY range. Still short. But closer.',
              resourceChange: {
                cargo_space: 100, // Free up all space
                fuel: 20, // Slight efficiency gain
              },
              setFlags: ['jettisoned_cargo', 'material_sacrifice'],
              nextStageId: 'still_short',
            },
          ],
        },
        {
          id: 'power_to_fuel',
          text: 'Emergency Power Conversion',
          description: 'Convert battery reserves to fuel. Disable critical systems.',
          requires: {
            power: 500,
          },
          isProbabilistic: true,
          isIrreversible: true,
          flavorText: 'The fuel cells can run in reverse. Theoretically.',
          riskLevel: 'high',

          outcomes: [
            {
              id: 'conversion_success',
              probability: 0.6,
              description: 'Successful conversion yields additional fuel',
              narrativeText:
                'The fuel cell whines as it reverses polarity. Gauges spike. Alarms blare. The process is violently inefficient, but it works.\n\n+80 kg fuel. Navigation, sensors, and communications offline. Life support on minimum.',
              resourceChange: {
                power: -8000,
                fuel: 80,
              },
              setFlags: ['power_conversion_used', 'systems_damaged'],
            },
            {
              id: 'conversion_failure',
              probability: 0.4,
              description: 'Fuel cell overloads, explosion damages systems',
              narrativeText:
                'The fuel cell screams. Smoke. Sparks. The explosion is contained, but the damage is severe.\n\nFuel gained: minimal. Power systems: critical. Hull integrity: compromised.\n\nYou might have made it worse.',
              resourceChange: {
                power: -8000,
                fuel: 20,
                hull: -25,
              },
              hullDamage: 25,
              setFlags: ['conversion_failed', 'desperate_measures'],
              crewEffect: 'injury',
            },
          ],
        },
        {
          id: 'gravity_slingshot',
          text: 'Gravity Assist Maneuver',
          description: 'Risky burn around nearby brown dwarf. High-G, dangerous.',
          requires: {
            fuel: 50,
            time: 8,
          },
          isProbabilistic: true,
          isIrreversible: true,
          flavorText: 'Trust the math. Trust the ship. Don\'t think about failure.',
          riskLevel: 'extreme',

          outcomes: [
            {
              id: 'slingshot_success',
              probability: 0.5,
              description: 'Perfect burn, massive velocity gained',
              narrativeText:
                'You dive toward the brown dwarf. Heat warnings blare. Hull temperature spikes. G-forces press you into your seat.\n\nThe computer executes the burn at periapsis. 8.7 seconds of thrust.\n\nYou slingshot out at 47 km/s, fuel efficiency increased by 300%. The station is now in range.',
              resourceChange: {
                fuel: -50 + 200, // Burn cost, but huge savings from velocity
                time: -8,
              },
              setFlags: ['slingshot_success', 'skilled_pilot'],
            },
            {
              id: 'slingshot_partial',
              probability: 0.3,
              description: 'Suboptimal burn, some benefit but still critical',
              narrativeText:
                'The approach is good but not perfect. Turbulence. Miscalculation. The burn timing is off by 0.3 seconds.\n\nYou escape the gravity well, but the fuel savings are less than projected. Range extended, but you\'re still in danger.',
              resourceChange: {
                fuel: -50 + 80,
                time: -8,
                hull: -10,
              },
              hullDamage: 10,
              setFlags: ['slingshot_partial'],
              nextStageId: 'still_short',
            },
            {
              id: 'slingshot_disaster',
              probability: 0.2,
              description: 'Navigation error, critical damage from heat and stress',
              narrativeText:
                'The trajectory is wrong. You realize it too late. The ship plunges too deep into the gravity well.\n\nHeat. G-forces. Alarms. Something breaks. Multiple somethings.\n\nYou escape, barely. But the ship is crippled.',
              resourceChange: {
                fuel: -50,
                time: -8,
                hull: -40,
              },
              hullDamage: 40,
              setFlags: ['slingshot_failed', 'near_death'],
              crewEffect: 'severe_injury',
            },
          ],
        },
        {
          id: 'distress_call',
          text: 'Broadcast Distress Signal',
          description: 'Call for help. Hope someone answers. Accept the consequences.',
          requires: {
            power: 100,
          },
          isProbabilistic: true,
          isIrreversible: true,
          flavorText: 'In the void, crying for help is dangerous. But so is dying alone.',
          riskLevel: 'high',

          outcomes: [
            {
              id: 'rescue_arrival',
              probability: 0.4,
              description: 'Legitimate rescue vessel responds',
              narrativeText:
                '18 hours of waiting. Then: a ping on sensors.\n\nFreighter "Mercy\'s Hand" responds. They tow you to the nearest station. The captain refuses payment.\n\n"We\'ve all been out here too long," she says. "Help each other or die alone."',
              resourceChange: {
                power: -100,
                time: -18,
              },
              reputationChange: {
                independents: 20,
              },
              setFlags: ['rescued_by_mercy', 'debt_of_honor'],
            },
            {
              id: 'pirate_ambush',
              probability: 0.35,
              description: 'Pirates arrive instead of rescue',
              narrativeText:
                'They arrive quickly. Too quickly.\n\n"Engine trouble?" The voice is mocking. "We can help. For a price."\n\nThey take everything. Cargo. Equipment. Most of your fuel. Leave you with just enough to limp to port.\n\n"Consider it a tax for using our space," they laugh.',
              resourceChange: {
                power: -100,
                fuel: 50, // They leave minimum
                cargo_space: 100, // Empty your hold
                time: -12,
              },
              reputationChange: {
                pirates: -30,
              },
              setFlags: ['pirated', 'humiliation', 'vulnerability'],
            },
            {
              id: 'no_response',
              probability: 0.25,
              description: 'Silence. No one comes.',
              narrativeText:
                'You broadcast for 36 hours. The signal propagates through the dark at light speed, touching nothing.\n\nNo response. You are alone.\n\nFuel: 3%. Power: critical. Options: zero.',
              resourceChange: {
                power: -300, // Extended broadcasting
                time: -36,
              },
              setFlags: ['no_rescue', 'cosmic_loneliness'],
              nextStageId: 'final_choice',
            },
          ],
        },
      ],
    },
    {
      id: 'still_short',
      title: 'Still Not Enough',
      description: 'Your measures helped, but you\'re still critically low.',
      narrativeText:
        'You\'ve done what you can. The math is merciless: you\'re still 40 kg short of reaching station.\n\nOne more sacrifice required.',

      visualDescription: 'Fuel gauge hovering in the red. Destination barely in sensor range.',
      sensorData: 'Fuel deficit: 40 kg | ETA at current velocity: 16 hours | Margin: 0%',

      choices: [
        {
          id: 'disable_life_support',
          text: 'Reduce Life Support to Minimum',
          description: 'Disable heating, reduce oxygen. Dangerous but conserves power.',
          isProbabilistic: false,
          isIrreversible: false,
          riskLevel: 'medium',

          outcomes: [
            {
              id: 'endure_cold',
              probability: 1.0,
              description: 'You survive the cold, arrive at station',
              narrativeText:
                'Temperature drops. 15°C. 10°C. 5°C. Your breath fogs. Fingers numb.\n\n16 hours of shivering, half-conscious endurance. But you make it.\n\nThe station dock is the warmest thing you\'ve ever felt.',
              resourceChange: {
                power: 100, // Savings from reduced life support
                time: -16,
              },
              setFlags: ['endured_cold', 'survival_will'],
              crewEffect: 'health_damage',
            },
          ],
        },
        {
          id: 'accept_fate',
          text: 'Accept Your Fate',
          description: 'You gave it everything. Sometimes it\'s not enough.',
          isProbabilistic: false,
          isIrreversible: true,
          riskLevel: 'extreme',

          outcomes: [
            {
              id: 'drift_forever',
              probability: 1.0,
              description: 'Your ship becomes another derelict in the dark',
              narrativeText:
                'You shut down all systems except life support. Set the distress beacon to automatic.\n\nIn the silence, you think about the choices that led here. The fuel you wasted. The risks you didn\'t take. The warnings you ignored.\n\nThe stars watch, indifferent.\n\n[GAME OVER - Fuel Depletion]',
              resourceChange: {},
              setFlags: ['died_in_void', 'game_over'],
            },
          ],
        },
      ],
    },
    {
      id: 'final_choice',
      title: 'Last Resort',
      description: 'No rescue. No options left. Only one way forward.',
      narrativeText:
        'Fuel: 2%. Power: emergency reserves only.\n\nYou can make one final burn. Aim for the station and pray momentum carries you close enough for a rescue tug.\n\nOr you can shut down and wait for death.',

      choices: [
        {
          id: 'final_burn',
          text: 'One Last Burn',
          description: 'Use every drop of fuel. Trust in momentum.',
          isProbabilistic: true,
          isIrreversible: true,
          riskLevel: 'extreme',

          outcomes: [
            {
              id: 'miraculous_arrival',
              probability: 0.3,
              description: 'Momentum carries you into rescue range',
              narrativeText:
                'You burn every last drop. The engine sputters and dies. You drift, powerless, toward the distant station.\n\n72 hours of silence.\n\nThen: proximity alert. Rescue tug "Harbor Light" matches velocity.\n\n"You\'re the luckiest pilot I\'ve ever seen," the tug captain says. "Or the dumbest."\n\nYou\'re too exhausted to care which.',
              resourceChange: {
                fuel: -999, // All remaining fuel
                time: -72,
              },
              reputationChange: {
                station_authority: 10,
              },
              setFlags: ['miraculous_survival', 'legend'],
            },
            {
              id: 'fall_short',
              probability: 0.7,
              description: 'Not enough momentum. You drift forever.',
              narrativeText:
                'The burn isn\'t enough. You watch the station drift past, 12,000 km away. So close.\n\nPower fails. Life support dies. The cold comes quickly.\n\nYour last thought: someone will find the ship. Someone will wonder what you were thinking.\n\n[GAME OVER - Died in Transit]',
              resourceChange: {
                fuel: -999,
              },
              setFlags: ['died_close_to_safety', 'game_over'],
            },
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// FACTION CROSSROADS (Diplomatic-Focused)
// ============================================================================

export const MISSION_CONTESTED_SALVAGE: NarrativeMission = {
  id: 'faction_contested_salvage',
  type: 'faction',
  title: 'Disputed Claim',
  description: 'Valuable derelict. Two factions. One choice.',

  triggerConditions: {
    location: ['debris_field', 'orbit'],
    probability: 0.4,
  },

  mood: 'tension',
  narrativeWeight: 'major',
  isRepeatable: true,

  initialStageId: 'discovery',

  stages: [
    {
      id: 'discovery',
      title: 'Competing Claims',
      description: 'You locate a valuable wreck. So did others.',
      narrativeText:
        'Sensor sweep identifies a derelict: military vessel, pre-war tech aboard. Worth 50,000+ credits to the right buyer.\n\nTwo ships arrive simultaneously:\n\n1. Corporate salvage vessel (Zenith Corp) - broadcasting legal claim, citing ownership records\n2. Independent mining crew (Free Spacers) - asserting salvage rights, "finders keepers"\n\nBoth are armed. Both are watching. Both demand you support their claim.',

      visualDescription: 'Three ships in tense standoff. The derelict drifts between you, silent prize.',
      sensorData: 'Derelict value: 50,000cr | Corporate ship: armed cutter | Miner: modified hauler with weapons',

      choices: [
        {
          id: 'support_corporate',
          text: 'Support Corporate Claim',
          description: 'Side with Zenith Corp. Legal, safe, profitable.',
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'Law and order. Contracts and stability. The boring choice that keeps you alive.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'corporate_reward',
              probability: 1.0,
              description: 'Corporation pays you for supporting their claim',
              narrativeText:
                'You transmit: "Claim acknowledged, Zenith Corp. Ownership records verified."\n\nThe miners curse and retreat. Zenith thanks you professionally, transfers 8,000 credits, and tags you as "reliable contractor."\n\nThe Free Spacers will remember this.',
              resourceChange: {},
              reputationChange: {
                zenith_corp: 30,
                free_spacers: -40,
              },
              setFlags: ['sided_with_corporation', 'pragmatic_legal'],
              merchantUnlock: true, // Zenith stations give discounts
            },
          ],
        },
        {
          id: 'support_independent',
          text: 'Support Independent Miners',
          description: 'Side with Free Spacers. Risky, but they remember loyalty.',
          isProbabilistic: true,
          isIrreversible: true,
          flavorText: 'The little people vs the megacorps. Romance and danger.',
          riskLevel: 'medium',

          outcomes: [
            {
              id: 'miners_grateful',
              probability: 0.7,
              description: 'Miners successfully claim salvage, share profit',
              narrativeText:
                'You broadcast: "Salvage rights recognized, Free Spacers. Possession is law out here."\n\nThe corporate ship protests but withdraws. Not worth the fight.\n\nThe miners share their haul: 12,000 credits, rare tech module, and an open invitation to their hidden stations.\n\n"You\'re one of us now," they say.',
              resourceChange: {},
              reputationChange: {
                zenith_corp: -50,
                free_spacers: 50,
              },
              setFlags: ['sided_with_independents', 'outlaw_reputation'],
              techUnlock: 'stealth_module',
              navigationBonus: 'hidden_stations',
            },
            {
              id: 'corporate_aggression',
              probability: 0.3,
              description: 'Corporation retaliates, marks you as hostile',
              narrativeText:
                'The corporate ship doesn\'t retreat. Instead: "You\'ve made a hostile action against Zenith Corp property."\n\nWeapons lock. Warning shots across your bow.\n\nThe miners grab what they can and flee. You barely escape. Zenith Corp now considers you a pirate.',
              resourceChange: {
                hull: -20,
              },
              hullDamage: 20,
              reputationChange: {
                zenith_corp: -80,
                free_spacers: 40,
              },
              setFlags: ['corporate_enemy', 'outlaw_life'],
            },
          ],
        },
        {
          id: 'claim_for_self',
          text: 'Claim It Yourself',
          description: 'Both factions distracted. Make a grab and run.',
          requires: {
            fuel: 50,
          },
          isProbabilistic: true,
          isIrreversible: true,
          flavorText: 'Greed. The oldest motivation. High risk, high reward.',
          riskLevel: 'extreme',

          outcomes: [
            {
              id: 'successful_theft',
              probability: 0.3,
              description: 'You grab valuable tech and escape',
              narrativeText:
                'While they argue, you dock with the derelict. 90 seconds of frantic salvaging. You grab the most valuable module and burn hard.\n\nBoth ships fire. Shots bracket you. One hits: minor damage.\n\nBut you\'re away. 35,000 credits in your hold. And two new enemies.',
              resourceChange: {
                fuel: -50,
                hull: -15,
              },
              hullDamage: 15,
              reputationChange: {
                zenith_corp: -60,
                free_spacers: -60,
              },
              setFlags: ['double_crossed_everyone', 'wanted_by_both'],
              techUnlock: 'military_grade_nav',
            },
            {
              id: 'caught_fleeing',
              probability: 0.5,
              description: 'They catch you, force you to return salvage',
              narrativeText:
                'You dock. Start salvaging. Then both ships lock weapons on you.\n\n"Drop the salvage or we drop you."\n\nThey agree on nothing except this: you don\'t get to steal from both of them.\n\nYou comply. Barely escape with your ship intact.',
              resourceChange: {
                fuel: -50,
                hull: -25,
              },
              hullDamage: 25,
              reputationChange: {
                zenith_corp: -30,
                free_spacers: -30,
              },
              setFlags: ['failed_theft', 'humiliated'],
            },
            {
              id: 'chase_disaster',
              probability: 0.2,
              description: 'Chase goes badly, critical damage',
              narrativeText:
                'You grab the tech and run. Both ships pursue. Weapons fire. Direct hit to your engine.\n\nYou lose the salvage. Lose half your fuel. Hull critical.\n\nThey leave you drifting, lesson learned.',
              resourceChange: {
                fuel: -100,
                hull: -45,
              },
              hullDamage: 45,
              reputationChange: {
                zenith_corp: -50,
                free_spacers: -50,
              },
              setFlags: ['catastrophic_theft_failure'],
              crewEffect: 'injury',
            },
          ],
        },
        {
          id: 'propose_split',
          text: 'Propose Three-Way Split',
          description: 'Diplomacy. Suggest sharing the salvage equally.',
          isProbabilistic: true,
          isIrreversible: true,
          flavorText: 'Everyone gets something. Nobody gets everything. Compromise.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'compromise_accepted',
              probability: 0.6,
              description: 'Both sides agree, reluctantly',
              narrativeText:
                'You broadcast: "Three ships, three shares. Everyone profits."\n\nLong silence. Then:\n\nCorporate: "...Acceptable."\nMiners: "Better than fighting."\n\nYou salvage together. Each takes a third. 16,000 credits for you. Nobody\'s happy, but nobody died.',
              resourceChange: {},
              reputationChange: {
                zenith_corp: 10,
                free_spacers: 10,
              },
              setFlags: ['diplomatic_solution', 'peacemaker'],
            },
            {
              id: 'compromise_rejected',
              probability: 0.4,
              description: 'Both refuse, continue standoff',
              narrativeText:
                'Corporate: "We don\'t negotiate with pirates."\nMiners: "We don\'t split with corporate dogs."\n\nYour diplomacy fails. The standoff continues. You leave empty-handed while they argue.\n\nSome conflicts can\'t be resolved.',
              resourceChange: {
                time: -2,
              },
              setFlags: ['failed_diplomacy', 'unsolvable_conflict'],
            },
          ],
        },
        {
          id: 'leave_entirely',
          text: 'Leave Without Engaging',
          description: 'Not your problem. Continue on course.',
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'Wisdom is knowing which fights to avoid.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'peaceful_departure',
              probability: 1.0,
              description: 'You depart without incident',
              narrativeText:
                'You broadcast: "Dispute noted. Continuing on my flight plan."\n\nNeither side objects. You\'re irrelevant to their conflict.\n\nAs you leave, weapons fire erupts behind you. Someone made a choice. You\'re glad it wasn\'t you.',
              resourceChange: {},
              setFlags: ['avoided_conflict', 'neutral_observer'],
            },
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// ANCIENT MYSTERY (Exploration-Focused)
// ============================================================================

export const MISSION_MONOLITH: NarrativeMission = {
  id: 'mystery_ancient_monolith',
  type: 'mystery',
  title: 'The Monolith',
  description: 'Alien structure. Ancient beyond measure. Transmitting.',

  triggerConditions: {
    location: ['deep_space', 'orbit'],
    probability: 0.15, // Rare
  },

  mood: 'awe',
  narrativeWeight: 'critical',
  isRepeatable: false,

  initialStageId: 'detection',

  stages: [
    {
      id: 'detection',
      title: 'Impossible Object',
      description: 'Your sensors detect something that shouldn\'t exist.',
      narrativeText:
        'Gravity anomaly. Mass signature: 2.7 million kg. Shape: perfect octahedron, 200m per edge.\n\nMaterial: unknown. Age: minimum 50,000 years. Possibly far older.\n\nIt\'s transmitting. Patterns. Mathematics. Something else.\n\nYou are the first human to see this in recorded history.',

      visualDescription: 'Black surface. Perfect geometry. Starlight bends around it. Beautiful. Terrifying.',
      sensorData: 'EM emission: 1.42 GHz | Pattern complexity: extreme | Temperature: 2.7K (ambient)',

      choices: [
        {
          id: 'full_study',
          text: 'Comprehensive Study Protocol',
          description: 'Days of analysis. Full spectral scan, pattern analysis, recording.',
          requires: {
            power: 500,
            time: 72,
            supplies: 20,
          },
          isProbabilistic: false,
          isIrreversible: false,
          flavorText: 'This is why you came to space. To discover. To understand.',
          riskLevel: 'medium',

          outcomes: [
            {
              id: 'major_discovery',
              probability: 1.0,
              description: 'Decode transmission, unlock profound knowledge',
              narrativeText:
                'Three days of observation. The patterns are mathematical proofs. Theorems. Physical constants.\n\nThen: coordinates. Star charts. Locations of other monoliths.\n\nThis is a network. A library. Built by something vast and patient.\n\nYou\'ve found a piece of their message.',
              resourceChange: {
                power: -500,
                time: -72,
                supplies: -20,
              },
              knowledgeGained: [KNOWLEDGE_DATABASE[0]], // precursor_language_alpha
              setFlags: ['monolith_fully_studied', 'precursor_contact'],
              mapReveal: 'precursor_network',
              nextStageId: 'deep_understanding',
            },
          ],
        },
        {
          id: 'quick_scan',
          text: 'Basic Survey',
          description: 'Record essential data, minimize resource investment.',
          requires: {
            power: 100,
            time: 6,
          },
          isProbabilistic: false,
          isIrreversible: false,
          flavorText: 'Document it. Sell the data. Move on. Pragmatic.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'surface_knowledge',
              probability: 1.0,
              description: 'Basic data recorded, suitable for sale',
              narrativeText:
                'Six hours of scanning. You record: dimensions, material composition, transmission frequency.\n\nEnough to prove you found it. Enough to sell to research institutions.\n\nBut you wonder what you\'re leaving behind.',
              resourceChange: {
                power: -100,
                time: -6,
              },
              setFlags: ['monolith_documented', 'missed_opportunity'],
              marketValue: 25000, // Can sell this data
            },
          ],
        },
        {
          id: 'take_sample',
          text: 'Extract Sample',
          description: 'Physically collect material from structure.',
          requires: {
            power: 150,
            time: 8,
            cargo_space: 5,
          },
          isProbabilistic: true,
          isIrreversible: true,
          flavorText: 'Touch the untouchable. Take a piece of eternity.',
          riskLevel: 'high',

          outcomes: [
            {
              id: 'sample_success',
              probability: 0.5,
              description: 'Sample collected, unknown properties',
              narrativeText:
                'You approach with sample drone. Cutting laser activates.\n\nThe material resists. Temperature: 6000K required. The sample finally breaks free: 2.3 kg.\n\nThe monolith does not react. Or perhaps it does, in ways you can\'t detect.',
              resourceChange: {
                power: -150,
                time: -8,
                cargo_space: -5,
              },
              techUnlock: 'precursor_material',
              setFlags: ['monolith_sample_taken', 'precursor_artifact'],
            },
            {
              id: 'sample_reaction',
              probability: 0.3,
              description: 'Monolith responds to sampling attempt',
              narrativeText:
                'The laser touches the surface. Immediately: the transmission changes. Intensity increases 1000x.\n\nYour ship\'s systems overload. EM pulse. Blackout.\n\nWhen power returns, the monolith is gone. No debris. No trace. Just empty space.\n\nDid you anger it? Or did it simply leave?',
              resourceChange: {
                power: -400, // System damage
                time: -8,
              },
              hullDamage: 20,
              setFlags: ['monolith_vanished', 'unknown_consequences'],
            },
            {
              id: 'sample_failure',
              probability: 0.2,
              description: 'Material impossible to sample',
              narrativeText:
                'The cutting laser does nothing. Diamond drill: nothing. Plasma torch: nothing.\n\nThe material is indestructible by any means available to you.\n\nYou leave empty-handed, humbled.',
              resourceChange: {
                power: -150,
                time: -8,
              },
              setFlags: ['monolith_impervious'],
            },
          ],
        },
        {
          id: 'call_science_team',
          text: 'Report to Scientific Community',
          description: 'Transmit coordinates to research institutions. Share the discovery.',
          requires: {
            power: 50,
          },
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'Some things are too important for profit. This belongs to humanity.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'science_response',
              probability: 1.0,
              description: 'Research teams mobilize, reward offered',
              narrativeText:
                'You transmit: "Precursor artifact confirmed. Coordinates attached."\n\nWithin hours: responses from six universities, three governments, multiple private institutions.\n\nA research fleet will arrive in weeks. They credit you as discoverer. Your name will be in the history books.\n\nReward: 50,000 credits, honorary research fellowship.',
              resourceChange: {
                power: -50,
              },
              reputationChange: {
                scientific_community: 100,
              },
              setFlags: ['shared_monolith_discovery', 'famous_explorer'],
            },
          ],
        },
        {
          id: 'ignore_monolith',
          text: 'Continue Without Investigation',
          description: 'Some mysteries are best left alone.',
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'Curiosity killed more than just cats.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'pass_by',
              probability: 1.0,
              description: 'You leave the monolith behind',
              narrativeText:
                'You alter course. Give it a wide berth. Continue on.\n\nBehind you, the monolith transmits into the void. Patient. Eternal. Waiting for someone who will listen.\n\nMaybe you made the wise choice. Maybe you missed the discovery of a lifetime.',
              resourceChange: {},
              setFlags: ['avoided_monolith', 'fear_of_unknown'],
            },
          ],
        },
      ],
    },
    {
      id: 'deep_understanding',
      title: 'The Message',
      description: 'You\'ve decoded part of the transmission. It changes everything.',
      narrativeText:
        'The patterns resolve into meaning:\n\n"We were here. We left. We will return."\n\nCoordinates follow: seventeen locations. A network spanning the galaxy.\n\nOne location is marked different: origin point. The first monolith. The source.\n\nYou now carry knowledge that changes human understanding of the universe.',

      visualDescription: 'Star charts appear in your mind. You understand them. Perfectly.',
      sensorData: 'Neural interface detected. Information transfer: direct. Mechanism: unknown.',

      choices: [
        {
          id: 'seek_origin',
          text: 'Seek the Origin Monolith',
          description: 'Follow the coordinates to the source.',
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'The call of discovery. Impossible to resist.',
          riskLevel: 'extreme',

          outcomes: [
            {
              id: 'journey_begins',
              probability: 1.0,
              description: 'New mission: journey to the origin point',
              narrativeText:
                'You set course. The origin is far. Months of travel. Unknown dangers.\n\nBut you must know. What built these? Why did they leave? Will they return?\n\nThe answers wait at the beginning.',
              resourceChange: {},
              setFlags: ['seeking_precursor_origin', 'epic_quest_begun'],
              unlocksMissions: ['precursor_origin_chain'],
            },
          ],
        },
        {
          id: 'share_knowledge',
          text: 'Share Knowledge with Humanity',
          description: 'Broadcast the decoded information to all.',
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'Free information. Open source. The data belongs to everyone.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'information_spreads',
              probability: 1.0,
              description: 'The knowledge spreads across human space',
              narrativeText:
                'You upload everything. Unencrypted. Public domain.\n\nWithin days: thousands of ships heading to monolith locations. Research explosion. New discoveries.\n\nSome call you a hero. Others say you\'ve endangered humanity by awakening ancient attention.\n\nTime will tell which is true.',
              resourceChange: {},
              reputationChange: {
                scientific_community: 50,
                military: -30, // They wanted to keep it secret
              },
              setFlags: ['shared_precursor_knowledge', 'information_liberation'],
            },
          ],
        },
        {
          id: 'sell_knowledge',
          text: 'Sell to Highest Bidder',
          description: 'This information is worth millions.',
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'Capitalism. You risked everything for this. Get paid.',
          riskLevel: 'medium',

          outcomes: [
            {
              id: 'profitable_sale',
              probability: 1.0,
              description: 'Massive payment, exclusive rights transferred',
              narrativeText:
                'Bidding war. Corporations, governments, private collectors.\n\nFinal price: 500,000 credits. Zenith Corp wins. They classify it immediately.\n\nYou\'re rich. The knowledge is locked away. You wonder if you made the right choice.',
              resourceChange: {},
              reputationChange: {
                zenith_corp: 50,
                scientific_community: -60, // They hate you
              },
              setFlags: ['sold_precursor_knowledge', 'wealthy_seller'],
            },
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// MORAL DILEMMA (Ethics-Focused)
// ============================================================================

export const MISSION_LIFE_POD_CALCULUS: NarrativeMission = {
  id: 'moral_life_pod_calculus',
  type: 'moral',
  title: 'The Numbers',
  description: 'Four distress calls. Fuel for one rescue. You choose who lives.',

  triggerConditions: {
    location: ['deep_space'],
    minFuel: 100,
    probability: 0.2,
  },

  mood: 'dread',
  narrativeWeight: 'critical',
  isRepeatable: false,

  initialStageId: 'distress_calls',

  stages: [
    {
      id: 'distress_calls',
      title: 'Multiple Emergencies',
      description: 'Four life pods. One tank of fuel.',
      narrativeText:
        'Catastrophe: passenger liner "Meridian" suffered catastrophic reactor failure. Evacuation incomplete before explosion.\n\nYour sensors detect four life pods, scattered across 200,000 km. Life support failing in all of them.\n\nYour fuel reserves: enough to reach ONE pod and return to station.\n\nChoose.',

      visualDescription: 'Four beacons blinking in the dark. Time remaining: 6 hours.',
      sensorData:
        'Pod A: 20 occupants (civilian, commercial passengers)\n' +
        'Pod B: 3 occupants (scientists, critical research data)\n' +
        'Pod C: 5 occupants (children, school transport group)\n' +
        'Pod D: 1 occupant (Admiral Chen, military VIP, 100,000cr reward)',

      choices: [
        {
          id: 'rescue_pod_a',
          text: 'Rescue Pod A (20 civilians)',
          description: 'Maximum lives saved. Utilitarian choice.',
          requires: {
            fuel: 80,
            time: 6,
          },
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'The greatest good for the greatest number.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'civilians_saved',
              probability: 1.0,
              description: '20 people survive',
              narrativeText:
                'You dock with Pod A. Twenty frightened faces. Families. Elderly. Young adults.\n\nThey board. Grateful. Crying.\n\nAs you depart, Pod C\'s beacon - the children - goes silent. Then Pod B. Then Pod D.\n\nYou saved the most people. You listen to their thanks and feel nothing but weight.',
              resourceChange: {
                fuel: -80,
                time: -6,
                cargo_space: -20,
              },
              reputationChange: {
                civilians: 40,
              },
              setFlags: ['chose_maximum_lives', 'utilitarian_choice', 'children_died'],
              crewEffect: 'morale_penalty',
            },
          ],
        },
        {
          id: 'rescue_pod_b',
          text: 'Rescue Pod B (3 scientists)',
          description: 'Save critical research. Long-term thinking.',
          requires: {
            fuel: 75,
            time: 6,
          },
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'Their research could save millions. Eventually.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'scientists_saved',
              probability: 1.0,
              description: 'Research preserved, 3 lives saved',
              narrativeText:
                'Dr. Yuki Chen, Dr. James Rodriguez, Dr. Sarah Kim. Quantum field researchers.\n\nTheir data could revolutionize FTL travel. Save millions of future lives. Maybe.\n\nYou rescue them. They thank you. Professional. Rational.\n\nThe other pods go silent. 26 people. Including five children.\n\nYou made the logical choice. Logic feels like ice.',
              resourceChange: {
                fuel: -75,
                time: -6,
                cargo_space: -3,
              },
              knowledgeGained: [KNOWLEDGE_DATABASE[1]], // quantum_signature_data
              reputationChange: {
                scientific_community: 60,
                civilians: -40,
              },
              setFlags: ['chose_research_over_lives', 'pragmatic_monster'],
            },
          ],
        },
        {
          id: 'rescue_pod_c',
          text: 'Rescue Pod C (5 children)',
          description: 'Save the youngest. Emotional choice.',
          requires: {
            fuel: 70,
            time: 6,
          },
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'They have their whole lives ahead of them.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'children_saved',
              probability: 1.0,
              description: '5 children survive',
              narrativeText:
                'Five children. Ages 8 to 14. School field trip to the orbital observatory.\n\nThey board your ship. Scared. Confused. One asks: "Where are my parents?"\n\nYou don\'t answer. Her parents were in Pod A. Now silent.\n\nYou saved five lives. Condemned 24 others. There was no good choice.\n\nOnly the one you could live with.',
              resourceChange: {
                fuel: -70,
                time: -6,
                cargo_space: -5,
              },
              reputationChange: {
                civilians: 50,
              },
              setFlags: ['chose_children', 'emotional_choice', 'survivor_guilt'],
              crewEffect: 'morale_boost',
            },
          ],
        },
        {
          id: 'rescue_pod_d',
          text: 'Rescue Pod D (Admiral)',
          description: 'Save VIP. Secure massive reward and connections.',
          requires: {
            fuel: 85,
            time: 6,
          },
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'One important life vs many ordinary ones. Politics.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'admiral_saved',
              probability: 1.0,
              description: 'VIP rescued, massive reward, controversial choice',
              narrativeText:
                'Admiral Marcus Chen. War hero. Strategic mind. Political power.\n\nYou dock with Pod D. He boards. One man.\n\n"You made the right choice," he says. "I can do more good alive than those others."\n\nReward: 100,000 credits. Military connections. Future favors.\n\n29 people died. Including five children. Because you chose wealth and power.\n\nThe admiral shakes your hand. You feel sick.',
              resourceChange: {
                fuel: -85,
                time: -6,
                cargo_space: -1,
              },
              reputationChange: {
                military: 80,
                civilians: -70,
                scientific_community: -40,
              },
              setFlags: ['chose_money_over_lives', 'moral_corruption', 'infamous_choice'],
              crewEffect: 'morale_catastrophic',
            },
          ],
        },
        {
          id: 'rescue_none',
          text: 'Rescue No One',
          description: 'Preserve fuel. Your mission is more important.',
          isProbabilistic: false,
          isIrreversible: true,
          flavorText: 'You didn\'t cause this disaster. Not your responsibility.',
          riskLevel: 'low',

          outcomes: [
            {
              id: 'abandoned_all',
              probability: 1.0,
              description: 'You continue your mission. 29 people die.',
              narrativeText:
                'You broadcast: "Unable to assist. Insufficient fuel reserves. Relaying your position to authorities."\n\nThe nearest rescue ship: 18 hours away. Their life support will fail in 6.\n\nYou maintain course. Professional. Rational. Alive.\n\nThe beacons go silent, one by one.\n\nYou saved your fuel. Your ship. Your mission. Yourself.\n\nSome nights you still hear those final transmissions.',
              resourceChange: {},
              reputationChange: {
                civilians: -90,
                military: -60,
                scientific_community: -50,
              },
              setFlags: ['abandoned_dying', 'moral_nihilism', 'haunted'],
              crewEffect: 'morale_catastrophic',
            },
          ],
        },
        {
          id: 'attempt_all',
          text: 'Attempt to Rescue Everyone',
          description: 'Try to reach multiple pods. Probably impossible.',
          requires: {
            fuel: 120,
            time: 12,
          },
          isProbabilistic: true,
          isIrreversible: true,
          flavorText: 'Refuse the calculus. Save them all or die trying.',
          riskLevel: 'extreme',

          outcomes: [
            {
              id: 'heroic_failure',
              probability: 0.9,
              description: 'You run out of fuel trying, everyone dies including you',
              narrativeText:
                'You push the engines hard. Pod C first - the children. They board. 4 minutes.\n\nBurn to Pod A. The civilians. Life support critical. They board. 11 minutes.\n\nFuel gauge: 2%. One more burn.\n\nPod B. The scientists. Barely reach them. They board.\n\nFuel: 0%. Station distance: 85,000 km. No momentum. No power.\n\n28 people rescued. All will die with you, drifting.\n\n[GAME OVER - Heroic Failure]',
              resourceChange: {
                fuel: -999,
                time: -12,
              },
              setFlags: ['heroic_attempt', 'noble_death', 'game_over'],
            },
            {
              id: 'miraculous_success',
              probability: 0.1,
              description: 'Against all odds, you save everyone',
              narrativeText:
                'Impossible burns. Perfect trajectories. No wasted movement.\n\nPod C. Pod A. Pod B. Pod D. All aboard.\n\nFuel remaining: 0.3%. Enough. Barely.\n\nYou drift into station on fumes and prayer. 29 people alive. All of them.\n\nThe station controller: "That was the finest piece of flying I\'ve ever seen."\n\nYou\'re too exhausted to respond.',
              resourceChange: {
                fuel: -120,
                time: -12,
                cargo_space: -29,
              },
              reputationChange: {
                civilians: 100,
                military: 80,
                scientific_community: 60,
              },
              setFlags: ['saved_everyone', 'legendary_pilot', 'impossible_achievement'],
              crewEffect: 'morale_legendary',
            },
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// MISSION DATABASE EXPORTS
// ============================================================================

export const ALL_MISSIONS: NarrativeMission[] = [
  MISSION_DERELICT_BEACON,
  MISSION_DEAD_ZONE,
  MISSION_CONTESTED_SALVAGE,
  MISSION_MONOLITH,
  MISSION_LIFE_POD_CALCULUS,
];

export const KNOWLEDGE_BY_ID = new Map(
  KNOWLEDGE_DATABASE.map(k => [k.id, k])
);
