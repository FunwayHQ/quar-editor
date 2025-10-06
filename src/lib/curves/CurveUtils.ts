/**
 * Curve Utilities
 *
 * Helper functions for curve manipulation and analysis.
 */

import * as THREE from 'three';

/**
 * Resample a curve to a specific number of points
 */
export function resampleCurve(points: THREE.Vector2[], targetCount: number): THREE.Vector2[] {
  if (points.length === 0) return [];
  if (points.length === targetCount) return points;

  // Create a curve from points
  const curve = new THREE.SplineCurve(points);

  // Sample at uniform intervals
  const resampled: THREE.Vector2[] = [];
  for (let i = 0; i < targetCount; i++) {
    const t = i / (targetCount - 1);
    resampled.push(curve.getPoint(t));
  }

  return resampled;
}

/**
 * Get curve orientation (clockwise or counter-clockwise)
 * Returns positive value for counter-clockwise, negative for clockwise
 */
export function getCurveOrientation(points: THREE.Vector2[]): number {
  if (points.length < 3) return 0;

  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    sum += (p2.x - p1.x) * (p2.y + p1.y);
  }

  return sum;
}

/**
 * Reverse curve points
 */
export function reverseCurve(points: THREE.Vector2[]): THREE.Vector2[] {
  return [...points].reverse();
}

/**
 * Calculate curve length
 */
export function calculateCurveLength(points: THREE.Vector2[]): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    length += points[i].distanceTo(points[i + 1]);
  }
  return length;
}

/**
 * Convert 2D curve points to Three.js Shape
 */
export function pointsToShape(points: THREE.Vector2[], closed: boolean = false): THREE.Shape {
  const shape = new THREE.Shape();

  if (points.length === 0) return shape;

  shape.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].y);
  }

  if (closed) {
    shape.closePath();
  }

  return shape;
}

/**
 * Convert 2D curve points to Three.js Curve (for lofting/sweeping)
 */
export function pointsToCurve(points: THREE.Vector2[]): THREE.CatmullRomCurve3 {
  const points3D = points.map(p => new THREE.Vector3(p.x, 0, p.y));
  return new THREE.CatmullRomCurve3(points3D);
}

/**
 * Get bounding box of curve points
 */
export function getCurveBounds(points: THREE.Vector2[]): {
  min: THREE.Vector2;
  max: THREE.Vector2;
  center: THREE.Vector2;
  size: THREE.Vector2;
} {
  if (points.length === 0) {
    return {
      min: new THREE.Vector2(0, 0),
      max: new THREE.Vector2(0, 0),
      center: new THREE.Vector2(0, 0),
      size: new THREE.Vector2(0, 0)
    };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  return {
    min: new THREE.Vector2(minX, minY),
    max: new THREE.Vector2(maxX, maxY),
    center: new THREE.Vector2((minX + maxX) / 2, (minY + maxY) / 2),
    size: new THREE.Vector2(maxX - minX, maxY - minY)
  };
}
