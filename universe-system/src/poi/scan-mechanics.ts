/**
 * scan-mechanics.ts
 * Scanning and detection mechanics for POIs
 *
 * Implements:
 * - Radar equation for detection
 * - Scan strength calculations
 * - Discovery mechanics
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';
import { PointOfInterest } from './point-of-interest';

/**
 * Scanner configuration
 */
export interface ScannerConfig {
  power: number; // Watts
  gain: number; // dBi
  frequency: number; // Hz
  sensitivity: number; // Minimum detectable signal (dBm)
}

/**
 * Scan result
 */
export interface ScanResult {
  detected: boolean;
  signalStrength: number; // dBm
  distance: number; // meters
  canIdentify: boolean;
  canScan: boolean;
  quality: number; // 0-1
}

/**
 * Scanner presets
 */
export class ScannerPresets {
  /**
   * Basic scanner (short range)
   */
  static BASIC: ScannerConfig = {
    power: 100, // 100W
    gain: 10, // dBi
    frequency: 10e9, // 10 GHz
    sensitivity: -100 // dBm
  };

  /**
   * Advanced scanner (medium range)
   */
  static ADVANCED: ScannerConfig = {
    power: 500,
    gain: 20,
    frequency: 10e9,
    sensitivity: -110
  };

  /**
   * Military scanner (long range)
   */
  static MILITARY: ScannerConfig = {
    power: 2000,
    gain: 30,
    frequency: 10e9,
    sensitivity: -120
  };
}

/**
 * Scan Mechanics
 *
 * Uses radar equation for realistic detection:
 *
 * P_r = (P_t × G² × λ² × σ) / ((4π)³ × R⁴)
 *
 * Where:
 * - P_r: Received power
 * - P_t: Transmit power
 * - G: Antenna gain
 * - λ: Wavelength
 * - σ: Radar cross-section
 * - R: Range
 */
export class ScanMechanics {
  private readonly SPEED_OF_LIGHT = 299792458; // m/s

  /**
   * Calculate detection using radar equation
   *
   * @param scanner Scanner configuration
   * @param poi Point of Interest to detect
   * @param scannerPosition Scanner position
   * @returns Scan result
   */
  public scan(scanner: ScannerConfig, poi: PointOfInterest, scannerPosition: Vector3): ScanResult {
    // Calculate distance
    const distance = poi.getDistanceTo(scannerPosition);

    if (distance < 1) {
      // Too close - perfect detection
      return {
        detected: true,
        signalStrength: 0,
        distance,
        canIdentify: true,
        canScan: true,
        quality: 1.0
      };
    }

    // Calculate wavelength: λ = c / f
    const wavelength = this.SPEED_OF_LIGHT / scanner.frequency;

    // Radar cross-section (based on POI size and signature)
    // σ ≈ π × r²
    const radarCrossSection = Math.PI * poi.radius * poi.radius * poi.signatureStrength;

    // Radar equation:
    // P_r = (P_t × G² × λ² × σ) / ((4π)³ × R⁴)

    const numerator = scanner.power * Math.pow(scanner.gain, 2) * Math.pow(wavelength, 2) * radarCrossSection;
    const denominator = Math.pow(4 * Math.PI, 3) * Math.pow(distance, 4);

    const receivedPower = numerator / denominator;

    // Convert to dBm
    const receivedPowerDBm = 10 * Math.log10(receivedPower * 1000);

    // Can detect if signal above sensitivity threshold
    const detected = receivedPowerDBm >= scanner.sensitivity;

    // Signal-to-noise ratio
    const snr = receivedPowerDBm - scanner.sensitivity;

    // Quality based on SNR (0-1)
    const quality = detected ? Math.min(1, Math.max(0, snr / 30)) : 0;

    // Can identify if quality > 0.3
    const canIdentify = quality > 0.3;

    // Can fully scan if quality > 0.6
    const canScan = quality > 0.6;

    return {
      detected,
      signalStrength: receivedPowerDBm,
      distance,
      canIdentify,
      canScan,
      quality
    };
  }

  /**
   * Calculate maximum detection range
   *
   * Solves radar equation for R:
   * R = [(P_t × G² × λ² × σ) / ((4π)³ × P_r)]^(1/4)
   *
   * @param scanner Scanner configuration
   * @param poi Point of Interest
   * @returns Maximum detection range (meters)
   */
  public calculateMaxRange(scanner: ScannerConfig, poi: PointOfInterest): number {
    const wavelength = this.SPEED_OF_LIGHT / scanner.frequency;
    const radarCrossSection = Math.PI * poi.radius * poi.radius * poi.signatureStrength;

    // Minimum detectable power (from sensitivity)
    const minPowerWatts = Math.pow(10, scanner.sensitivity / 10) / 1000;

    const numerator = scanner.power * Math.pow(scanner.gain, 2) * Math.pow(wavelength, 2) * radarCrossSection;
    const denominator = Math.pow(4 * Math.PI, 3) * minPowerWatts;

    const maxRange = Math.pow(numerator / denominator, 0.25);

    return maxRange;
  }

  /**
   * Perform passive scan (listen for emissions)
   *
   * Some POIs emit signals that can be passively detected
   */
  public passiveScan(poi: PointOfInterest, receiverPosition: Vector3, receiverSensitivity: number): ScanResult {
    const distance = poi.getDistanceTo(receiverPosition);

    // Only certain POIs emit signals
    const isEmitting = poi.type === 'ENERGY_SIGNATURE' || poi.type === 'MYSTERIOUS_SIGNAL';

    if (!isEmitting) {
      return {
        detected: false,
        signalStrength: -Infinity,
        distance,
        canIdentify: false,
        canScan: false,
        quality: 0
      };
    }

    // Simple inverse square law for emission
    const emissionPower = 1000 * poi.signatureStrength; // Watts
    const receivedPower = emissionPower / (4 * Math.PI * distance * distance);
    const receivedPowerDBm = 10 * Math.log10(receivedPower * 1000);

    const detected = receivedPowerDBm >= receiverSensitivity;
    const snr = receivedPowerDBm - receiverSensitivity;
    const quality = detected ? Math.min(1, Math.max(0, snr / 30)) : 0;

    return {
      detected,
      signalStrength: receivedPowerDBm,
      distance,
      canIdentify: quality > 0.3,
      canScan: quality > 0.6,
      quality
    };
  }

  /**
   * Calculate scan difficulty modifier
   *
   * Factors affecting scan difficulty:
   * - Distance
   * - POI signature strength
   * - Scanner power
   * - Environmental interference
   */
  public calculateScanDifficulty(
    poi: PointOfInterest,
    distance: number,
    scanner: ScannerConfig,
    interference: number = 0
  ): number {
    // Base difficulty from POI
    let difficulty = poi.scanDifficulty;

    // Distance penalty (normalized to 100km)
    const distanceFactor = Math.min(1, distance / 100000);
    difficulty += distanceFactor * 0.3;

    // Scanner power reduction (better scanner = easier)
    const scannerFactor = 1 - (scanner.power / 2000); // Normalized to 2000W
    difficulty += scannerFactor * 0.2;

    // Environmental interference
    difficulty += interference;

    return Math.max(0, Math.min(1, difficulty));
  }

  /**
   * Time required to complete scan
   *
   * @param difficulty Scan difficulty (0-1)
   * @returns Time in seconds
   */
  public getRequiredScanTime(difficulty: number): number {
    const baseTime = 5; // seconds
    const maxTime = 60; // seconds

    return baseTime + (maxTime - baseTime) * difficulty;
  }

  /**
   * Check if scan succeeds (for difficult scans)
   *
   * @param difficulty Scan difficulty (0-1)
   * @param scannerSkill Scanner operator skill (0-1)
   * @returns Success probability (0-1)
   */
  public getScanSuccessProbability(difficulty: number, scannerSkill: number = 0.5): number {
    // Base success rate
    let successRate = 1 - difficulty;

    // Skill bonus
    successRate += scannerSkill * 0.3;

    return Math.max(0.1, Math.min(0.99, successRate));
  }

  /**
   * Get detection quality description
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
