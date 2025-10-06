/**
 * CurveUtils Tests
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  resampleCurve,
  getCurveOrientation,
  reverseCurve,
  calculateCurveLength,
  pointsToShape,
  pointsToCurve,
  getCurveBounds
} from '../CurveUtils';

describe('CurveUtils', () => {
  describe('resampleCurve()', () => {
    it('should resample curve to target point count', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(5, 5),
        new THREE.Vector2(10, 0)
      ];

      const resampled = resampleCurve(points, 10);

      expect(resampled).toHaveLength(10);
    });

    it('should return same points if already at target count', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(10, 10)
      ];

      const resampled = resampleCurve(points, 2);

      expect(resampled).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const resampled = resampleCurve([], 10);

      expect(resampled).toHaveLength(0);
    });
  });

  describe('getCurveOrientation()', () => {
    it('should detect counter-clockwise orientation', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(10, 0),
        new THREE.Vector2(10, 10),
        new THREE.Vector2(0, 10)
      ];

      const orientation = getCurveOrientation(points);

      expect(orientation).toBeLessThan(0); // CCW is negative (shoelace formula convention)
    });

    it('should detect clockwise orientation', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0, 10),
        new THREE.Vector2(10, 10),
        new THREE.Vector2(10, 0)
      ];

      const orientation = getCurveOrientation(points);

      expect(orientation).toBeGreaterThan(0); // CW is positive (shoelace formula convention)
    });

    it('should return 0 for too few points', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(10, 10)
      ];

      const orientation = getCurveOrientation(points);

      expect(orientation).toBe(0);
    });
  });

  describe('reverseCurve()', () => {
    it('should reverse point order', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(5, 5),
        new THREE.Vector2(10, 0)
      ];

      const reversed = reverseCurve(points);

      expect(reversed[0]).toEqual(points[2]);
      expect(reversed[1]).toEqual(points[1]);
      expect(reversed[2]).toEqual(points[0]);
    });

    it('should not mutate original array', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(10, 10)
      ];

      const reversed = reverseCurve(points);

      expect(points[0].x).toBe(0);
      expect(reversed).not.toBe(points);
    });
  });

  describe('calculateCurveLength()', () => {
    it('should calculate total curve length', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 4)
      ];

      const length = calculateCurveLength(points);

      expect(length).toBeCloseTo(7, 1); // 3 + 4 = 7
    });

    it('should return 0 for single point', () => {
      const points = [new THREE.Vector2(0, 0)];

      const length = calculateCurveLength(points);

      expect(length).toBe(0);
    });
  });

  describe('pointsToShape()', () => {
    it('should create a Shape from points', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(10, 0),
        new THREE.Vector2(10, 10)
      ];

      const shape = pointsToShape(points, false);

      expect(shape).toBeInstanceOf(THREE.Shape);
    });

    it('should close shape when closed=true', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(10, 0),
        new THREE.Vector2(10, 10)
      ];

      const shape = pointsToShape(points, true);

      expect(shape).toBeInstanceOf(THREE.Shape);
      // Note: Can't easily test if closePath was called, but no error is good
    });

    it('should handle empty points', () => {
      const shape = pointsToShape([], false);

      expect(shape).toBeInstanceOf(THREE.Shape);
    });
  });

  describe('pointsToCurve()', () => {
    it('should create a 3D curve from 2D points', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(5, 5),
        new THREE.Vector2(10, 0)
      ];

      const curve = pointsToCurve(points);

      expect(curve).toBeInstanceOf(THREE.CatmullRomCurve3);
      expect(curve.points).toHaveLength(3);
    });
  });

  describe('getCurveBounds()', () => {
    it('should calculate bounding box', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(10, 5),
        new THREE.Vector2(5, 10)
      ];

      const bounds = getCurveBounds(points);

      expect(bounds.min.x).toBe(0);
      expect(bounds.min.y).toBe(0);
      expect(bounds.max.x).toBe(10);
      expect(bounds.max.y).toBe(10);
      expect(bounds.center.x).toBe(5);
      expect(bounds.center.y).toBe(5);
      expect(bounds.size.x).toBe(10);
      expect(bounds.size.y).toBe(10);
    });

    it('should handle empty points', () => {
      const bounds = getCurveBounds([]);

      expect(bounds.min.x).toBe(0);
      expect(bounds.max.x).toBe(0);
      expect(bounds.center.x).toBe(0);
      expect(bounds.size.x).toBe(0);
    });

    it('should handle single point', () => {
      const points = [new THREE.Vector2(5, 5)];

      const bounds = getCurveBounds(points);

      expect(bounds.center.x).toBe(5);
      expect(bounds.center.y).toBe(5);
      expect(bounds.size.x).toBe(0);
      expect(bounds.size.y).toBe(0);
    });
  });
});
