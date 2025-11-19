# PopulationSystem Flow Diagram

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                         POPULATION SYSTEM OVERVIEW                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────┐
│                          CITY INFRASTRUCTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│  • Food Production       • Medical Quality      • Power Generation      │
│  • Water Supply         • Transportation       • Waste Recycling        │
│  • Services (entertainment, banking, etc.)                              │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        POPULATION NEEDS (0-1)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Food (25%)  ━━━━━━━━━━━━━━━━━━━━━━┐                                    │
│  Water (20%) ━━━━━━━━━━━━━━━━━━━┐  │                                    │
│  Employment (20%) ━━━━━━━━━━━━┐ │  │                                    │
│  Shelter (15%) ━━━━━━━━━━━━┐  │ │  │                                    │
│  Healthcare (10%) ━━━━━┐   │  │ │  │                                    │
│  Safety (5%) ━━━━┐      │   │  │ │  │                                    │
│  Entertainment (5%) ┐    │   │  │ │  │                                    │
└────────────────────┼────┼───┼──┼─┼──┼────────────────────────────────────┘
                     │    │   │  │ │  │
                     └────┴───┴──┴─┴──┴─────► WEIGHTED AVERAGE
                                              + Stability Bonus
                                              + Wealth Bonus
                                              - Corruption Penalty
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          HAPPINESS (0-1)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  HIGH (>0.7)    │  MEDIUM (0.4-0.7)  │  LOW (0.3-0.4)  │  VERY LOW (<0.3)│
│  ✓ Growth       │  • Stable          │  ⚠ Migration    │  ⚠⚠ UNREST     │
│  ✓ Low Crime    │  • Some Migration  │  ⚠ Protests     │  ⚠⚠ Riots       │
│  ✓ Productive   │  • Moderate Crime  │  ⚠ Decline      │  ⚠⚠ Revolution  │
└───────┬──────────────────┬─────────────────┬──────────────────┬──────────┘
        │                  │                 │                  │
        ▼                  ▼                 ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐
│  POPULATION   │  │   MIGRATION   │  │    UNREST    │  │  FACTION        │
│    GROWTH     │  │   MECHANICS   │  │   EVENTS     │  │  RESPONSE       │
└───────────────┘  └───────────────┘  └──────────────┘  └─────────────────┘
```

## Detailed System Flow

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                         POPULATION GROWTH CYCLE                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

CITIZEN GROUP (Adults)
  │
  ├─► Birth Rate Calculation
  │     │
  │     ├─ Base: 1.2% per year
  │     ├─ × (1 + happiness modifier)      [-0.4 to +0.4]
  │     ├─ × (1 + healthcare modifier)     [0 to +0.5]
  │     ├─ × (1 + wealth modifier)         [-0.3 to +0.3]
  │     └─ × (1 - education × 0.3)         [-0.3 to 0]
  │           │
  │           └─► Births → Add to CHILD population
  │
  └─► Death Rate Calculation
        │
        ├─ Base: 0.8% per year
        ├─ × (1 - healthcare modifier)     [0.5 to 1.0]
        ├─ × (1 - health × 0.5)            [0.5 to 1.0]
        └─ × (food < 0.3 ? 2.0 : 1.0)      [1.0 or 2.0 if starving]
              │
              └─► Deaths → Remove from population

Net Growth = Births - Deaths
  │
  ├─► Positive: Population grows 0.4-2% per year
  ├─► Zero: Population stable
  └─► Negative: Population declines 0-5% per year


╔═══════════════════════════════════════════════════════════════════════════╗
║                           MIGRATION FLOW                                  ║
╚═══════════════════════════════════════════════════════════════════════════╝

UNHAPPY CITIZEN GROUP
  │
  ├─► Calculate Migration Desire
  │     │
  │     ├─ Base: max(0, 1 - happiness - 0.3)
  │     ├─ +0.3 if unemployed
  │     ├─ +0.2 if unsafe
  │     ├─ ×0.5 if wealthy
  │     └─ ×0.3 if elderly
  │           │
  │           └─► Migration Desire (0-1)
  │
  └─► If Desire > 0.4:
        │
        ├─► Search for Better City
        │     │
        │     └─► Score = Employment×2 + Happiness×1.5 + log(Wealth) - Distance
        │
        └─► Migrate (max 10% per update)
              │
              ├─► Remove from Source City
              ├─► Add to Destination City
              └─► Record Migration Event


╔═══════════════════════════════════════════════════════════════════════════╗
║                          SOCIAL UNREST FLOW                               ║
╚═══════════════════════════════════════════════════════════════════════════╝

CITY HAPPINESS CHECK
  │
  └─► Average Happiness < 0.3?
        │
        YES
        │
        ├─► Calculate Severity = (0.3 - happiness) × 2
        │
        ├─► Determine Unrest Type:
        │     │
        │     ├─ Happiness < 0.15 & Severity > 0.8 → REVOLUTION
        │     ├─ Severity > 0.6 → REBELLION
        │     ├─ Severity > 0.4 → RIOT
        │     ├─ Unemployment > 0.6 → STRIKE
        │     └─ Default → PROTEST
        │
        ├─► Calculate Participants:
        │     │
        │     └─ Unhappy Citizens × Political Engagement × Severity
        │
        ├─► Generate Demands:
        │     │
        │     ├─ Food < 0.5 → "Improve food supply"
        │     ├─ Employment < 0.5 → "Create more jobs"
        │     ├─ Healthcare < 0.4 → "Better healthcare"
        │     ├─ Crime > 0.6 → "Reduce crime"
        │     └─ Corruption > 0.6 → "End corruption"
        │
        └─► Apply Effects:
              │
              ├─ Reduce GDP by (severity × 50%)
              ├─ Increase crime (if riot/rebellion)
              ├─ Decrease stability by (severity × 5%)
              └─ Potentially overthrow government (revolution)


╔═══════════════════════════════════════════════════════════════════════════╗
║                         LABOR MARKET DYNAMICS                             ║
╚═══════════════════════════════════════════════════════════════════════════╝

POPULATION (by age)
  │
  ├─► CHILDREN (20%)
  │     └─ Don't work, consume resources, eventually age to adults
  │
  ├─► ADULTS (65%)
  │     │
  │     └─► WORKFORCE (by skill)
  │           │
  │           ├─ UNSKILLED (10-70% based on tech)
  │           │   └─ Wage: 0.6 × GDP per capita
  │           │
  │           ├─ SKILLED (25-40%)
  │           │   └─ Wage: 1.0 × GDP per capita
  │           │
  │           ├─ PROFESSIONAL (4-40%)
  │           │   └─ Wage: 1.8 × GDP per capita
  │           │
  │           └─ SPECIALIZED (1-20%)
  │               └─ Wage: 2.5 × GDP per capita
  │
  └─► ELDERLY (15%)
        └─ Retired, higher healthcare needs, higher death rate


╔═══════════════════════════════════════════════════════════════════════════╗
║                      FACTION INTEGRATION POINTS                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

POPULATION PROBLEMS
  │
  ├─► Happiness < 0.4
  │     └─► Faction Priority: "IMPROVE_LIVING_CONDITIONS"
  │           │
  │           ├─ Increase wages
  │           ├─ Build infrastructure
  │           ├─ Reduce taxes
  │           └─ Improve services
  │
  ├─► Mass Migration (>10k citizens)
  │     └─► Faction Priority: "ADDRESS_EMIGRATION"
  │           │
  │           ├─ Create jobs
  │           ├─ Improve security
  │           └─ Reduce crime
  │
  ├─► Active Unrest
  │     └─► Faction Response: "HANDLE_UNREST"
  │           │
  │           ├─ PROTEST → Monitor, consider concessions
  │           ├─ STRIKE → Negotiate, meet demands
  │           ├─ RIOT → Deploy security, restore order
  │           ├─ REBELLION → Military response
  │           └─ REVOLUTION → Full crisis mode
  │
  └─► Labor Shortage (high-skill workers needed)
        └─► Faction Priority: "EDUCATION_INVESTMENT"
              │
              ├─ Build schools/universities
              ├─ Attract skilled immigrants
              └─ Training programs


╔═══════════════════════════════════════════════════════════════════════════╗
║                          TIME SCALES                                      ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────────┐
│  IMMEDIATE (seconds to hours)                                           │
│    • Needs satisfaction updates                                         │
│    • Happiness calculations                                             │
│    • Unrest event creation                                              │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  SHORT TERM (days to weeks)                                             │
│    • Migration events                                                   │
│    • Unrest duration (24-336 hours)                                     │
│    • Health changes                                                     │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  MEDIUM TERM (months to years)                                          │
│    • Population growth/decline (visible annually)                       │
│    • Skill composition changes                                          │
│    • Wealth accumulation                                                │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  LONG TERM (years to decades)                                           │
│    • Demographic shifts (aging)                                         │
│    • Major population growth (2-3% annually when happy)                 │
│    • Tech-driven skill evolution                                        │
└────────────────────────────────────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║                      KEY FEEDBACK LOOPS                                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────┐
│  POSITIVE FEEDBACK (Success Spiral)                                      │
│                                                                           │
│  Good Infrastructure → Needs Met → Happiness ↑                          │
│       ↑                                           ↓                      │
│  More Tax Revenue ← Population Growth ← High Birth Rate                 │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  NEGATIVE FEEDBACK (Death Spiral)                                        │
│                                                                           │
│  Poor Infrastructure → Needs Unmet → Unhappiness ↑                      │
│       ↓                                            ↓                      │
│  Less Tax Revenue ← Migration/Decline ← Unrest ← Low Productivity       │
│       ↓                                            ↓                      │
│  Worse Infrastructure ← Economic Collapse ← More Unhappiness             │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  BALANCING FEEDBACK (Stability)                                          │
│                                                                           │
│  Migration equalizes populations between cities                          │
│  Education reduces birth rates (prevents overpopulation)                 │
│  Faction responses address unrest (prevents collapse)                    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Example Scenario Flows

### Scenario: Economic Boom
```
Tech Company Opens
    ↓
Unemployment Drops (50% → 5%)
    ↓
Employment Need Met (0.5 → 0.95)
    ↓
Happiness Increases (0.4 → 0.75)
    ↓
┌─────────────────────┬──────────────────────┐
│                     │                      │
Birth Rate ↑         Wealth ↑           In-Migration ↑
    ↓                    ↓                    ↓
Population +1.5%/yr  Better Housing     +15k/year
    ↓                    ↓                    ↓
Larger Workforce     Happiness ↑        Skill Diversity ↑
    ↓                    ↓                    ↓
More Production      Stability ↑        Innovation ↑
    └────────────────────┴────────────────────┘
                         ↓
                  THRIVING CITY
```

### Scenario: Famine
```
Crop Failure
    ↓
Food Production Drops (0.8 → 0.2)
    ↓
Food Need Unmet (0.8 → 0.2)
    ↓
Happiness Plummets (0.6 → 0.25)
    ↓
┌─────────────────────┬──────────────────────┐
│                     │                      │
Death Rate ×2        Unrest Begins       Out-Migration ↑
    ↓                    ↓                    ↓
Pop -3%/yr          PROTESTS            -20k/year
    ↓                    ↓                    ↓
Less Workers        GDP -25%            Brain Drain
    ↓                    ↓                    ↓
Lower Production    Crime ↑             Skill Loss
    └────────────────────┴────────────────────┘
                         ↓
              FACTION MUST INTERVENE
              • Import food
              • Improve farming
              • Or city dies
```
