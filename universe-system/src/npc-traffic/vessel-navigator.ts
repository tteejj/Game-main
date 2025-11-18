/**
 * vessel-navigator.ts
 * Navigation and pathfinding for NPC vessels
 *
 * Implements potential field navigation:
 * - Attractive field toward destination
 * - Repulsive fields from obstacles
 * - Smooth steering behaviors
 */

import { Vector3 } from '../../../physics-modules/src/Vector3';
import { VesselPhysics } from './vessel-physics';

/**
 * Waypoint for navigation
 */
export interface Waypoint {
  position: Vector3;
  arrivalRadius: number; // How close to get before considering "arrived"
  maxSpeed?: number; // Optional speed limit at this waypoint
}

/**
 * Obstacle for avoidance
 */
export interface NavigationObstacle {
  position: Vector3;
  radius: number;
  repulsionStrength?: number; // How strongly to avoid (default 1.0)
}

/**
 * Navigation result
 */
export interface NavigationResult {
  desiredAcceleration: Vector3;
  distanceToTarget: number;
  hasArrived: boolean;
  obstaclesAvoided: number;
}

/**
 * Navigator for NPC vessels using potential field navigation
 *
 * Combines attractive and repulsive forces to create smooth,
 * collision-free paths to destinations.
 */
export class VesselNavigator {
  // Navigation parameters
  private attractionStrength: number = 1.0;
  private repulsionStrength: number = 0.5;
  private repulsionRange: number = 10000; // meters
  private slowdownDistance: number = 5000; // Start slowing down at this distance

  // Current navigation state
  private waypoints: Waypoint[] = [];
  private currentWaypointIndex: number = 0;

  // Steering smoothing (prevents jerky motion)
  private previousDesiredVelocity: Vector3 = new Vector3(0, 0, 0);
  private steeringSmoothingFactor: number = 0.3; // 0 = instant, 1 = very smooth

  constructor(
    attractionStrength: number = 1.0,
    repulsionStrength: number = 0.5,
    repulsionRange: number = 10000
  ) {
    this.attractionStrength = attractionStrength;
    this.repulsionStrength = repulsionStrength;
    this.repulsionRange = repulsionRange;
  }

  /**
   * Set destination (single waypoint)
   */
  public setDestination(position: Vector3, arrivalRadius: number = 1000): void {
    this.waypoints = [{
      position,
      arrivalRadius
    }];
    this.currentWaypointIndex = 0;
  }

  /**
   * Set route (multiple waypoints)
   */
  public setRoute(waypoints: Waypoint[]): void {
    this.waypoints = waypoints;
    this.currentWaypointIndex = 0;
  }

  /**
   * Add waypoint to route
   */
  public addWaypoint(waypoint: Waypoint): void {
    this.waypoints.push(waypoint);
  }

  /**
   * Clear all waypoints
   */
  public clearRoute(): void {
    this.waypoints = [];
    this.currentWaypointIndex = 0;
  }

  /**
   * Get current destination waypoint
   */
  public getCurrentWaypoint(): Waypoint | null {
    if (this.currentWaypointIndex >= this.waypoints.length) {
      return null;
    }
    return this.waypoints[this.currentWaypointIndex];
  }

  /**
   * Check if navigation is complete (all waypoints reached)
   */
  public isComplete(): boolean {
    return this.currentWaypointIndex >= this.waypoints.length;
  }

  /**
   * Get progress through route (0 to 1)
   */
  public getRouteProgress(): number {
    if (this.waypoints.length === 0) return 1.0;
    return this.currentWaypointIndex / this.waypoints.length;
  }

  /**
   * Calculate navigation acceleration using potential fields
   *
   * @param physics Current vessel physics state
   * @param obstacles List of obstacles to avoid
   * @param dt Time step (for smoothing)
   * @returns Navigation result with desired acceleration
   */
  public navigate(
    physics: VesselPhysics,
    obstacles: NavigationObstacle[] = [],
    dt: number = 1.0
  ): NavigationResult {
    const waypoint = this.getCurrentWaypoint();

    // No waypoint - return zero acceleration
    if (!waypoint) {
      return {
        desiredAcceleration: new Vector3(0, 0, 0),
        distanceToTarget: 0,
        hasArrived: true,
        obstaclesAvoided: 0
      };
    }

    const currentPosition = physics.position;
    const currentVelocity = physics.velocity;

    // Calculate attractive force (toward waypoint)
    const toTarget = waypoint.position.subtract(currentPosition);
    const distanceToTarget = toTarget.length();

    // Check arrival
    if (distanceToTarget < waypoint.arrivalRadius) {
      this.currentWaypointIndex++;
      return {
        desiredAcceleration: new Vector3(0, 0, 0),
        distanceToTarget,
        hasArrived: true,
        obstaclesAvoided: 0
      };
    }

    // Calculate desired velocity (toward target)
    let desiredSpeed = this.calculateDesiredSpeed(
      distanceToTarget,
      physics.maxAcceleration,
      waypoint.maxSpeed
    );

    const desiredDirection = toTarget.normalize();
    let desiredVelocity = desiredDirection.scale(desiredSpeed);

    // Calculate repulsive forces (away from obstacles)
    let obstaclesAvoided = 0;
    for (const obstacle of obstacles) {
      const toObstacle = obstacle.position.subtract(currentPosition);
      const distanceToObstacle = toObstacle.length();

      // Only avoid if within repulsion range
      if (distanceToObstacle < this.repulsionRange) {
        const repulsion = this.calculateRepulsiveForce(
          toObstacle,
          distanceToObstacle,
          obstacle.radius,
          obstacle.repulsionStrength || 1.0
        );

        // Add repulsion to desired velocity
        desiredVelocity = desiredVelocity.add(repulsion);
        obstaclesAvoided++;
      }
    }

    // Smooth steering (prevents jerky motion)
    if (this.steeringSmoothingFactor > 0) {
      desiredVelocity = this.previousDesiredVelocity
        .scale(this.steeringSmoothingFactor)
        .add(desiredVelocity.scale(1 - this.steeringSmoothingFactor));
    }
    this.previousDesiredVelocity = desiredVelocity;

    // Calculate required acceleration: a = (v_desired - v_current) / dt
    // Use a fixed time horizon for responsiveness
    const timeHorizon = 2.0; // seconds
    const desiredAcceleration = desiredVelocity
      .subtract(currentVelocity)
      .scale(1 / timeHorizon);

    return {
      desiredAcceleration,
      distanceToTarget,
      hasArrived: false,
      obstaclesAvoided
    };
  }

  /**
   * Calculate desired speed with slowdown near target
   *
   * Uses smooth deceleration curve to avoid overshooting
   */
  private calculateDesiredSpeed(
    distanceToTarget: number,
    maxAcceleration: number,
    maxSpeed?: number
  ): number {
    // Default max speed based on acceleration
    const defaultMaxSpeed = maxSpeed || maxAcceleration * 60; // 60 seconds at max accel

    // If far from target, go max speed
    if (distanceToTarget > this.slowdownDistance) {
      return defaultMaxSpeed;
    }

    // Close to target - slow down
    // Use square root curve for smooth deceleration
    // v = sqrt(2 * a * d)
    const slowdownSpeed = Math.sqrt(2 * maxAcceleration * distanceToTarget);

    return Math.min(slowdownSpeed, defaultMaxSpeed);
  }

  /**
   * Calculate repulsive force from obstacle
   *
   * Uses inverse square law with smooth falloff:
   * F_repulsion = k / (d - r)²
   *
   * Where:
   * - k is repulsion strength
   * - d is distance to obstacle
   * - r is obstacle radius
   */
  private calculateRepulsiveForce(
    toObstacle: Vector3,
    distanceToObstacle: number,
    obstacleRadius: number,
    strength: number
  ): Vector3 {
    // Distance to surface of obstacle
    const distanceToSurface = Math.max(distanceToObstacle - obstacleRadius, 1.0);

    // Repulsion magnitude (inverse square)
    const repulsionMagnitude =
      (this.repulsionStrength * strength * 1000000) /
      (distanceToSurface * distanceToSurface);

    // Repulsion direction (away from obstacle)
    const repulsionDirection = toObstacle.normalize().scale(-1);

    // Falloff based on distance (smooth transition)
    const falloff = Math.max(0, 1 - distanceToObstacle / this.repulsionRange);

    return repulsionDirection.scale(repulsionMagnitude * falloff);
  }

  /**
   * Predict if current path will collide with obstacle
   *
   * @param physics Current vessel state
   * @param obstacle Obstacle to check
   * @param lookaheadTime How far ahead to predict (seconds)
   * @returns true if collision predicted
   */
  public predictCollision(
    physics: VesselPhysics,
    obstacle: NavigationObstacle,
    lookaheadTime: number = 10.0
  ): boolean {
    // Predict future position
    const futurePosition = physics.predictPosition(lookaheadTime);

    // Check distance to obstacle at future time
    const distanceToObstacle = futurePosition.subtract(obstacle.position).length();

    return distanceToObstacle < obstacle.radius;
  }

  /**
   * Calculate intercept course to moving target
   *
   * Solves for intercept point where:
   * t_intercept = |target_position + target_velocity * t - my_position| / my_speed
   *
   * @param myPosition Current position
   * @param mySpeed My maximum speed
   * @param targetPosition Target current position
   * @param targetVelocity Target velocity vector
   * @returns Intercept position, or null if impossible
   */
  public calculateIntercept(
    myPosition: Vector3,
    mySpeed: number,
    targetPosition: Vector3,
    targetVelocity: Vector3
  ): Vector3 | null {
    // Relative position and velocity
    const relativePosition = targetPosition.subtract(myPosition);
    const relativeVelocity = targetVelocity;

    // Quadratic equation coefficients for intercept
    // |p + v*t|² = (my_speed * t)²
    const a = relativeVelocity.dot(relativeVelocity) - mySpeed * mySpeed;
    const b = 2 * relativePosition.dot(relativeVelocity);
    const c = relativePosition.dot(relativePosition);

    // Solve quadratic
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      // No solution - cannot intercept
      return null;
    }

    // Take smaller positive root
    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

    let t_intercept = Math.min(t1, t2);
    if (t_intercept < 0) t_intercept = Math.max(t1, t2);
    if (t_intercept < 0) return null; // Both negative - target behind us

    // Calculate intercept position
    return targetPosition.add(targetVelocity.scale(t_intercept));
  }

  /**
   * Calculate orbit insertion burn (for circular orbit)
   *
   * For orbital mechanics:
   * v_orbital = sqrt(GM / r)
   *
   * @param centralBodyPosition Position of body to orbit
   * @param centralBodyMass Mass of body (kg)
   * @param desiredAltitude Desired orbital altitude (m)
   * @param currentPosition Current position
   * @param currentVelocity Current velocity
   * @returns Required delta-V vector
   */
  public calculateOrbitInsertion(
    centralBodyPosition: Vector3,
    centralBodyMass: number,
    desiredAltitude: number,
    currentPosition: Vector3,
    currentVelocity: Vector3
  ): Vector3 {
    const G = 6.674e-11; // Gravitational constant

    // Orbital radius
    const orbitalRadius = desiredAltitude;

    // Required orbital velocity
    const v_orbital = Math.sqrt((G * centralBodyMass) / orbitalRadius);

    // Direction perpendicular to radius (for circular orbit)
    const toCenter = centralBodyPosition.subtract(currentPosition);
    const radiusDirection = toCenter.normalize();

    // Tangent direction (perpendicular to radius)
    // Use cross product with arbitrary up vector
    const up = new Vector3(0, 1, 0);
    let tangentDirection = radiusDirection.cross(up);

    // If parallel to up, use different vector
    if (tangentDirection.length() < 0.01) {
      tangentDirection = radiusDirection.cross(new Vector3(1, 0, 0));
    }
    tangentDirection = tangentDirection.normalize();

    // Required velocity vector
    const requiredVelocity = tangentDirection.scale(v_orbital);

    // Delta-V needed
    return requiredVelocity.subtract(currentVelocity);
  }

  /**
   * Get remaining distance on route
   */
  public getRemainingDistance(currentPosition: Vector3): number {
    if (this.waypoints.length === 0) return 0;

    let totalDistance = 0;
    let position = currentPosition;

    // Distance to current waypoint
    for (let i = this.currentWaypointIndex; i < this.waypoints.length; i++) {
      const waypoint = this.waypoints[i];
      totalDistance += waypoint.position.subtract(position).length();
      position = waypoint.position;
    }

    return totalDistance;
  }

  /**
   * Get estimated time to complete route
   *
   * @param currentPosition Current position
   * @param averageSpeed Average expected speed
   */
  public getEstimatedTimeToComplete(
    currentPosition: Vector3,
    averageSpeed: number
  ): number {
    const distance = this.getRemainingDistance(currentPosition);
    if (averageSpeed <= 0) return Infinity;
    return distance / averageSpeed;
  }

  /**
   * Set navigation parameters
   */
  public setNavigationParameters(params: {
    attractionStrength?: number;
    repulsionStrength?: number;
    repulsionRange?: number;
    slowdownDistance?: number;
    steeringSmoothingFactor?: number;
  }): void {
    if (params.attractionStrength !== undefined) {
      this.attractionStrength = params.attractionStrength;
    }
    if (params.repulsionStrength !== undefined) {
      this.repulsionStrength = params.repulsionStrength;
    }
    if (params.repulsionRange !== undefined) {
      this.repulsionRange = params.repulsionRange;
    }
    if (params.slowdownDistance !== undefined) {
      this.slowdownDistance = params.slowdownDistance;
    }
    if (params.steeringSmoothingFactor !== undefined) {
      this.steeringSmoothingFactor = Math.max(0, Math.min(1, params.steeringSmoothingFactor));
    }
  }
}
