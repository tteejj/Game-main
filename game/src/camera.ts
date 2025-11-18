/**
 * Camera system for 3D space navigation
 * Handles view transformations and projection
 */

import { Vector3 } from '../../universe-system/src/CelestialBody';

export enum CameraMode {
    FOLLOW_SHIP = 'FOLLOW_SHIP',
    FREE_CAM = 'FREE_CAM',
    ORBIT_TARGET = 'ORBIT_TARGET',
    CHASE_CAM = 'CHASE_CAM'
}

export class Camera {
    // Camera position in world space
    public position: Vector3 = { x: 0, y: 0, z: 0 };

    // Camera orientation (in radians)
    public pitch: number = 0; // Up/down rotation
    public yaw: number = 0;   // Left/right rotation
    public roll: number = 0;  // Roll rotation

    // Camera settings
    public fov: number = 60; // Field of view in degrees
    public zoom: number = 1.0;
    public nearClip: number = 0.1;
    public farClip: number = 1e12; // 1 million km

    // Camera mode
    public mode: CameraMode = CameraMode.FOLLOW_SHIP;

    // Target tracking
    private target: Vector3 | null = null;
    private targetDistance: number = 1000; // Distance from target
    private orbitAngle: number = 0;

    // Smooth camera movement
    private velocity: Vector3 = { x: 0, y: 0, z: 0 };
    private damping: number = 0.1;

    // Canvas dimensions
    private canvasWidth: number = 1280;
    private canvasHeight: number = 720;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    /**
     * Set the camera target (for follow/orbit modes)
     */
    setTarget(target: Vector3): void {
        this.target = target;
    }

    /**
     * Set camera mode
     */
    setMode(mode: CameraMode): void {
        this.mode = mode;
    }

    /**
     * Update camera position based on mode
     */
    update(deltaTime: number, shipPosition: Vector3, shipVelocity: Vector3): void {
        switch (this.mode) {
            case CameraMode.FOLLOW_SHIP:
                this.updateFollowShip(deltaTime, shipPosition, shipVelocity);
                break;
            case CameraMode.CHASE_CAM:
                this.updateChaseCam(deltaTime, shipPosition, shipVelocity);
                break;
            case CameraMode.ORBIT_TARGET:
                this.updateOrbitTarget(deltaTime);
                break;
            case CameraMode.FREE_CAM:
                // Free cam is controlled by user input, just apply damping
                this.applyDamping(deltaTime);
                break;
        }
    }

    /**
     * Follow ship from behind and above
     */
    private updateFollowShip(_deltaTime: number, shipPosition: Vector3, _shipVelocity: Vector3): void {
        // Camera offset behind and above ship
        const offset: Vector3 = {
            x: 0,
            y: -this.targetDistance * 0.7,  // Behind
            z: this.targetDistance * 0.3     // Above
        };

        // Target position is ship position + offset
        const targetPos: Vector3 = {
            x: shipPosition.x + offset.x,
            y: shipPosition.y + offset.y,
            z: shipPosition.z + offset.z
        };

        // Smoothly interpolate camera to target position
        this.position.x += (targetPos.x - this.position.x) * this.damping;
        this.position.y += (targetPos.y - this.position.y) * this.damping;
        this.position.z += (targetPos.z - this.position.z) * this.damping;

        // Look at ship
        this.lookAt(shipPosition);
    }

    /**
     * Chase camera - follows behind ship aligned with velocity
     */
    private updateChaseCam(deltaTime: number, shipPosition: Vector3, shipVelocity: Vector3): void {
        const velMag = Math.sqrt(
            shipVelocity.x ** 2 + shipVelocity.y ** 2 + shipVelocity.z ** 2
        );

        if (velMag > 1) {
            // Camera behind ship along velocity vector
            const offset: Vector3 = {
                x: -(shipVelocity.x / velMag) * this.targetDistance,
                y: -(shipVelocity.y / velMag) * this.targetDistance,
                z: this.targetDistance * 0.2  // Slight elevation
            };

            const targetPos: Vector3 = {
                x: shipPosition.x + offset.x,
                y: shipPosition.y + offset.y,
                z: shipPosition.z + offset.z
            };

            // Smooth interpolation
            this.position.x += (targetPos.x - this.position.x) * this.damping;
            this.position.y += (targetPos.y - this.position.y) * this.damping;
            this.position.z += (targetPos.z - this.position.z) * this.damping;
        } else {
            // Fallback to follow mode if ship is stationary
            this.updateFollowShip(deltaTime, shipPosition, shipVelocity);
        }

        this.lookAt(shipPosition);
    }

    /**
     * Orbit around target
     */
    private updateOrbitTarget(deltaTime: number): void {
        if (!this.target) return;

        this.orbitAngle += deltaTime * 0.2; // Rotate over time

        this.position.x = this.target.x + Math.cos(this.orbitAngle) * this.targetDistance;
        this.position.y = this.target.y + Math.sin(this.orbitAngle) * this.targetDistance;
        this.position.z = this.target.z + this.targetDistance * 0.3;

        this.lookAt(this.target);
    }

    /**
     * Apply damping to velocity
     */
    private applyDamping(deltaTime: number): void {
        this.velocity.x *= (1 - this.damping);
        this.velocity.y *= (1 - this.damping);
        this.velocity.z *= (1 - this.damping);

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
    }

    /**
     * Point camera at target
     */
    lookAt(target: Vector3): void {
        const dx = target.x - this.position.x;
        const dy = target.y - this.position.y;
        const dz = target.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance > 0) {
            this.yaw = Math.atan2(dy, dx);
            this.pitch = Math.asin(dz / distance);
        }
    }

    /**
     * Move camera in free cam mode
     */
    move(direction: Vector3, speed: number): void {
        this.velocity.x += direction.x * speed;
        this.velocity.y += direction.y * speed;
        this.velocity.z += direction.z * speed;
    }

    /**
     * Rotate camera
     */
    rotate(deltaYaw: number, deltaPitch: number): void {
        this.yaw += deltaYaw;
        this.pitch += deltaPitch;

        // Clamp pitch
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }

    /**
     * Adjust zoom level
     */
    adjustZoom(delta: number): void {
        this.zoom *= (1 + delta);
        this.zoom = Math.max(0.1, Math.min(100, this.zoom));
        this.targetDistance = 1000 / this.zoom;
    }

    /**
     * Project 3D world position to 2D screen coordinates
     */
    worldToScreen(worldPos: Vector3): { x: number, y: number, visible: boolean, distance: number } {
        // Translate to camera space
        const dx = worldPos.x - this.position.x;
        const dy = worldPos.y - this.position.y;
        const dz = worldPos.z - this.position.z;

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Rotate to camera orientation
        const cosYaw = Math.cos(-this.yaw);
        const sinYaw = Math.sin(-this.yaw);
        const cosPitch = Math.cos(-this.pitch);
        const sinPitch = Math.sin(-this.pitch);

        // Camera space coordinates
        let cx = dx * cosYaw - dy * sinYaw;
        let cy = dx * sinYaw + dy * cosYaw;
        let cz = dz;

        // Apply pitch
        const tempY = cy;
        cy = cy * cosPitch - cz * sinPitch;
        cz = tempY * sinPitch + cz * cosPitch;

        // Check if behind camera
        if (cy <= this.nearClip) {
            return { x: 0, y: 0, visible: false, distance };
        }

        // Perspective projection
        const fovScale = Math.tan((this.fov * Math.PI / 180) / 2);
        const aspect = this.canvasWidth / this.canvasHeight;

        const screenX = (cx / (cy * fovScale * aspect) / this.zoom) * (this.canvasWidth / 2) + (this.canvasWidth / 2);
        const screenY = (-cz / (cy * fovScale) / this.zoom) * (this.canvasHeight / 2) + (this.canvasHeight / 2);

        // Check if on screen
        const visible = screenX >= -100 && screenX <= this.canvasWidth + 100 &&
                       screenY >= -100 && screenY <= this.canvasHeight + 100;

        return { x: screenX, y: screenY, visible, distance };
    }

    /**
     * Calculate screen size for object at given distance
     */
    getScreenSize(actualSize: number, distance: number): number {
        if (distance <= 0) return 0;

        const fovScale = Math.tan((this.fov * Math.PI / 180) / 2);
        const screenSize = (actualSize / (distance * fovScale)) * (this.canvasHeight / 2) * this.zoom;

        return Math.max(1, screenSize); // Minimum 1 pixel
    }

    /**
     * Get camera forward vector
     */
    getForward(): Vector3 {
        return {
            x: Math.cos(this.yaw) * Math.cos(this.pitch),
            y: Math.sin(this.yaw) * Math.cos(this.pitch),
            z: Math.sin(this.pitch)
        };
    }

    /**
     * Get camera right vector
     */
    getRight(): Vector3 {
        return {
            x: Math.cos(this.yaw + Math.PI / 2),
            y: Math.sin(this.yaw + Math.PI / 2),
            z: 0
        };
    }

    /**
     * Get camera up vector
     */
    getUp(): Vector3 {
        const forward = this.getForward();
        const right = this.getRight();

        return {
            x: forward.y * right.z - forward.z * right.y,
            y: forward.z * right.x - forward.x * right.z,
            z: forward.x * right.y - forward.y * right.x
        };
    }
}
