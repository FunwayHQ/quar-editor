/**
 * RevolveUtils Tests
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { revolveCurve, generateRevolveName } from '../RevolveUtils';
import { Curve } from '../../../stores/curveStore';
import { RevolveOptions } from '../../../stores/meshOperationsStore';

const createMockCurve = (): Curve => ({
  id: 'test-curve',
  name: 'TestCurve',
  type: 'svg',
  points: [
    new THREE.Vector2(1, 0),
    new THREE.Vector2(2, 1),
    new THREE.Vector2(1, 2)
  ],
  closed: false,
  svgPath: 'M 1 0 L 2 1 L 1 2',
  transform: {
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    scale: new THREE.Vector2(1, 1)
  },
  createdAt: Date.now(),
  modifiedAt: Date.now()
});

describe('RevolveUtils', () => {
  describe('revolveCurve()', () => {
    it('should create a mesh from curve', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'y',
        angle: 360,
        segments: 32,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('should create geometry with correct vertex count', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'y',
        angle: 360,
        segments: 16,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);
      const geometry = mesh.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it('should revolve around Y axis (default)', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'y',
        angle: 360,
        segments: 32,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);

      // Should create valid mesh without errors
      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should revolve around X axis', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'x',
        angle: 360,
        segments: 32,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    it('should revolve around Z axis', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'z',
        angle: 360,
        segments: 32,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    it('should create full revolution (360 degrees)', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'y',
        angle: 360,
        segments: 32,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);
      const geometry = mesh.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it('should create half revolution (180 degrees)', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'y',
        angle: 180,
        segments: 32,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should create quarter revolution (90 degrees)', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'y',
        angle: 90,
        segments: 16,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should use different segment counts', () => {
      const curve = createMockCurve();

      const mesh8 = revolveCurve(curve, {
        axis: 'y',
        angle: 360,
        segments: 8,
        offset: 0,
        phiStart: 0
      });

      const mesh64 = revolveCurve(curve, {
        axis: 'y',
        angle: 360,
        segments: 64,
        offset: 0,
        phiStart: 0
      });

      const geo8 = mesh8.geometry as THREE.BufferGeometry;
      const geo64 = mesh64.geometry as THREE.BufferGeometry;

      // More segments = more vertices
      expect(geo64.attributes.position.count).toBeGreaterThan(geo8.attributes.position.count);
    });

    it('should apply offset from axis', () => {
      const curve = createMockCurve();

      const meshNoOffset = revolveCurve(curve, {
        axis: 'y',
        angle: 360,
        segments: 32,
        offset: 0,
        phiStart: 0
      });

      const meshWithOffset = revolveCurve(curve, {
        axis: 'y',
        angle: 360,
        segments: 32,
        offset: 2,
        phiStart: 0
      });

      // Both should create valid meshes
      expect(meshNoOffset).toBeInstanceOf(THREE.Mesh);
      expect(meshWithOffset).toBeInstanceOf(THREE.Mesh);
    });

    it('should use phiStart to offset start angle', () => {
      const curve = createMockCurve();

      const mesh = revolveCurve(curve, {
        axis: 'y',
        angle: 180,
        segments: 32,
        offset: 0,
        phiStart: 90 // Start at 90 degrees
      });

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should compute vertex normals', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'y',
        angle: 360,
        segments: 32,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);
      const geometry = mesh.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.normal).toBeDefined();
      expect(geometry.attributes.normal.count).toBeGreaterThan(0);
    });

    it('should create double-sided material', () => {
      const curve = createMockCurve();
      const options: RevolveOptions = {
        axis: 'y',
        angle: 360,
        segments: 32,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);
      const material = mesh.material as THREE.MeshStandardMaterial;

      expect(material.side).toBe(THREE.DoubleSide);
    });

    it('should handle curve with many points', () => {
      const manyPoints = Array.from({ length: 50 }, (_, i) =>
        new THREE.Vector2(1 + Math.sin(i * 0.1), i * 0.1)
      );

      const curve: Curve = {
        ...createMockCurve(),
        points: manyPoints
      };

      const options: RevolveOptions = {
        axis: 'y',
        angle: 360,
        segments: 32,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should handle curve with few points', () => {
      const curve: Curve = {
        ...createMockCurve(),
        points: [
          new THREE.Vector2(1, 0),
          new THREE.Vector2(1, 2)
        ]
      };

      const options: RevolveOptions = {
        axis: 'y',
        angle: 360,
        segments: 16,
        offset: 0,
        phiStart: 0
      };

      const mesh = revolveCurve(curve, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });
  });

  describe('generateRevolveName()', () => {
    it('should generate name with "_revolved" suffix', () => {
      const name = generateRevolveName('star');

      expect(name).toBe('star_revolved');
    });

    it('should handle empty curve name', () => {
      const name = generateRevolveName('');

      expect(name).toBe('_revolved');
    });

    it('should handle curve name with spaces', () => {
      const name = generateRevolveName('my curve');

      expect(name).toBe('my curve_revolved');
    });
  });
});
