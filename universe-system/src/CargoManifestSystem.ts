/**
 * CargoManifestSystem - Detailed cargo management with illegal goods
 * Track cargo types, illegal status, hidden cargo, contraband detection
 */

export type CargoLegality = 'LEGAL' | 'RESTRICTED' | 'ILLEGAL' | 'CONTRABAND';

export interface CargoItem {
  id: string;
  commodity: string;
  quantity: number;
  mass: number; // kg per unit
  volume: number; // m³ per unit

  // Legality
  legality: CargoLegality;
  restrictedFactions?: string[]; // Illegal for these factions only

  // Value
  baseValue: number; // credits per unit
  volatile: boolean; // Can spoil/degrade

  // Status
  condition: number; // 0-1
  hidden: boolean; // Hidden in secret compartment
  documented: boolean; // On official manifest

  // Origin
  acquiredFrom?: string;
  acquiredAt?: number; // timestamp
}

export interface CargoHold {
  capacity: number; // total m³
  used: number; // m³ used
  cargoList: CargoItem[];

  // Compartments
  standardBays: number;
  refrigeratedBays: number;
  shieldedBays: number; // For radiation-sensitive cargo
  secretCompartments: number; // For hiding contraband

  // Status
  sealed: boolean; // Cannot be scanned if sealed (expensive)
}

export interface ScanResult {
  scanned: boolean;
  discovered: CargoItem[];
  hidden: CargoItem[];
  detectionChance: number; // 0-1
  scannerQuality: number; // 0-1
  legalIssues: boolean;
  contrabandFound: boolean;
}

export class CargoManifestSystem {
  private cargoHold: CargoHold;
  private cargoIdCounter = 0;

  // Commodity database
  private static readonly COMMODITIES: Map<string, {
    legality: CargoLegality;
    mass: number;
    volume: number;
    volatile: boolean;
    baseValue: number;
  }> = new Map([
    // Legal goods
    ['FOOD', { legality: 'LEGAL', mass: 1, volume: 0.001, volatile: true, baseValue: 10 }],
    ['WATER', { legality: 'LEGAL', mass: 1, volume: 0.001, volatile: false, baseValue: 5 }],
    ['ELECTRONICS', { legality: 'LEGAL', mass: 2, volume: 0.002, volatile: false, baseValue: 100 }],
    ['METALS', { legality: 'LEGAL', mass: 10, volume: 0.005, volatile: false, baseValue: 20 }],
    ['TEXTILES', { legality: 'LEGAL', mass: 0.5, volume: 0.003, volatile: false, baseValue: 15 }],
    ['MEDICAL_SUPPLIES', { legality: 'LEGAL', mass: 0.5, volume: 0.001, volatile: true, baseValue: 200 }],

    // Restricted
    ['WEAPONS', { legality: 'RESTRICTED', mass: 5, volume: 0.005, volatile: false, baseValue: 500 }],
    ['MILITARY_TECH', { legality: 'RESTRICTED', mass: 2, volume: 0.002, volatile: false, baseValue: 1000 }],
    ['RARE_ELEMENTS', { legality: 'RESTRICTED', mass: 1, volume: 0.0005, volatile: false, baseValue: 800 }],

    // Illegal
    ['NARCOTICS', { legality: 'ILLEGAL', mass: 0.1, volume: 0.0001, volatile: false, baseValue: 2000 }],
    ['STOLEN_GOODS', { legality: 'ILLEGAL', mass: 2, volume: 0.002, volatile: false, baseValue: 300 }],
    ['COUNTERFEIT_CREDITS', { legality: 'ILLEGAL', mass: 0.01, volume: 0.0001, volatile: false, baseValue: 5000 }],

    // Contraband
    ['SLAVE_PODS', { legality: 'CONTRABAND', mass: 100, volume: 0.1, volatile: false, baseValue: 10000 }],
    ['BIOWEAPONS', { legality: 'CONTRABAND', mass: 0.5, volume: 0.001, volatile: true, baseValue: 50000 }],
    ['ANTIMATTER', { legality: 'CONTRABAND', mass: 0.001, volume: 0.0001, volatile: true, baseValue: 100000 }]
  ]);

  constructor(capacity: number = 100) {
    this.cargoHold = {
      capacity,
      used: 0,
      cargoList: [],
      standardBays: 10,
      refrigeratedBays: 2,
      shieldedBays: 1,
      secretCompartments: 0,
      sealed: false
    };
  }

  /**
   * Add cargo
   */
  public addCargo(
    commodity: string,
    quantity: number,
    hidden: boolean = false,
    documented: boolean = true
  ): {
    success: boolean;
    message: string;
    cargoId?: string;
  } {
    const commodityData = CargoManifestSystem.COMMODITIES.get(commodity);

    if (!commodityData) {
      return {
        success: false,
        message: `Unknown commodity: ${commodity}`
      };
    }

    const volume = commodityData.volume * quantity;

    if (this.cargoHold.used + volume > this.cargoHold.capacity) {
      return {
        success: false,
        message: `Insufficient cargo space. Need ${volume.toFixed(2)}m³, have ${(this.cargoHold.capacity - this.cargoHold.used).toFixed(2)}m³ available`
      };
    }

    // Check if can hide cargo
    if (hidden && this.cargoHold.secretCompartments === 0) {
      return {
        success: false,
        message: 'No secret compartments available for hiding cargo'
      };
    }

    const cargoItem: CargoItem = {
      id: `cargo_${this.cargoIdCounter++}`,
      commodity,
      quantity,
      mass: commodityData.mass,
      volume: commodityData.volume,
      legality: commodityData.legality,
      baseValue: commodityData.baseValue,
      volatile: commodityData.volatile,
      condition: 1.0,
      hidden,
      documented,
      acquiredAt: Date.now() / 1000
    };

    this.cargoHold.cargoList.push(cargoItem);
    this.cargoHold.used += volume;

    console.log(`[CARGO] Added ${quantity} ${commodity} (${volume.toFixed(2)}m³)${hidden ? ' [HIDDEN]' : ''}${!documented ? ' [UNDOCUMENTED]' : ''}`);

    return {
      success: true,
      message: `Added ${quantity} units of ${commodity}`,
      cargoId: cargoItem.id
    };
  }

  /**
   * Remove cargo
   */
  public removeCargo(cargoId: string, quantity?: number): {
    success: boolean;
    message: string;
    removed: number;
  } {
    const index = this.cargoHold.cargoList.findIndex(c => c.id === cargoId);

    if (index === -1) {
      return {
        success: false,
        message: 'Cargo not found',
        removed: 0
      };
    }

    const cargo = this.cargoHold.cargoList[index];
    const removeQty = quantity || cargo.quantity;

    if (removeQty > cargo.quantity) {
      return {
        success: false,
        message: `Cannot remove ${removeQty}, only have ${cargo.quantity}`,
        removed: 0
      };
    }

    const volumeFreed = cargo.volume * removeQty;

    if (removeQty === cargo.quantity) {
      // Remove entire item
      this.cargoHold.cargoList.splice(index, 1);
    } else {
      // Reduce quantity
      cargo.quantity -= removeQty;
    }

    this.cargoHold.used -= volumeFreed;

    return {
      success: true,
      message: `Removed ${removeQty} units of ${cargo.commodity}`,
      removed: removeQty
    };
  }

  /**
   * Jettison cargo (emergency dump)
   */
  public jettisonCargo(cargoId: string): {
    success: boolean;
    message: string;
  } {
    const result = this.removeCargo(cargoId);

    if (result.success) {
      console.log(`[CARGO] ⚠ Jettisoned cargo!`);
      return {
        success: true,
        message: 'Cargo jettisoned into space'
      };
    }

    return {
      success: false,
      message: result.message
    };
  }

  /**
   * Perform cargo scan
   */
  public performScan(scannerQuality: number = 0.7): ScanResult {
    if (this.cargoHold.sealed) {
      return {
        scanned: false,
        discovered: [],
        hidden: [],
        detectionChance: 0,
        scannerQuality,
        legalIssues: false,
        contrabandFound: false
      };
    }

    const discovered: CargoItem[] = [];
    const hidden: CargoItem[] = [];

    for (const cargo of this.cargoHold.cargoList) {
      if (cargo.hidden) {
        // Chance to detect hidden cargo
        const detectionChance = scannerQuality * 0.3; // Hidden cargo harder to find
        if (Math.random() < detectionChance) {
          discovered.push(cargo);
        } else {
          hidden.push(cargo);
        }
      } else {
        discovered.push(cargo);
      }
    }

    const legalIssues = discovered.some(c =>
      c.legality === 'ILLEGAL' || c.legality === 'CONTRABAND' || c.legality === 'RESTRICTED'
    );

    const contrabandFound = discovered.some(c => c.legality === 'CONTRABAND');

    return {
      scanned: true,
      discovered,
      hidden,
      detectionChance: scannerQuality,
      scannerQuality,
      legalIssues,
      contrabandFound
    };
  }

  /**
   * Get cargo manifest (documented cargo only)
   */
  public getOfficialManifest(): CargoItem[] {
    return this.cargoHold.cargoList.filter(c => c.documented && !c.hidden);
  }

  /**
   * Get full cargo list
   */
  public getFullCargoList(): CargoItem[] {
    return [...this.cargoHold.cargoList];
  }

  /**
   * Get cargo by commodity
   */
  public getCargoByCommodity(commodity: string): CargoItem | null {
    return this.cargoHold.cargoList.find(c => c.commodity === commodity) || null;
  }

  /**
   * Get total cargo value
   */
  public getTotalCargoValue(): number {
    return this.cargoHold.cargoList.reduce((sum, cargo) => {
      return sum + (cargo.baseValue * cargo.quantity * cargo.condition);
    }, 0);
  }

  /**
   * Check for illegal cargo
   */
  public hasIllegalCargo(): boolean {
    return this.cargoHold.cargoList.some(c =>
      c.legality === 'ILLEGAL' || c.legality === 'CONTRABAND'
    );
  }

  /**
   * Check for contraband
   */
  public hasContraband(): boolean {
    return this.cargoHold.cargoList.some(c => c.legality === 'CONTRABAND');
  }

  /**
   * Update cargo condition (volatile goods degrade)
   */
  public updateCargo(deltaTime: number): void {
    for (const cargo of this.cargoHold.cargoList) {
      if (cargo.volatile) {
        // Degrade by 1% per hour
        cargo.condition -= (deltaTime / 3600) * 0.01;
        cargo.condition = Math.max(0, cargo.condition);

        if (cargo.condition <= 0) {
          console.log(`[CARGO] ⚠ ${cargo.commodity} has spoiled!`);
        } else if (cargo.condition < 0.5) {
          console.log(`[CARGO] Warning: ${cargo.commodity} degrading (${(cargo.condition * 100).toFixed(0)}%)`);
        }
      }
    }
  }

  /**
   * Install secret compartment
   */
  public installSecretCompartment(): void {
    this.cargoHold.secretCompartments++;
    console.log(`[CARGO] Secret compartment installed (total: ${this.cargoHold.secretCompartments})`);
  }

  /**
   * Seal cargo hold (expensive but prevents scans)
   */
  public sealCargoHold(): void {
    this.cargoHold.sealed = true;
    console.log('[CARGO] Cargo hold sealed - cannot be scanned');
  }

  /**
   * Unseal cargo hold
   */
  public unsealCargoHold(): void {
    this.cargoHold.sealed = false;
    console.log('[CARGO] Cargo hold unsealed');
  }

  /**
   * Get cargo status string
   */
  public getCargoStatus(): string {
    const lines: string[] = [];

    lines.push('=== CARGO MANIFEST ===');
    lines.push(`Capacity: ${this.cargoHold.used.toFixed(1)}/${this.cargoHold.capacity} m³ (${((this.cargoHold.used / this.cargoHold.capacity) * 100).toFixed(0)}%)`);
    lines.push(`Value: ${this.getTotalCargoValue().toFixed(0)} credits`);

    if (this.cargoHold.sealed) {
      lines.push('Status: SEALED (scan-proof)');
    }

    if (this.cargoHold.secretCompartments > 0) {
      lines.push(`Secret Compartments: ${this.cargoHold.secretCompartments}`);
    }

    lines.push('');

    if (this.cargoHold.cargoList.length === 0) {
      lines.push('Cargo hold empty');
    } else {
      lines.push('Cargo:');

      for (const cargo of this.cargoHold.cargoList) {
        const flags: string[] = [];

        if (cargo.hidden) flags.push('HIDDEN');
        if (!cargo.documented) flags.push('UNDOCUMENTED');
        if (cargo.legality !== 'LEGAL') flags.push(cargo.legality);
        if (cargo.condition < 1.0) flags.push(`${(cargo.condition * 100).toFixed(0)}%`);

        const flagsStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        const totalVolume = (cargo.volume * cargo.quantity).toFixed(2);

        lines.push(`  ${cargo.quantity}x ${cargo.commodity} (${totalVolume}m³)${flagsStr}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get cargo hold info
   */
  public getCargoHold(): CargoHold {
    return { ...this.cargoHold, cargoList: [...this.cargoHold.cargoList] };
  }

  /**
   * Check if commodity is legal
   */
  public static isLegal(commodity: string): boolean {
    const data = CargoManifestSystem.COMMODITIES.get(commodity);
    return data ? data.legality === 'LEGAL' : true;
  }

  /**
   * Get commodity info
   */
  public static getCommodityInfo(commodity: string) {
    return CargoManifestSystem.COMMODITIES.get(commodity);
  }
}
