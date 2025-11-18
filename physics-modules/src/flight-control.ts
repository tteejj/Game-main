/**
 * Flight Control System
 *
 * Provides autopilot, PID control, and stability augmentation for spacecraft.
 * Implements closed-loop control systems for automated flight operations.
 */

export type SASMode =
  | 'off'
  | 'stability'          // Dampen rotation rates
  | 'attitude_hold'      // Maintain current orientation
  | 'prograde'          // Point in direction of motion
  | 'retrograde'        // Point opposite to motion
  | 'radial_in'         // Point toward planet center
  | 'radial_out'        // Point away from planet center
  | 'normal'            // Point along orbit normal
  | 'anti_normal';      // Point opposite orbit normal

export type AutopilotMode =
  | 'off'
  | 'altitude_hold'     // Maintain specific altitude
  | 'vertical_speed_hold' // Maintain constant descent/ascent rate
  | 'suicide_burn'      // Automatic deceleration burn
  | 'hover'             // Maintain altitude with translation
  | 'landing'           // Automatic landing sequence
  | 'docking'           // Automatic docking approach
  | 'orbital_insertion'; // Automatic orbital insertion burn

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface PIDConfig {
  kp: number;  // Proportional gain
  ki: number;  // Integral gain
  kd: number;  // Derivative gain
  integralLimit?: number;  // Anti-windup limit
}

export interface RCSCommands {
  pitch: number;  // -1 to 1
  roll: number;   // -1 to 1
  yaw: number;    // -1 to 1
}

export interface ThrottleCommand {
  throttle: number;  // 0 to 1
  reason: string;
}

export interface GimbalCommand {
  pitch: number;  // degrees
  yaw: number;    // degrees
}

export interface FlightControlConfig {
  pid: {
    altitude: PIDConfig;
    verticalSpeed: PIDConfig;
    pitch: PIDConfig;
    roll: PIDConfig;
    yaw: PIDConfig;
    rateDamping: PIDConfig;
  };
  sas: {
    deadband: number;  // degrees
    rateDeadband: number;  // rad/s
    maxControlAuthority: number;  // 0-1
  };
  autopilot: {
    suicideBurnSafetyFactor: number;
    hoverThrottleMargin: number;
    altitudeHoldDeadband: number;  // meters
    speedHoldDeadband: number;  // m/s
  };
}

export interface FlightControlState {
  sasMode: SASMode;
  autopilotMode: AutopilotMode;
  targetAltitude: number | null;
  targetVerticalSpeed: number | null;
  targetAttitude: Quaternion | null;

  // Autopilot status
  suicideBurnActive: boolean;
  suicideBurnAltitude: number;
  hoverActive: boolean;
  landingPhase: 'descent' | 'deceleration' | 'final' | 'touchdown' | 'off';
  dockingPhase: 'approach' | 'alignment' | 'final' | 'capture' | 'off';
  orbitalInsertionPhase: 'coasting' | 'burn' | 'circularizing' | 'complete' | 'off';

  // Control outputs
  rcsCommands: RCSCommands;
  throttleCommand: ThrottleCommand;
  gimbalCommand: GimbalCommand;
}

/**
 * PID Controller
 * Implements proportional-integral-derivative control
 */
export class PIDController {
  private kp: number;
  private ki: number;
  private kd: number;
  private integralLimit: number;

  private integral: number = 0;
  private previousError: number = 0;
  private firstUpdate: boolean = true;

  constructor(config: PIDConfig) {
    this.kp = config.kp;
    this.ki = config.ki;
    this.kd = config.kd;
    this.integralLimit = config.integralLimit ?? 100;
  }

  update(currentValue: number, targetValue: number, dt: number): number {
    const error = targetValue - currentValue;

    // Integral with anti-windup
    this.integral += error * dt;
    this.integral = Math.max(-this.integralLimit, Math.min(this.integralLimit, this.integral));

    // Derivative (avoid spike on first update)
    let derivative = 0;
    if (!this.firstUpdate) {
      derivative = (error - this.previousError) / dt;
    }
    this.firstUpdate = false;
    this.previousError = error;

    const output = (this.kp * error) + (this.ki * this.integral) + (this.kd * derivative);
    return output;
  }

  reset(): void {
    this.integral = 0;
    this.previousError = 0;
    this.firstUpdate = true;
  }

  getIntegral(): number {
    return this.integral;
  }
}

/**
 * Stability Augmentation System (SAS)
 * Provides attitude stabilization and automatic orientation control
 */
export class SASController {
  private mode: SASMode = 'off';
  private config: FlightControlConfig['sas'];

  private pitchPID: PIDController;
  private rollPID: PIDController;
  private yawPID: PIDController;
  private pitchRatePID: PIDController;
  private rollRatePID: PIDController;
  private yawRatePID: PIDController;

  constructor(config: FlightControlConfig) {
    this.config = config.sas;

    this.pitchPID = new PIDController(config.pid.pitch);
    this.rollPID = new PIDController(config.pid.roll);
    this.yawPID = new PIDController(config.pid.yaw);

    this.pitchRatePID = new PIDController(config.pid.rateDamping);
    this.rollRatePID = new PIDController(config.pid.rateDamping);
    this.yawRatePID = new PIDController(config.pid.rateDamping);
  }

  setMode(mode: SASMode): void {
    this.mode = mode;
    // Reset PIDs when mode changes
    this.pitchPID.reset();
    this.rollPID.reset();
    this.yawPID.reset();
    this.pitchRatePID.reset();
    this.rollRatePID.reset();
    this.yawRatePID.reset();
  }

  getMode(): SASMode {
    return this.mode;
  }

  update(
    currentAttitude: Quaternion,
    currentAngularVel: Vector3,
    targetAttitude: Quaternion | null,
    velocity: Vector3,
    position: Vector3,
    dt: number
  ): RCSCommands {
    if (this.mode === 'off') {
      return { pitch: 0, roll: 0, yaw: 0 };
    }

    // Determine target orientation based on mode
    let target = targetAttitude;
    if (this.mode === 'prograde') {
      target = this.calculateProgradeAttitude(velocity);
    } else if (this.mode === 'retrograde') {
      target = this.calculateRetrogradeAttitude(velocity);
    } else if (this.mode === 'radial_in') {
      target = this.calculateRadialInAttitude(position);
    } else if (this.mode === 'radial_out') {
      target = this.calculateRadialOutAttitude(position);
    } else if (this.mode === 'attitude_hold' && !target) {
      target = currentAttitude;  // Hold current attitude
    }

    if (this.mode === 'stability') {
      // Pure rate damping, no attitude control
      return this.calculateRateDamping(currentAngularVel, dt);
    }

    if (!target) {
      return { pitch: 0, roll: 0, yaw: 0 };
    }

    // Calculate attitude error
    const errorQuat = this.quaternionDifference(target, currentAttitude);
    const errorAngles = this.quaternionToEuler(errorQuat);

    // PID control for each axis (within deadband check)
    let pitchCmd = 0;
    let rollCmd = 0;
    let yawCmd = 0;

    const deadband = this.config.deadband * (Math.PI / 180);  // Convert to radians

    if (Math.abs(errorAngles.pitch) > deadband) {
      pitchCmd = this.pitchPID.update(0, errorAngles.pitch, dt);
    }
    if (Math.abs(errorAngles.roll) > deadband) {
      rollCmd = this.rollPID.update(0, errorAngles.roll, dt);
    }
    if (Math.abs(errorAngles.yaw) > deadband) {
      yawCmd = this.yawPID.update(0, errorAngles.yaw, dt);
    }

    // Add rate damping
    const rateDamping = this.calculateRateDamping(currentAngularVel, dt);
    pitchCmd += rateDamping.pitch;
    rollCmd += rateDamping.roll;
    yawCmd += rateDamping.yaw;

    // Clamp to control authority
    const maxAuth = this.config.maxControlAuthority;
    return {
      pitch: Math.max(-maxAuth, Math.min(maxAuth, pitchCmd)),
      roll: Math.max(-maxAuth, Math.min(maxAuth, rollCmd)),
      yaw: Math.max(-maxAuth, Math.min(maxAuth, yawCmd))
    };
  }

  private calculateRateDamping(angularVel: Vector3, dt: number): RCSCommands {
    const deadband = this.config.rateDeadband;

    let pitchDamp = 0;
    let rollDamp = 0;
    let yawDamp = 0;

    if (Math.abs(angularVel.x) > deadband) {
      pitchDamp = this.pitchRatePID.update(angularVel.x, 0, dt);
    }
    if (Math.abs(angularVel.y) > deadband) {
      rollDamp = this.rollRatePID.update(angularVel.y, 0, dt);
    }
    if (Math.abs(angularVel.z) > deadband) {
      yawDamp = this.yawRatePID.update(angularVel.z, 0, dt);
    }

    return { pitch: pitchDamp, roll: rollDamp, yaw: yawDamp };
  }

  private calculateProgradeAttitude(velocity: Vector3): Quaternion {
    // Point spacecraft in direction of velocity
    const velNorm = this.normalize(velocity);
    return this.vectorToQuaternion(velNorm);
  }

  private calculateRetrogradeAttitude(velocity: Vector3): Quaternion {
    // Point spacecraft opposite to velocity
    const velNorm = this.normalize(velocity);
    return this.vectorToQuaternion({ x: -velNorm.x, y: -velNorm.y, z: -velNorm.z });
  }

  private calculateRadialInAttitude(position: Vector3): Quaternion {
    // Point toward planet center (opposite to position vector)
    const posNorm = this.normalize(position);
    return this.vectorToQuaternion({ x: -posNorm.x, y: -posNorm.y, z: -posNorm.z });
  }

  private calculateRadialOutAttitude(position: Vector3): Quaternion {
    // Point away from planet center
    const posNorm = this.normalize(position);
    return this.vectorToQuaternion(posNorm);
  }

  private vectorToQuaternion(direction: Vector3): Quaternion {
    // Align Z-axis with direction vector
    // Build orthonormal basis: [right, up, forward]

    // Normalize direction to get forward vector
    const forward = this.normalize(direction);

    // Choose a reasonable up vector (avoid singularity when direction is vertical)
    let up = { x: 0, y: 1, z: 0 };
    if (Math.abs(forward.y) > 0.99) {
      // If nearly vertical, use X-axis as reference
      up = { x: 1, y: 0, z: 0 };
    }

    // Right = up × forward
    const right = this.normalize(this.crossProduct(up, forward));

    // Recalculate up = forward × right (ensure orthogonality)
    const newUp = this.crossProduct(forward, right);

    // Build rotation matrix (column-major: [right, up, forward])
    // Convert rotation matrix to quaternion using standard algorithm
    const trace = right.x + newUp.y + forward.z;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      return {
        w: 0.25 / s,
        x: (newUp.z - forward.y) * s,
        y: (forward.x - right.z) * s,
        z: (right.y - newUp.x) * s
      };
    } else if (right.x > newUp.y && right.x > forward.z) {
      const s = 2.0 * Math.sqrt(1.0 + right.x - newUp.y - forward.z);
      return {
        w: (newUp.z - forward.y) / s,
        x: 0.25 * s,
        y: (newUp.x + right.y) / s,
        z: (forward.x + right.z) / s
      };
    } else if (newUp.y > forward.z) {
      const s = 2.0 * Math.sqrt(1.0 + newUp.y - right.x - forward.z);
      return {
        w: (forward.x - right.z) / s,
        x: (newUp.x + right.y) / s,
        y: 0.25 * s,
        z: (forward.y + newUp.z) / s
      };
    } else {
      const s = 2.0 * Math.sqrt(1.0 + forward.z - right.x - newUp.y);
      return {
        w: (right.y - newUp.x) / s,
        x: (forward.x + right.z) / s,
        y: (forward.y + newUp.z) / s,
        z: 0.25 * s
      };
    }
  }

  private quaternionDifference(target: Quaternion, current: Quaternion): Quaternion {
    // q_error = q_target * q_current^(-1)
    const currentInv = this.quaternionInverse(current);
    return this.quaternionMultiply(target, currentInv);
  }

  private quaternionInverse(q: Quaternion): Quaternion {
    // For unit quaternions: q^(-1) = q* (conjugate)
    return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
  }

  private quaternionMultiply(a: Quaternion, b: Quaternion): Quaternion {
    return {
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
    };
  }

  private quaternionToEuler(q: Quaternion): { pitch: number; roll: number; yaw: number } {
    // Convert quaternion to Euler angles (X-Y-Z convention)
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (q.w * q.y - q.z * q.x);
    const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return { pitch, roll, yaw };
  }

  private normalize(v: Vector3): Vector3 {
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (mag < 1e-10) return { x: 0, y: 0, z: 1 };
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
  }

  private crossProduct(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }
}

/**
 * Autopilot System
 * Provides automated throttle control for various flight modes
 */
export class AutopilotSystem {
  private mode: AutopilotMode = 'off';
  private config: FlightControlConfig['autopilot'];

  private altitudePID: PIDController;
  private verticalSpeedPID: PIDController;

  private targetAltitude: number | null = null;
  private targetVerticalSpeed: number | null = null;

  private suicideBurnActive: boolean = false;
  private suicideBurnAltitude: number = 0;

  // Landing autopilot state
  private landingPhase: 'descent' | 'deceleration' | 'final' | 'touchdown' | 'off' = 'off';
  private landingTargetAltitude: number = 0;

  // Docking autopilot state
  private dockingPhase: 'approach' | 'alignment' | 'final' | 'capture' | 'off' = 'off';
  private dockingTargetPosition: Vector3 | null = null;
  private dockingDistance: number = 0;

  // Orbital insertion state
  private orbitalInsertionPhase: 'coasting' | 'burn' | 'circularizing' | 'complete' | 'off' = 'off';
  private targetOrbitAltitude: number = 100000; // 100km default
  private targetOrbitalVelocity: number = 0;

  constructor(config: FlightControlConfig) {
    this.config = config.autopilot;
    this.altitudePID = new PIDController(config.pid.altitude);
    this.verticalSpeedPID = new PIDController(config.pid.verticalSpeed);
  }

  setMode(mode: AutopilotMode): void {
    this.mode = mode;
    this.altitudePID.reset();
    this.verticalSpeedPID.reset();
    this.suicideBurnActive = false;
    this.landingPhase = 'off';
    this.dockingPhase = 'off';
    this.orbitalInsertionPhase = 'off';

    // Initialize phases based on mode
    if (mode === 'landing') {
      this.landingPhase = 'descent';
    } else if (mode === 'docking') {
      this.dockingPhase = 'approach';
    } else if (mode === 'orbital_insertion') {
      this.orbitalInsertionPhase = 'coasting';
    }
  }

  getMode(): AutopilotMode {
    return this.mode;
  }

  setTargetAltitude(altitude: number): void {
    this.targetAltitude = altitude;
  }

  setTargetVerticalSpeed(speed: number): void {
    this.targetVerticalSpeed = speed;
  }

  update(
    altitude: number,
    verticalSpeed: number,
    mass: number,
    maxThrust: number,
    gravity: number,
    dt: number,
    position?: Vector3,
    velocity?: Vector3
  ): ThrottleCommand {
    if (this.mode === 'off') {
      return { throttle: 0, reason: 'autopilot_off' };
    }

    switch (this.mode) {
      case 'altitude_hold':
        return this.updateAltitudeHold(altitude, verticalSpeed, dt);

      case 'vertical_speed_hold':
        return this.updateVerticalSpeedHold(verticalSpeed, dt);

      case 'suicide_burn':
        return this.updateSuicideBurn(altitude, verticalSpeed, mass, maxThrust, gravity, dt);

      case 'hover':
        return this.updateHover(altitude, mass, maxThrust, gravity, dt);

      case 'landing':
        return this.updateLanding(altitude, verticalSpeed, mass, maxThrust, gravity, dt);

      case 'docking':
        return this.updateDocking(position || { x: 0, y: 0, z: 0 }, velocity || { x: 0, y: 0, z: 0 }, mass, maxThrust, dt);

      case 'orbital_insertion':
        return this.updateOrbitalInsertion(altitude, velocity || { x: 0, y: 0, z: 0 }, mass, maxThrust, gravity, dt);

      default:
        return { throttle: 0, reason: 'unknown_mode' };
    }
  }

  getSuicideBurnAltitude(): number {
    return this.suicideBurnAltitude;
  }

  isSuicideBurnActive(): boolean {
    return this.suicideBurnActive;
  }

  private updateAltitudeHold(altitude: number, verticalSpeed: number, dt: number): ThrottleCommand {
    if (this.targetAltitude === null) {
      return { throttle: 0, reason: 'no_target_altitude' };
    }

    const deadband = this.config.altitudeHoldDeadband;
    const error = this.targetAltitude - altitude;

    if (Math.abs(error) < deadband && Math.abs(verticalSpeed) < this.config.speedHoldDeadband) {
      // Within deadband and stable
      return { throttle: 0, reason: 'altitude_hold_stable' };
    }

    const throttleCmd = this.altitudePID.update(altitude, this.targetAltitude, dt);
    const throttle = Math.max(0, Math.min(1, throttleCmd));

    return { throttle, reason: 'altitude_hold_active' };
  }

  private updateVerticalSpeedHold(verticalSpeed: number, dt: number): ThrottleCommand {
    if (this.targetVerticalSpeed === null) {
      return { throttle: 0, reason: 'no_target_speed' };
    }

    const deadband = this.config.speedHoldDeadband;
    const error = this.targetVerticalSpeed - verticalSpeed;

    if (Math.abs(error) < deadband) {
      // Within deadband
      return { throttle: 0, reason: 'speed_hold_stable' };
    }

    const throttleCmd = this.verticalSpeedPID.update(verticalSpeed, this.targetVerticalSpeed, dt);
    const throttle = Math.max(0, Math.min(1, throttleCmd));

    return { throttle, reason: 'speed_hold_active' };
  }

  private updateSuicideBurn(
    altitude: number,
    verticalSpeed: number,
    mass: number,
    maxThrust: number,
    gravity: number,
    dt: number
  ): ThrottleCommand {
    // Calculate suicide burn altitude
    const acceleration = maxThrust / mass;
    const stopDistance = (verticalSpeed * verticalSpeed) / (2 * acceleration);
    const safetyFactor = this.config.suicideBurnSafetyFactor;
    this.suicideBurnAltitude = stopDistance * safetyFactor;

    if (altitude <= this.suicideBurnAltitude && verticalSpeed < -0.1) {
      this.suicideBurnActive = true;
      return { throttle: 1.0, reason: 'suicide_burn_active' };
    }

    if (this.suicideBurnActive && Math.abs(verticalSpeed) < 1.0) {
      // Nearly stopped, reduce throttle
      return { throttle: 0.5, reason: 'suicide_burn_final' };
    }

    this.suicideBurnActive = false;
    return { throttle: 0, reason: 'suicide_burn_waiting' };
  }

  private updateHover(
    altitude: number,
    mass: number,
    maxThrust: number,
    gravity: number,
    dt: number
  ): ThrottleCommand {
    // Calculate hover throttle: T = mg
    const hoverThrust = mass * gravity;
    let hoverThrottle = hoverThrust / maxThrust;

    // Add margin for stability
    hoverThrottle += this.config.hoverThrottleMargin;

    // Clamp to valid range
    hoverThrottle = Math.max(0, Math.min(1, hoverThrottle));

    return { throttle: hoverThrottle, reason: 'hover_active' };
  }

  /**
   * Landing Autopilot
   * Multi-phase automatic landing sequence:
   * 1. Descent - slow descent at controlled rate
   * 2. Deceleration - reduce vertical speed
   * 3. Final - precise altitude control
   * 4. Touchdown - gentle contact with surface
   */
  private updateLanding(
    altitude: number,
    verticalSpeed: number,
    mass: number,
    maxThrust: number,
    gravity: number,
    dt: number
  ): ThrottleCommand {
    const DESCENT_SPEED = -5; // m/s (downward)
    const FINAL_ALTITUDE = 100; // Switch to final approach
    const TOUCHDOWN_ALTITUDE = 10; // Final touchdown phase
    const TOUCHDOWN_SPEED = -1; // Very slow final descent

    // Phase transitions
    if (this.landingPhase === 'descent' && altitude < FINAL_ALTITUDE) {
      this.landingPhase = 'deceleration';
    } else if (this.landingPhase === 'deceleration' && Math.abs(verticalSpeed - DESCENT_SPEED) < 0.5) {
      this.landingPhase = 'final';
    } else if (this.landingPhase === 'final' && altitude < TOUCHDOWN_ALTITUDE) {
      this.landingPhase = 'touchdown';
    }

    switch (this.landingPhase) {
      case 'descent': {
        // Maintain constant descent rate
        this.targetVerticalSpeed = DESCENT_SPEED;
        return this.updateVerticalSpeedHold(verticalSpeed, dt);
      }

      case 'deceleration': {
        // Slow down to descent speed
        const targetSpeed = Math.max(DESCENT_SPEED, verticalSpeed + 0.5); // Gradual deceleration
        this.targetVerticalSpeed = targetSpeed;
        return this.updateVerticalSpeedHold(verticalSpeed, dt);
      }

      case 'final': {
        // Precision altitude control
        this.targetAltitude = Math.max(TOUCHDOWN_ALTITUDE, altitude - 1); // Descend 1m at a time
        return this.updateAltitudeHold(altitude, verticalSpeed, dt);
      }

      case 'touchdown': {
        // Very slow final descent
        this.targetVerticalSpeed = TOUCHDOWN_SPEED;
        const throttle = this.updateVerticalSpeedHold(verticalSpeed, dt).throttle;

        // Check for touchdown (altitude ~0 and slow speed)
        if (altitude < 1 && Math.abs(verticalSpeed) < 0.5) {
          this.landingPhase = 'touchdown';
          return { throttle: 0, reason: 'landing_complete' };
        }

        return { throttle, reason: 'landing_touchdown' };
      }

      default:
        return { throttle: 0, reason: 'landing_off' };
    }
  }

  /**
   * Docking Autopilot
   * Automatic approach and alignment with docking target
   * Phases:
   * 1. Approach - move toward target
   * 2. Alignment - match velocity and orientation
   * 3. Final - precise positioning
   * 4. Capture - complete docking
   */
  private updateDocking(
    position: Vector3,
    velocity: Vector3,
    mass: number,
    maxThrust: number,
    dt: number
  ): ThrottleCommand {
    if (!this.dockingTargetPosition) {
      return { throttle: 0, reason: 'no_docking_target' };
    }

    // Calculate distance to target
    const dx = this.dockingTargetPosition.x - position.x;
    const dy = this.dockingTargetPosition.y - position.y;
    const dz = this.dockingTargetPosition.z - position.z;
    this.dockingDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const APPROACH_DISTANCE = 1000; // 1km
    const ALIGNMENT_DISTANCE = 100; // 100m
    const FINAL_DISTANCE = 10; // 10m
    const CAPTURE_DISTANCE = 2; // 2m

    // Phase transitions
    if (this.dockingPhase === 'approach' && this.dockingDistance < ALIGNMENT_DISTANCE) {
      this.dockingPhase = 'alignment';
    } else if (this.dockingPhase === 'alignment' && this.dockingDistance < FINAL_DISTANCE) {
      this.dockingPhase = 'final';
    } else if (this.dockingPhase === 'final' && this.dockingDistance < CAPTURE_DISTANCE) {
      this.dockingPhase = 'capture';
    }

    switch (this.dockingPhase) {
      case 'approach': {
        // Fast approach - 10% throttle
        return { throttle: 0.1, reason: 'docking_approach' };
      }

      case 'alignment': {
        // Slow approach with velocity matching - 5% throttle
        return { throttle: 0.05, reason: 'docking_alignment' };
      }

      case 'final': {
        // Very slow approach - 2% throttle
        return { throttle: 0.02, reason: 'docking_final' };
      }

      case 'capture': {
        // Docking complete
        this.dockingPhase = 'capture';
        return { throttle: 0, reason: 'docking_complete' };
      }

      default:
        return { throttle: 0, reason: 'docking_off' };
    }
  }

  /**
   * Orbital Insertion Autopilot
   * Automatic insertion into circular orbit
   * Phases:
   * 1. Coasting - wait for apoapsis
   * 2. Burn - circularization burn at apoapsis
   * 3. Circularizing - fine-tune orbit
   * 4. Complete - orbit achieved
   */
  private updateOrbitalInsertion(
    altitude: number,
    velocity: Vector3,
    mass: number,
    maxThrust: number,
    gravity: number,
    dt: number
  ): ThrottleCommand {
    // Calculate current orbital velocity
    const currentSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

    // Calculate target circular orbital velocity: v = sqrt(GM/r)
    // Using simplified gravity model: g = GM/r^2, so GM = g*r^2
    const planetRadius = 1737400; // Moon radius (simplified)
    const orbitRadius = planetRadius + this.targetOrbitAltitude;
    const GM = gravity * orbitRadius * orbitRadius;
    this.targetOrbitalVelocity = Math.sqrt(GM / orbitRadius);

    const velocityError = this.targetOrbitalVelocity - currentSpeed;
    const VELOCITY_DEADBAND = 5; // m/s

    // Phase transitions
    if (this.orbitalInsertionPhase === 'coasting' && altitude >= this.targetOrbitAltitude * 0.95) {
      this.orbitalInsertionPhase = 'burn';
    } else if (this.orbitalInsertionPhase === 'burn' && Math.abs(velocityError) < 50) {
      this.orbitalInsertionPhase = 'circularizing';
    } else if (this.orbitalInsertionPhase === 'circularizing' && Math.abs(velocityError) < VELOCITY_DEADBAND) {
      this.orbitalInsertionPhase = 'complete';
    }

    switch (this.orbitalInsertionPhase) {
      case 'coasting': {
        // No thrust - coasting to apoapsis
        return { throttle: 0, reason: 'orbital_coasting' };
      }

      case 'burn': {
        // Full throttle circularization burn
        if (velocityError > 0) {
          return { throttle: 1.0, reason: 'orbital_burn' };
        } else {
          return { throttle: 0, reason: 'orbital_burn_complete' };
        }
      }

      case 'circularizing': {
        // Fine-tune orbit with partial throttle
        const throttle = Math.min(0.3, Math.abs(velocityError) / 50);
        return { throttle, reason: 'orbital_circularizing' };
      }

      case 'complete': {
        // Orbit achieved
        return { throttle: 0, reason: 'orbital_complete' };
      }

      default:
        return { throttle: 0, reason: 'orbital_off' };
    }
  }

  // Getters for new autopilot phases
  getLandingPhase(): string {
    return this.landingPhase;
  }

  getDockingPhase(): string {
    return this.dockingPhase;
  }

  getOrbitalInsertionPhase(): string {
    return this.orbitalInsertionPhase;
  }

  setDockingTarget(position: Vector3): void {
    this.dockingTargetPosition = position;
  }

  setTargetOrbitAltitude(altitude: number): void {
    this.targetOrbitAltitude = altitude;
  }
}

/**
 * Gimbal Autopilot
 * Automatically vectors thrust to null horizontal velocity
 */
export class GimbalAutopilot {
  private enabled: boolean = false;
  private maxGimbalAngle: number = 6;  // degrees

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  update(velocity: Vector3, thrust: number, mass: number): GimbalCommand {
    if (!this.enabled || thrust < 100) {
      return { pitch: 0, yaw: 0 };
    }

    // Calculate horizontal velocity
    const horizontalVel = { x: velocity.x, y: velocity.y };
    const horizontalSpeed = Math.sqrt(horizontalVel.x ** 2 + horizontalVel.y ** 2);

    if (horizontalSpeed < 0.1) {
      // Negligible horizontal velocity
      return { pitch: 0, yaw: 0 };
    }

    // Calculate required gimbal angle to counter horizontal drift
    const thrustAccel = thrust / mass;
    let gimbalAngle = Math.atan2(horizontalSpeed, thrustAccel);
    gimbalAngle = Math.min(gimbalAngle, this.maxGimbalAngle * Math.PI / 180);

    // Calculate gimbal direction (oppose horizontal velocity)
    const direction = {
      x: -horizontalVel.x / horizontalSpeed,
      y: -horizontalVel.y / horizontalSpeed
    };

    const gimbalDeg = gimbalAngle * 180 / Math.PI;

    return {
      pitch: direction.y * gimbalDeg,
      yaw: direction.x * gimbalDeg
    };
  }
}

/**
 * Flight Control System
 * Main integration point for all flight control subsystems
 */
export class FlightControlSystem {
  private config: FlightControlConfig;
  private sas: SASController;
  private autopilot: AutopilotSystem;
  private gimbalAutopilot: GimbalAutopilot;

  constructor(config?: Partial<FlightControlConfig>) {
    this.config = {
      pid: {
        altitude: { kp: 0.05, ki: 0.001, kd: 0.2 },
        verticalSpeed: { kp: 0.8, ki: 0.1, kd: 0.15 },
        pitch: { kp: 1.5, ki: 0.05, kd: 0.5 },
        roll: { kp: 1.5, ki: 0.05, kd: 0.5 },
        yaw: { kp: 1.5, ki: 0.05, kd: 0.5 },
        rateDamping: { kp: 2.0, ki: 0.0, kd: 0.3 }
      },
      sas: {
        deadband: 0.5,
        rateDeadband: 0.01,
        maxControlAuthority: 1.0
      },
      autopilot: {
        suicideBurnSafetyFactor: 1.15,
        hoverThrottleMargin: 0.05,
        altitudeHoldDeadband: 5.0,
        speedHoldDeadband: 0.5
      },
      ...config
    };

    this.sas = new SASController(this.config);
    this.autopilot = new AutopilotSystem(this.config);
    this.gimbalAutopilot = new GimbalAutopilot();
  }

  // SAS Controls
  setSASMode(mode: SASMode): void {
    this.sas.setMode(mode);
  }

  getSASMode(): SASMode {
    return this.sas.getMode();
  }

  // Autopilot Controls
  setAutopilotMode(mode: AutopilotMode): void {
    this.autopilot.setMode(mode);
  }

  getAutopilotMode(): AutopilotMode {
    return this.autopilot.getMode();
  }

  setTargetAltitude(altitude: number): void {
    this.autopilot.setTargetAltitude(altitude);
  }

  setTargetVerticalSpeed(speed: number): void {
    this.autopilot.setTargetVerticalSpeed(speed);
  }

  // Gimbal Autopilot
  setGimbalAutopilot(enabled: boolean): void {
    this.gimbalAutopilot.setEnabled(enabled);
  }

  isGimbalAutopilotEnabled(): boolean {
    return this.gimbalAutopilot.isEnabled();
  }

  // Main Update
  update(
    currentAttitude: Quaternion,
    currentAngularVel: Vector3,
    targetAttitude: Quaternion | null,
    velocity: Vector3,
    position: Vector3,
    altitude: number,
    verticalSpeed: number,
    mass: number,
    maxThrust: number,
    currentThrust: number,
    gravity: number,
    dt: number
  ): FlightControlState {
    // Update SAS
    const rcsCommands = this.sas.update(
      currentAttitude,
      currentAngularVel,
      targetAttitude,
      velocity,
      position,
      dt
    );

    // Update Autopilot (now with position and velocity for new autopilot modes)
    const throttleCommand = this.autopilot.update(
      altitude,
      verticalSpeed,
      mass,
      maxThrust,
      gravity,
      dt,
      position,
      velocity
    );

    // Update Gimbal Autopilot
    const gimbalCommand = this.gimbalAutopilot.update(velocity, currentThrust, mass);

    return {
      sasMode: this.sas.getMode(),
      autopilotMode: this.autopilot.getMode(),
      targetAltitude: null,
      targetVerticalSpeed: null,
      targetAttitude,
      suicideBurnActive: this.autopilot.isSuicideBurnActive(),
      suicideBurnAltitude: this.autopilot.getSuicideBurnAltitude(),
      hoverActive: this.autopilot.getMode() === 'hover',
      landingPhase: this.autopilot.getLandingPhase() as any,
      dockingPhase: this.autopilot.getDockingPhase() as any,
      orbitalInsertionPhase: this.autopilot.getOrbitalInsertionPhase() as any,
      rcsCommands,
      throttleCommand,
      gimbalCommand
    };
  }

  getState(): FlightControlState {
    return {
      sasMode: this.sas.getMode(),
      autopilotMode: this.autopilot.getMode(),
      targetAltitude: null,
      targetVerticalSpeed: null,
      targetAttitude: null,
      suicideBurnActive: this.autopilot.isSuicideBurnActive(),
      suicideBurnAltitude: this.autopilot.getSuicideBurnAltitude(),
      hoverActive: this.autopilot.getMode() === 'hover',
      landingPhase: this.autopilot.getLandingPhase() as any,
      dockingPhase: this.autopilot.getDockingPhase() as any,
      orbitalInsertionPhase: this.autopilot.getOrbitalInsertionPhase() as any,
      rcsCommands: { pitch: 0, roll: 0, yaw: 0 },
      throttleCommand: { throttle: 0, reason: 'idle' },
      gimbalCommand: { pitch: 0, yaw: 0 }
    };
  }

  // New autopilot control methods
  setDockingTarget(position: Vector3): void {
    this.autopilot.setDockingTarget(position);
  }

  setTargetOrbitAltitude(altitude: number): void {
    this.autopilot.setTargetOrbitAltitude(altitude);
  }
}
