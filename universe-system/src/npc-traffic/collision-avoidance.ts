/**
 * collision-avoidance.ts
 * Collision detection and avoidance for NPC vessels
 *
 * Implements:
 * - Time to Closest Approach (TCA) calculations
 * - Collision prediction
 * - Avoidance maneuvers
 * - Safety zones
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';
import { VesselPhysics } from './vessel-physics';

/**
 * Collision prediction result
 */
export interface CollisionPrediction {
  willCollide: boolean;
  timeToClosestApproach: number; // seconds
  closestApproachDistance: number; // meters
  closestApproachTime: number; // absolute time
  relativeVelocity: Vector3;
  isHeadOn: boolean; // Approaching directly
}

/**
 * Avoidance maneuver result
 */
export interface AvoidanceManeuver {
  avoidanceAcceleration: Vector3;
  maneuverDuration: number; // seconds
  severity: number; // 0-1, how urgent
  type: 'NONE' | 'SLIGHT' | 'MODERATE' | 'EMERGENCY';
}

/**
 * Collision avoidance system using TCA (Time to Closest Approach)
 *
 * Mathematical basis:
 * Given two vessels with positions p1, p2 and velocities v1, v2:
 *
 * Relative position: Δp = p2 - p1
 * Relative velocity: Δv = v2 - v1
 *
 * Time to closest approach:
 * TCA = -(Δp · Δv) / |Δv|²
 *
 * Distance at closest approach:
 * DCA = |Δp + Δv * TCA|
 */
export class CollisionAvoidance {
  // Safety parameters
  private safetyRadius: number = 500; // meters - minimum safe distance
  private warningRadius: number = 2000; // meters - warning distance
  private lookaheadTime: number = 60; // seconds - how far ahead to predict

  // Avoidance parameters
  private avoidanceStrength: number = 1.0;
  private emergencyThreshold: number = 10; // seconds - emergency if collision < this

  constructor(
    safetyRadius: number = 500,
    warningRadius: number = 2000,
    lookaheadTime: number = 60
  ) {
    this.safetyRadius = safetyRadius;
    this.warningRadius = warningRadius;
    this.lookaheadTime = lookaheadTime;
  }

  /**
   * Predict collision between two vessels
   *
   * Uses TCA algorithm:
   * 1. Calculate relative position and velocity
   * 2. Find time of closest approach
   * 3. Calculate distance at that time
   * 4. Determine if collision will occur
   *
   * @param vessel1 First vessel
   * @param vessel2 Second vessel
   * @returns Collision prediction
   */
  public predictCollision(
    vessel1: VesselPhysics,
    vessel2: VesselPhysics
  ): CollisionPrediction {
    // Relative vectors
    const relativePosition = vessel2.position.subtract(vessel1.position);
    const relativeVelocity = vessel2.velocity.subtract(vessel1.velocity);

    // Current distance
    const currentDistance = relativePosition.length();

    // If not moving relative to each other, no collision
    const relativeSpeed = relativeVelocity.length();
    if (relativeSpeed < 0.01) {
      return {
        willCollide: false,
        timeToClosestApproach: Infinity,
        closestApproachDistance: currentDistance,
        closestApproachTime: Infinity,
        relativeVelocity,
        isHeadOn: false
      };
    }

    // Time to closest approach
    // TCA = -(Δp · Δv) / |Δv|²
    const tca = -relativePosition.dot(relativeVelocity) / relativeVelocity.dot(relativeVelocity);

    // If TCA is negative or beyond lookahead, vessels are separating or too far
    if (tca < 0 || tca > this.lookaheadTime) {
      return {
        willCollide: false,
        timeToClosestApproach: tca,
        closestApproachDistance: currentDistance,
        closestApproachTime: tca,
        relativeVelocity,
        isHeadOn: false
      };
    }

    // Position at closest approach
    // p_closest = Δp + Δv * TCA
    const positionAtTCA = relativePosition.add(relativeVelocity.scale(tca));
    const closestDistance = positionAtTCA.length();

    // Determine if head-on (relative velocity points toward other vessel)
    const approachAngle = Math.abs(
      relativePosition.normalize().dot(relativeVelocity.normalize())
    );
    const isHeadOn = approachAngle > 0.9; // Almost directly toward each other

    // Will collide if closest distance is within safety radius
    const willCollide = closestDistance < this.safetyRadius;

    return {
      willCollide,
      timeToClosestApproach: tca,
      closestApproachDistance: closestDistance,
      closestApproachTime: tca,
      relativeVelocity,
      isHeadOn
    };
  }

  /**
   * Calculate avoidance maneuver
   *
   * Strategy:
   * 1. Predict collision
   * 2. Determine severity
   * 3. Calculate perpendicular avoidance vector
   * 4. Scale based on urgency
   *
   * @param myVessel My vessel
   * @param otherVessel Other vessel to avoid
   * @returns Avoidance maneuver
   */
  public calculateAvoidanceManeuver(
    myVessel: VesselPhysics,
    otherVessel: VesselPhysics
  ): AvoidanceManeuver {
    // Predict collision
    const prediction = this.predictCollision(myVessel, otherVessel);

    // No collision predicted - no maneuver needed
    if (!prediction.willCollide) {
      // But apply warning if within warning radius
      const currentDistance = otherVessel.position.subtract(myVessel.position).length();

      if (currentDistance < this.warningRadius) {
        // Slight avoidance to maintain safe distance
        return this.calculateWarningManeuver(myVessel, otherVessel, currentDistance);
      }

      return {
        avoidanceAcceleration: new Vector3(0, 0, 0),
        maneuverDuration: 0,
        severity: 0,
        type: 'NONE'
      };
    }

    // Determine severity
    const severity = this.calculateSeverity(
      prediction.timeToClosestApproach,
      prediction.closestApproachDistance
    );

    // Calculate avoidance direction
    // Perpendicular to relative velocity (sideways dodge)
    const relativePosition = otherVessel.position.subtract(myVessel.position);
    const relativeVelocity = prediction.relativeVelocity;

    // Find perpendicular direction
    const avoidanceDirection = this.calculateAvoidanceDirection(
      relativePosition,
      relativeVelocity,
      myVessel.velocity
    );

    // Calculate maneuver strength based on severity and time remaining
    const timeScale = Math.max(0.1, prediction.timeToClosestApproach / this.emergencyThreshold);
    const maneuverStrength = (severity * myVessel.maxAcceleration * this.avoidanceStrength) / timeScale;

    const avoidanceAcceleration = avoidanceDirection.scale(maneuverStrength);

    // Determine maneuver type
    let maneuverType: 'NONE' | 'SLIGHT' | 'MODERATE' | 'EMERGENCY';
    if (severity > 0.8 || prediction.timeToClosestApproach < this.emergencyThreshold) {
      maneuverType = 'EMERGENCY';
    } else if (severity > 0.5) {
      maneuverType = 'MODERATE';
    } else {
      maneuverType = 'SLIGHT';
    }

    // Maneuver duration - apply until past TCA
    const maneuverDuration = prediction.timeToClosestApproach + 2; // +2s buffer

    return {
      avoidanceAcceleration,
      maneuverDuration,
      severity,
      type: maneuverType
    };
  }

  /**
   * Calculate warning maneuver (gentle avoidance when within warning radius)
   */
  private calculateWarningManeuver(
    myVessel: VesselPhysics,
    otherVessel: VesselPhysics,
    currentDistance: number
  ): AvoidanceManeuver {
    // Gentle repulsion to maintain safe distance
    const toOther = otherVessel.position.subtract(myVessel.position);
    const awayDirection = toOther.normalize().scale(-1);

    // Scale by proximity (closer = stronger)
    const proximityFactor = 1 - currentDistance / this.warningRadius;
    const maneuverStrength = proximityFactor * myVessel.maxAcceleration * 0.2; // 20% max accel

    return {
      avoidanceAcceleration: awayDirection.scale(maneuverStrength),
      maneuverDuration: 5,
      severity: proximityFactor * 0.3, // Low severity
      type: 'SLIGHT'
    };
  }

  /**
   * Calculate severity of collision threat
   *
   * Based on:
   * - Time to collision (less time = more severe)
   * - Distance at closest approach (closer = more severe)
   *
   * Returns 0-1 where 1 is most severe
   */
  private calculateSeverity(timeToCollision: number, closestDistance: number): number {
    // Time component (0-1, where 0 = lots of time, 1 = imminent)
    const timeSeverity = Math.max(0, 1 - timeToCollision / this.lookaheadTime);

    // Distance component (0-1, where 0 = far, 1 = very close)
    const distanceSeverity = Math.max(0, 1 - closestDistance / this.safetyRadius);

    // Combine with emphasis on closer threats
    return Math.sqrt(timeSeverity * timeSeverity + distanceSeverity * distanceSeverity) / Math.sqrt(2);
  }

  /**
   * Calculate avoidance direction
   *
   * Strategy:
   * 1. Find perpendicular to relative velocity (sideways)
   * 2. Choose side that moves away from other vessel
   * 3. Prefer "up" or "right" for consistency
   */
  private calculateAvoidanceDirection(
    relativePosition: Vector3,
    relativeVelocity: Vector3,
    myVelocity: Vector3
  ): Vector3 {
    // Normalize relative velocity
    const relVelNorm = relativeVelocity.normalize();

    // Find perpendicular direction using cross product
    // Use an arbitrary "up" vector
    let up = new Vector3(0, 1, 0);

    // If relative velocity is vertical, use different up vector
    if (Math.abs(relVelNorm.dot(up)) > 0.9) {
      up = new Vector3(1, 0, 0);
    }

    // Calculate perpendicular (sideways avoidance)
    let perpendicular = relVelNorm.cross(up).normalize();

    // Choose side that moves away from other vessel
    // Dot product with relative position tells us which side
    if (perpendicular.dot(relativePosition) > 0) {
      // This side is toward other vessel - flip it
      perpendicular = perpendicular.scale(-1);
    }

    return perpendicular;
  }

  /**
   * Check if vessel is in danger zone
   *
   * @param myVessel My vessel
   * @param otherVessels List of other vessels
   * @returns true if any vessel poses immediate threat
   */
  public isInDangerZone(myVessel: VesselPhysics, otherVessels: VesselPhysics[]): boolean {
    for (const other of otherVessels) {
      const prediction = this.predictCollision(myVessel, other);

      if (prediction.willCollide && prediction.timeToClosestApproach < this.emergencyThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all collision threats
   *
   * @param myVessel My vessel
   * @param otherVessels List of other vessels
   * @returns Array of vessels that pose collision threat
   */
  public getCollisionThreats(
    myVessel: VesselPhysics,
    otherVessels: VesselPhysics[]
  ): Array<{ vessel: VesselPhysics; prediction: CollisionPrediction }> {
    const threats: Array<{ vessel: VesselPhysics; prediction: CollisionPrediction }> = [];

    for (const other of otherVessels) {
      const prediction = this.predictCollision(myVessel, other);

      if (prediction.willCollide) {
        threats.push({ vessel: other, prediction });
      }
    }

    // Sort by time to collision (most urgent first)
    threats.sort((a, b) => a.prediction.timeToClosestApproach - b.prediction.timeToClosestApproach);

    return threats;
  }

  /**
   * Calculate combined avoidance for multiple threats
   *
   * Combines individual avoidance maneuvers weighted by severity
   *
   * @param myVessel My vessel
   * @param otherVessels Other vessels to avoid
   * @returns Combined avoidance maneuver
   */
  public calculateCombinedAvoidance(
    myVessel: VesselPhysics,
    otherVessels: VesselPhysics[]
  ): AvoidanceManeuver {
    const threats = this.getCollisionThreats(myVessel, otherVessels);

    if (threats.length === 0) {
      return {
        avoidanceAcceleration: new Vector3(0, 0, 0),
        maneuverDuration: 0,
        severity: 0,
        type: 'NONE'
      };
    }

    // Calculate individual maneuvers
    const maneuvers = threats.map(threat =>
      this.calculateAvoidanceManeuver(myVessel, threat.vessel)
    );

    // Combine accelerations weighted by severity
    let combinedAcceleration = new Vector3(0, 0, 0);
    let totalSeverity = 0;
    let maxDuration = 0;
    let maxType: 'NONE' | 'SLIGHT' | 'MODERATE' | 'EMERGENCY' = 'NONE';

    for (const maneuver of maneuvers) {
      combinedAcceleration = combinedAcceleration.add(
        maneuver.avoidanceAcceleration.scale(maneuver.severity)
      );
      totalSeverity += maneuver.severity;
      maxDuration = Math.max(maxDuration, maneuver.maneuverDuration);

      // Take most severe type
      const typeOrder = { NONE: 0, SLIGHT: 1, MODERATE: 2, EMERGENCY: 3 };
      if (typeOrder[maneuver.type] > typeOrder[maxType]) {
        maxType = maneuver.type;
      }
    }

    // Normalize combined acceleration
    if (totalSeverity > 0) {
      combinedAcceleration = combinedAcceleration.scale(1 / totalSeverity);
    }

    return {
      avoidanceAcceleration: combinedAcceleration,
      maneuverDuration: maxDuration,
      severity: Math.min(1, totalSeverity),
      type: maxType
    };
  }

  /**
   * Calculate safe stopping distance
   *
   * Distance needed to come to complete stop
   * d = v² / (2 * a)
   */
  public calculateSafeStoppingDistance(vessel: VesselPhysics): number {
    const speed = vessel.velocity.length();
    return (speed * speed) / (2 * vessel.maxAcceleration);
  }

  /**
   * Check if safe to proceed toward destination
   *
   * Returns false if destination is blocked by other vessels
   */
  public isSafeToProceed(
    myVessel: VesselPhysics,
    destination: Vector3,
    otherVessels: VesselPhysics[]
  ): boolean {
    // Create hypothetical vessel at destination with zero velocity
    const hypotheticalVessel = new VesselPhysics(
      destination,
      new Vector3(0, 0, 0),
      myVessel.mass,
      myVessel.maxThrust
    );

    // Check if path to destination would collide
    const prediction = this.predictCollision(myVessel, hypotheticalVessel);

    if (prediction.willCollide) {
      return false;
    }

    // Check if any other vessels block the path
    for (const other of otherVessels) {
      // Simple check: is other vessel between me and destination?
      const toDestination = destination.subtract(myVessel.position);
      const toOther = other.position.subtract(myVessel.position);

      const projectionLength = toOther.dot(toDestination.normalize());

      // If projection is positive and within destination distance
      if (projectionLength > 0 && projectionLength < toDestination.length()) {
        // Check perpendicular distance
        const projection = toDestination.normalize().scale(projectionLength);
        const perpendicular = toOther.subtract(projection);

        if (perpendicular.length() < this.warningRadius) {
          return false; // Vessel blocks path
        }
      }
    }

    return true;
  }

  /**
   * Set safety parameters
   */
  public setSafetyParameters(params: {
    safetyRadius?: number;
    warningRadius?: number;
    lookaheadTime?: number;
    avoidanceStrength?: number;
    emergencyThreshold?: number;
  }): void {
    if (params.safetyRadius !== undefined) {
      this.safetyRadius = params.safetyRadius;
    }
    if (params.warningRadius !== undefined) {
      this.warningRadius = params.warningRadius;
    }
    if (params.lookaheadTime !== undefined) {
      this.lookaheadTime = params.lookaheadTime;
    }
    if (params.avoidanceStrength !== undefined) {
      this.avoidanceStrength = params.avoidanceStrength;
    }
    if (params.emergencyThreshold !== undefined) {
      this.emergencyThreshold = params.emergencyThreshold;
    }
  }
}
