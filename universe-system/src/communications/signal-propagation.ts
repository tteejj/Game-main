/**
 * signal-propagation.ts
 * Signal propagation physics for realistic communications
 *
 * Implements:
 * - Friis transmission equation for signal strength
 * - Free space path loss
 * - Line of sight checks
 * - Signal interference
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';

/**
 * Signal transmission parameters
 */
export interface SignalTransmission {
  transmitterPosition: Vector3;
  receiverPosition: Vector3;
  transmitPowerWatts: number;
  frequencyHz: number;
  transmitGain: number; // dB
  receiveGain: number; // dB
}

/**
 * Signal reception result
 */
export interface SignalReception {
  receivedPowerWatts: number;
  receivedPowerDBm: number;
  pathLossDB: number;
  distance: number;
  signalToNoiseRatio: number;
  canReceive: boolean;
  quality: number; // 0-1
}

/**
 * Obstacle for line-of-sight checks
 */
export interface SignalObstacle {
  position: Vector3;
  radius: number;
  absorptionFactor: number; // 0-1, how much signal is absorbed
}

/**
 * Signal Propagation Engine
 *
 * Uses Friis transmission equation:
 * P_r = P_t × G_t × G_r × (λ / (4πd))²
 *
 * Where:
 * - P_r: Received power
 * - P_t: Transmitted power
 * - G_t: Transmitter gain
 * - G_r: Receiver gain
 * - λ: Wavelength (c / f)
 * - d: Distance
 *
 * Free Space Path Loss (FSPL):
 * FSPL(dB) = 20×log₁₀(d) + 20×log₁₀(f) + 20×log₁₀(4π/c)
 */
export class SignalPropagation {
  // Constants
  private readonly SPEED_OF_LIGHT = 299792458; // m/s
  private readonly NOISE_FLOOR_DBM = -120; // dBm (typical space noise)
  private readonly MIN_SNR_DB = 10; // Minimum SNR for reception

  /**
   * Calculate signal reception using Friis equation
   */
  public calculateReception(params: SignalTransmission): SignalReception {
    const { transmitterPosition, receiverPosition, transmitPowerWatts, frequencyHz, transmitGain, receiveGain } =
      params;

    // Calculate distance
    const distance = transmitterPosition.subtract(receiverPosition).length();

    if (distance < 1) {
      // Very close - perfect reception
      return {
        receivedPowerWatts: transmitPowerWatts,
        receivedPowerDBm: this.wattsToDBm(transmitPowerWatts),
        pathLossDB: 0,
        distance,
        signalToNoiseRatio: 100,
        canReceive: true,
        quality: 1.0
      };
    }

    // Calculate wavelength: λ = c / f
    const wavelength = this.SPEED_OF_LIGHT / frequencyHz;

    // Free Space Path Loss (FSPL)
    // FSPL(dB) = 20×log₁₀(d) + 20×log₁₀(f) + 20×log₁₀(4π/c)
    const pathLossDB = this.calculateFSPL(distance, frequencyHz);

    // Convert transmit power to dBm
    const transmitPowerDBm = this.wattsToDBm(transmitPowerWatts);

    // Calculate received power in dBm
    // P_r(dBm) = P_t(dBm) + G_t(dB) + G_r(dB) - FSPL(dB)
    const receivedPowerDBm = transmitPowerDBm + transmitGain + receiveGain - pathLossDB;

    // Convert back to watts
    const receivedPowerWatts = this.dBmToWatts(receivedPowerDBm);

    // Calculate Signal-to-Noise Ratio
    const snrDB = receivedPowerDBm - this.NOISE_FLOOR_DBM;

    // Can receive if SNR is above threshold
    const canReceive = snrDB >= this.MIN_SNR_DB;

    // Signal quality (0-1) based on SNR
    // Quality increases with SNR above minimum
    const quality = canReceive ? Math.min(1.0, (snrDB - this.MIN_SNR_DB) / 30) : 0;

    return {
      receivedPowerWatts,
      receivedPowerDBm,
      pathLossDB,
      distance,
      signalToNoiseRatio: snrDB,
      canReceive,
      quality
    };
  }

  /**
   * Calculate Free Space Path Loss
   *
   * FSPL(dB) = 20×log₁₀(d) + 20×log₁₀(f) + 20×log₁₀(4π/c)
   *           = 20×log₁₀(d) + 20×log₁₀(f) - 147.55
   */
  private calculateFSPL(distanceMeters: number, frequencyHz: number): number {
    // FSPL in dB
    const fspl =
      20 * Math.log10(distanceMeters) + 20 * Math.log10(frequencyHz) + 20 * Math.log10((4 * Math.PI) / this.SPEED_OF_LIGHT);

    return fspl;
  }

  /**
   * Convert watts to dBm
   * dBm = 10 × log₁₀(P_watts × 1000)
   */
  private wattsToDBm(watts: number): number {
    if (watts <= 0) return -Infinity;
    return 10 * Math.log10(watts * 1000);
  }

  /**
   * Convert dBm to watts
   * P_watts = 10^(dBm/10) / 1000
   */
  private dBmToWatts(dBm: number): number {
    return Math.pow(10, dBm / 10) / 1000;
  }

  /**
   * Check line of sight between transmitter and receiver
   *
   * Returns true if clear line of sight, false if blocked
   */
  public hasLineOfSight(transmitter: Vector3, receiver: Vector3, obstacles: SignalObstacle[]): boolean {
    const direction = receiver.subtract(transmitter);
    const distance = direction.length();
    const directionNorm = direction.normalize();

    for (const obstacle of obstacles) {
      // Check if obstacle is between transmitter and receiver
      const toObstacle = obstacle.position.subtract(transmitter);
      const projectionLength = toObstacle.dot(directionNorm);

      // Skip if obstacle is behind transmitter or beyond receiver
      if (projectionLength < 0 || projectionLength > distance) {
        continue;
      }

      // Calculate perpendicular distance to obstacle
      const projection = directionNorm.scale(projectionLength);
      const perpendicular = toObstacle.subtract(projection);
      const perpendicularDistance = perpendicular.length();

      // If signal path passes through obstacle, LOS is blocked
      if (perpendicularDistance < obstacle.radius) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate signal attenuation through obstacles
   *
   * Returns attenuation factor (0-1)
   */
  public calculateObstacleAttenuation(
    transmitter: Vector3,
    receiver: Vector3,
    obstacles: SignalObstacle[]
  ): number {
    const direction = receiver.subtract(transmitter);
    const distance = direction.length();
    const directionNorm = direction.normalize();

    let totalAttenuation = 1.0; // Start with no attenuation

    for (const obstacle of obstacles) {
      const toObstacle = obstacle.position.subtract(transmitter);
      const projectionLength = toObstacle.dot(directionNorm);

      if (projectionLength < 0 || projectionLength > distance) {
        continue;
      }

      const projection = directionNorm.scale(projectionLength);
      const perpendicular = toObstacle.subtract(projection);
      const perpendicularDistance = perpendicular.length();

      // If signal passes through obstacle
      if (perpendicularDistance < obstacle.radius) {
        // Attenuation increases as signal passes through center
        const penetrationFactor = 1 - perpendicularDistance / obstacle.radius;
        const attenuation = 1 - obstacle.absorptionFactor * penetrationFactor;
        totalAttenuation *= attenuation;
      }
    }

    return totalAttenuation;
  }

  /**
   * Calculate maximum communication range
   *
   * Given transmit power and gains, calculates the maximum distance
   * where SNR is above minimum threshold
   */
  public calculateMaxRange(
    transmitPowerWatts: number,
    frequencyHz: number,
    transmitGain: number,
    receiveGain: number
  ): number {
    // Start with transmit power in dBm
    const transmitPowerDBm = this.wattsToDBm(transmitPowerWatts);

    // Required received power for minimum SNR
    const requiredReceivedPowerDBm = this.NOISE_FLOOR_DBM + this.MIN_SNR_DB;

    // Maximum allowable path loss
    const maxPathLossDB = transmitPowerDBm + transmitGain + receiveGain - requiredReceivedPowerDBm;

    // Solve FSPL equation for distance
    // FSPL(dB) = 20×log₁₀(d) + 20×log₁₀(f) + 20×log₁₀(4π/c)
    // d = 10^((FSPL - 20×log₁₀(f) - 20×log₁₀(4π/c)) / 20)

    const frequencyTerm = 20 * Math.log10(frequencyHz);
    const constantTerm = 20 * Math.log10((4 * Math.PI) / this.SPEED_OF_LIGHT);

    const maxDistance = Math.pow(10, (maxPathLossDB - frequencyTerm - constantTerm) / 20);

    return maxDistance;
  }

  /**
   * Calculate required transmit power for given range
   *
   * Calculates the power needed to communicate at a specific distance
   * with minimum acceptable SNR
   */
  public calculateRequiredPower(
    distance: number,
    frequencyHz: number,
    transmitGain: number,
    receiveGain: number
  ): number {
    // Calculate FSPL at this distance
    const pathLossDB = this.calculateFSPL(distance, frequencyHz);

    // Required received power for minimum SNR
    const requiredReceivedPowerDBm = this.NOISE_FLOOR_DBM + this.MIN_SNR_DB;

    // Required transmit power in dBm
    // P_t(dBm) = P_r(dBm) + FSPL(dB) - G_t(dB) - G_r(dB)
    const requiredTransmitPowerDBm = requiredReceivedPowerDBm + pathLossDB - transmitGain - receiveGain;

    // Convert to watts
    return this.dBmToWatts(requiredTransmitPowerDBm);
  }

  /**
   * Calculate Doppler shift for moving transmitter/receiver
   *
   * Δf = f₀ × (v / c)
   *
   * Where:
   * - f₀: Original frequency
   * - v: Relative velocity (positive = moving toward)
   * - c: Speed of light
   */
  public calculateDopplerShift(
    frequencyHz: number,
    transmitterVelocity: Vector3,
    receiverVelocity: Vector3,
    transmitterPosition: Vector3,
    receiverPosition: Vector3
  ): number {
    // Relative velocity
    const relativeVelocity = receiverVelocity.subtract(transmitterVelocity);

    // Direction from transmitter to receiver
    const direction = receiverPosition.subtract(transmitterPosition).normalize();

    // Velocity component along line of sight
    const radialVelocity = relativeVelocity.dot(direction);

    // Doppler shift: Δf = f₀ × (v / c)
    const dopplerShift = frequencyHz * (radialVelocity / this.SPEED_OF_LIGHT);

    return dopplerShift;
  }

  /**
   * Get signal quality description
   */
  public getQualityDescription(quality: number): string {
    if (quality >= 0.9) return 'Excellent';
    if (quality >= 0.7) return 'Good';
    if (quality >= 0.5) return 'Fair';
    if (quality >= 0.3) return 'Poor';
    if (quality > 0) return 'Very Poor';
    return 'No Signal';
  }
}

/**
 * Communication frequency bands
 */
export enum FrequencyBand {
  VHF = 'VHF', // 30-300 MHz - Short range, atmosphere penetration
  UHF = 'UHF', // 300-3000 MHz - Medium range, general purpose
  SHF = 'SHF', // 3-30 GHz - Long range, high bandwidth
  EHF = 'EHF' // 30-300 GHz - Very long range, space communications
}

/**
 * Get frequency for band
 */
export function getFrequencyForBand(band: FrequencyBand): number {
  switch (band) {
    case FrequencyBand.VHF:
      return 150e6; // 150 MHz
    case FrequencyBand.UHF:
      return 1e9; // 1 GHz
    case FrequencyBand.SHF:
      return 10e9; // 10 GHz
    case FrequencyBand.EHF:
      return 100e9; // 100 GHz
  }
}

/**
 * Standard antenna configurations
 */
export class AntennaPresets {
  /**
   * Omnidirectional antenna (low gain, all directions)
   */
  static OMNIDIRECTIONAL = {
    gain: 2.15, // dBi (dipole)
    beamwidth: 360
  };

  /**
   * Directional antenna (medium gain, focused)
   */
  static DIRECTIONAL = {
    gain: 10, // dBi
    beamwidth: 60
  };

  /**
   * High-gain dish (long range, very focused)
   */
  static HIGH_GAIN = {
    gain: 20, // dBi
    beamwidth: 10
  };

  /**
   * Satellite antenna (very high gain)
   */
  static SATELLITE = {
    gain: 30, // dBi
    beamwidth: 2
  };
}
