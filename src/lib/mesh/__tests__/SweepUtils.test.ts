/**
 * SweepUtils Tests
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { sweepCurve, generateSweepName } from '../SweepUtils';
import { Curve } from '../../../stores/curveStore';
import { SweepOptions } from '../../../stores/meshOperationsStore';

const createMockCurve = (id: string, points: THREE.Vector2[], closed: boolean = false): Curve => ({
  id,
  name: `Curve_${id}`,
  type: 'svg',
  points,
  closed,
  svgPath: '',
  transform: {
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    scale: new THREE.Vector2(1, 1)
  },
  createdAt: Date.now(),
  modifiedAt: Date.now()
});

describe('SweepUtils', () => {
  describe('sweepCurve()', () => {
    it('should create mesh from profile and path', () => {
      // Profile: small circle
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.2, 0),
        new THREE.Vector2(0, 0.2),
        new THREE.Vector2(-0.2, 0),
        new THREE.Vector2(0, -0.2)
      ], true);

      // Path: straight line
      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0)
      ], false);

      const options: SweepOptions = {
        pathId: path.id,
        segments: 20,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    it('should create geometry with correct structure', () => {
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.1, 0),
        new THREE.Vector2(0, 0.1),
        new THREE.Vector2(-0.1, 0)
      ], false);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1)
      ], false);

      const options: SweepOptions = {
        pathId: path.id,
        segments: 10,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);
      const geometry = mesh.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.uv).toBeDefined();
      expect(geometry.attributes.normal).toBeDefined();
      expect(geometry.index).toBeDefined();
    });

    it('should apply taper (scale along path)', () => {
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.5, 0),
        new THREE.Vector2(0, 0.5),
        new THREE.Vector2(-0.5, 0),
        new THREE.Vector2(0, -0.5)
      ], true);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0)
      ], false);

      // Taper from full size to half size
      const options: SweepOptions = {
        pathId: path.id,
        segments: 20,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 0.5,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should apply twist (rotation along path)', () => {
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.2, 0),
        new THREE.Vector2(0, 0.2),
        new THREE.Vector2(-0.2, 0),
        new THREE.Vector2(0, -0.2)
      ], true);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0)
      ], false);

      // 180 degree twist
      const options: SweepOptions = {
        pathId: path.id,
        segments: 30,
        rotation: 180,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should handle curved paths', () => {
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.1, 0),
        new THREE.Vector2(0, 0.1),
        new THREE.Vector2(-0.1, 0)
      ], false);

      // Curved path (arc)
      const path = createMockCurve('path', Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 19) * Math.PI;
        return new THREE.Vector2(Math.cos(angle), Math.sin(angle));
      }), false);

      const options: SweepOptions = {
        pathId: path.id,
        segments: 40,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should handle closed profile curves', () => {
      // Closed circle profile
      const profile = createMockCurve('profile', Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return new THREE.Vector2(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2);
      }), true);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0)
      ], false);

      const options: SweepOptions = {
        pathId: path.id,
        segments: 20,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should handle open profile curves', () => {
      // Open arc profile
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.2, 0),
        new THREE.Vector2(0.1, 0.1),
        new THREE.Vector2(0, 0.2)
      ], false);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1)
      ], false);

      const options: SweepOptions = {
        pathId: path.id,
        segments: 15,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should use different segment counts', () => {
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.1, 0),
        new THREE.Vector2(0, 0.1),
        new THREE.Vector2(-0.1, 0)
      ], false);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0)
      ], false);

      const mesh10 = sweepCurve(profile, path, {
        pathId: path.id,
        segments: 10,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      });

      const mesh50 = sweepCurve(profile, path, {
        pathId: path.id,
        segments: 50,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      });

      const geo10 = mesh10.geometry as THREE.BufferGeometry;
      const geo50 = mesh50.geometry as THREE.BufferGeometry;

      // More segments = more vertices
      expect(geo50.attributes.position.count).toBeGreaterThan(geo10.attributes.position.count);
    });

    it('should compute vertex normals', () => {
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.1, 0),
        new THREE.Vector2(0, 0.1)
      ], false);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0)
      ], false);

      const options: SweepOptions = {
        pathId: path.id,
        segments: 10,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);
      const geometry = mesh.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.normal).toBeDefined();
      expect(geometry.attributes.normal.count).toBeGreaterThan(0);
    });

    it('should generate UVs', () => {
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.1, 0),
        new THREE.Vector2(0, 0.1)
      ], false);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0)
      ], false);

      const options: SweepOptions = {
        pathId: path.id,
        segments: 10,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);
      const geometry = mesh.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.uv).toBeDefined();
      expect(geometry.attributes.uv.count).toBeGreaterThan(0);
    });

    it('should handle no taper (uniform scale)', () => {
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.1, 0),
        new THREE.Vector2(0, 0.1)
      ], false);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0)
      ], false);

      const options: SweepOptions = {
        pathId: path.id,
        segments: 10,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should handle no twist', () => {
      const profile = createMockCurve('profile', [
        new THREE.Vector2(0.1, 0),
        new THREE.Vector2(0, 0.1)
      ], false);

      const path = createMockCurve('path', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0)
      ], false);

      const options: SweepOptions = {
        pathId: path.id,
        segments: 10,
        rotation: 0,
        scaleStart: 1.0,
        scaleEnd: 1.0,
        frames: 'frenet'
      };

      const mesh = sweepCurve(profile, path, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });
  });

  describe('generateSweepName()', () => {
    it('should generate name from profile and path names', () => {
      const name = generateSweepName('circle', 'wave');

      expect(name).toBe('circle_swept_along_wave');
    });

    it('should handle empty names', () => {
      const name = generateSweepName('', '');

      expect(name).toBe('_swept_along_');
    });
  });
});
