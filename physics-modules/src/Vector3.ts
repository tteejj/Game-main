/**
 * Vector3.ts
 * 3D Vector class for physics calculations
 */

export class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  /**
   * Add two vectors
   */
  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  /**
   * Subtract two vectors
   */
  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  /**
   * Scale vector by scalar
   */
  scale(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  /**
   * Dot product
   */
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /**
   * Cross product
   */
  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  /**
   * Vector length (magnitude)
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Squared length (faster than length, useful for comparisons)
   */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /**
   * Normalize vector to unit length
   */
  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) return new Vector3(0, 0, 0);
    return this.scale(1 / len);
  }

  /**
   * Distance to another vector
   */
  distanceTo(v: Vector3): number {
    return this.subtract(v).length();
  }

  /**
   * Clone vector
   */
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /**
   * Check if vectors are equal
   */
  equals(v: Vector3, epsilon: number = 1e-10): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon &&
      Math.abs(this.y - v.y) < epsilon &&
      Math.abs(this.z - v.z) < epsilon
    );
  }

  /**
   * Linear interpolation between two vectors
   */
  lerp(v: Vector3, t: number): Vector3 {
    return this.add(v.subtract(this).scale(t));
  }

  /**
   * Component-wise multiply
   */
  multiply(v: Vector3): Vector3 {
    return new Vector3(this.x * v.x, this.y * v.y, this.z * v.z);
  }

  /**
   * Component-wise divide
   */
  divide(v: Vector3): Vector3 {
    return new Vector3(
      v.x !== 0 ? this.x / v.x : 0,
      v.y !== 0 ? this.y / v.y : 0,
      v.z !== 0 ? this.z / v.z : 0
    );
  }

  /**
   * Get angle between two vectors (in radians)
   */
  angleTo(v: Vector3): number {
    const denominator = Math.sqrt(this.lengthSquared() * v.lengthSquared());
    if (denominator === 0) return Math.PI / 2;

    const theta = this.dot(v) / denominator;
    return Math.acos(Math.max(-1, Math.min(1, theta)));
  }

  /**
   * Project this vector onto another vector
   */
  projectOnto(v: Vector3): Vector3 {
    const scalar = this.dot(v) / v.lengthSquared();
    return v.scale(scalar);
  }

  /**
   * Reflect vector across normal
   */
  reflect(normal: Vector3): Vector3 {
    return this.subtract(normal.scale(2 * this.dot(normal)));
  }

  /**
   * Convert to string
   */
  toString(): string {
    return `Vector3(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
  }

  /**
   * Create from array [x, y, z]
   */
  static fromArray(arr: number[]): Vector3 {
    return new Vector3(arr[0] || 0, arr[1] || 0, arr[2] || 0);
  }

  /**
   * Convert to array [x, y, z]
   */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /**
   * Zero vector
   */
  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  /**
   * Unit X vector
   */
  static unitX(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  /**
   * Unit Y vector
   */
  static unitY(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  /**
   * Unit Z vector
   */
  static unitZ(): Vector3 {
    return new Vector3(0, 0, 1);
  }
}
