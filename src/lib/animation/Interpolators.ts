/**
 * Animation Interpolators
 *
 * Functions for interpolating between keyframe values.
 * Sprint 6: Animation System & Timeline
 */

import * as THREE from 'three';

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation for Vector3 [x, y, z]
 */
export function lerpVector3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

/**
 * Spherical linear interpolation for rotations (Euler angles)
 * Converts to quaternions, slerps, converts back
 */
export function slerpRotation(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const qa = new THREE.Quaternion().setFromEuler(new THREE.Euler(a[0], a[1], a[2]));
  const qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(b[0], b[1], b[2]));

  qa.slerp(qb, t);

  const euler = new THREE.Euler().setFromQuaternion(qa);
  return [euler.x, euler.y, euler.z];
}

/**
 * Cubic bezier easing function
 * @param t - Time parameter (0-1)
 * @param p0-p3 - Control points for cubic bezier
 */
export function cubicBezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const u = 1 - t;
  return (
    u * u * u * p0 +
    3 * u * u * t * p1 +
    3 * u * t * t * p2 +
    t * t * t * p3
  );
}

/**
 * Bezier interpolation with custom easing
 * @param a - Start value
 * @param b - End value
 * @param t - Time parameter (0-1)
 * @param easing - Cubic bezier control points [x1, y1, x2, y2]
 */
export function bezierInterpolate(
  a: number,
  b: number,
  t: number,
  easing: [number, number, number, number] = [0.42, 0, 0.58, 1] // ease-in-out
): number {
  // Apply easing to t
  const easedT = cubicBezier(t, 0, easing[1], easing[3], 1);
  return lerp(a, b, easedT);
}

/**
 * Step interpolation (no interpolation, instant change)
 */
export function stepInterpolate(a: number, b: number, t: number): number {
  return t < 1 ? a : b;
}

/**
 * Color interpolation (hex colors)
 */
export function lerpColor(a: string, b: string, t: number): string {
  const colorA = new THREE.Color(a);
  const colorB = new THREE.Color(b);

  colorA.lerp(colorB, t);

  return '#' + colorA.getHexString().toUpperCase();
}

/**
 * Generic interpolation dispatcher
 * Handles different value types and interpolation modes
 */
export function interpolate(
  a: any,
  b: any,
  t: number,
  mode: 'linear' | 'bezier' | 'step' = 'linear',
  easing?: [number, number, number, number]
): any {
  // Handle null/undefined
  if (a === null || a === undefined || b === null || b === undefined) {
    return mode === 'step' && t < 1 ? a : b;
  }

  // Number
  if (typeof a === 'number' && typeof b === 'number') {
    if (mode === 'step') return stepInterpolate(a, b, t);
    if (mode === 'bezier' && easing) return bezierInterpolate(a, b, t, easing);
    return lerp(a, b, t);
  }

  // Vector3 [x, y, z]
  if (Array.isArray(a) && Array.isArray(b) && a.length === 3 && b.length === 3) {
    if (mode === 'step') {
      return t < 1 ? a : b;
    }
    return lerpVector3(a, b, t);
  }

  // Color (hex string)
  if (typeof a === 'string' && typeof b === 'string' && a.startsWith('#') && b.startsWith('#')) {
    if (mode === 'step') return t < 1 ? a : b;
    return lerpColor(a, b, t);
  }

  // Boolean (step only)
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return t < 1 ? a : b;
  }

  // Default: return b if t >= 1, otherwise a
  return t < 1 ? a : b;
}

/**
 * Get value at specific time from sorted keyframes
 */
export function getValueAtTime(
  keyframes: Array<{ time: number; value: any; interpolation?: 'linear' | 'bezier' | 'step'; easing?: [number, number, number, number] }>,
  time: number
): any {
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0].value;

  // Before first keyframe
  if (time <= keyframes[0].time) return keyframes[0].value;

  // After last keyframe
  if (time >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }

  // Find surrounding keyframes
  for (let i = 0; i < keyframes.length - 1; i++) {
    const current = keyframes[i];
    const next = keyframes[i + 1];

    if (time >= current.time && time <= next.time) {
      // Calculate normalized time between keyframes (0-1)
      const t = (time - current.time) / (next.time - current.time);

      // Interpolate using the current keyframe's interpolation mode
      const mode = current.interpolation || 'linear';
      const easing = current.easing;

      return interpolate(current.value, next.value, t, mode, easing);
    }
  }

  return keyframes[keyframes.length - 1].value;
}
