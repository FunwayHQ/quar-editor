/**
 * LoftUtils Tests
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { loftCurves, generateLoftName } from '../LoftUtils';
import { Curve } from '../../../stores/curveStore';
import { LoftOptions } from '../../../stores/meshOperationsStore';

const createMockCurve = (id: string, points: THREE.Vector2[], closed: boolean = true): Curve => ({
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

describe('LoftUtils', () => {
  describe('loftCurves()', () => {
    it('should create mesh from 2 curves', () => {
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(0, 1)
      ]);

      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.5, 0),
        new THREE.Vector2(0.5, 0.5),
        new THREE.Vector2(0, 0.5)
      ]);

      const options: LoftOptions = {
        curveIds: ['curve1', 'curve2'],
        axis: 'y',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      const mesh = loftCurves([curve1, curve2], options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    it('should create mesh from 3 curves', () => {
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(-1, -1),
        new THREE.Vector2(1, -1),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(-1, 1)
      ]);

      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(-0.5, -0.5),
        new THREE.Vector2(0.5, -0.5),
        new THREE.Vector2(0.5, 0.5),
        new THREE.Vector2(-0.5, 0.5)
      ]);

      const curve3 = createMockCurve('curve3', [
        new THREE.Vector2(-0.2, -0.2),
        new THREE.Vector2(0.2, -0.2),
        new THREE.Vector2(0.2, 0.2),
        new THREE.Vector2(-0.2, 0.2)
      ]);

      const options: LoftOptions = {
        curveIds: ['curve1', 'curve2', 'curve3'],
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      const mesh = loftCurves([curve1, curve2, curve3], options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it('should throw error with less than 2 curves', () => {
      const curve = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 1)
      ]);

      const options: LoftOptions = {
        curveIds: ['curve1'],
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      expect(() => loftCurves([curve], options)).toThrow('Loft requires at least 2 curves');
    });

    it('should resample curves to same point count', () => {
      // Curve 1: 4 points
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(0, 1)
      ]);

      // Curve 2: 10 points
      const curve2 = createMockCurve('curve2', Array.from({ length: 10 }, (_, i) =>
        new THREE.Vector2(Math.cos(i * 0.6), Math.sin(i * 0.6))
      ));

      const options: LoftOptions = {
        curveIds: ['curve1', 'curve2'],
        axis: 'y',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      const mesh = loftCurves([curve1, curve2], options);

      // Should create valid mesh despite different point counts
      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should handle closed curves', () => {
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(0, 1)
      ], true);

      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(0.2, 0.2),
        new THREE.Vector2(0.8, 0.2),
        new THREE.Vector2(0.8, 0.8),
        new THREE.Vector2(0.2, 0.8)
      ], true);

      const options: LoftOptions = {
        curveIds: ['curve1', 'curve2'],
        axis: 'y',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      const mesh = loftCurves([curve1, curve2], options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should handle open curves', () => {
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0.5),
        new THREE.Vector2(2, 0)
      ], false);

      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.5, 0.5),
        new THREE.Vector2(1, 0)
      ], false);

      const options: LoftOptions = {
        curveIds: ['curve1', 'curve2'],
        axis: 'y',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      const mesh = loftCurves([curve1, curve2], options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should create end caps when cap=true', () => {
      // Testing end caps feature
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(0, 1)
      ], true);

      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(0.3, 0.3),
        new THREE.Vector2(0.7, 0.3),
        new THREE.Vector2(0.7, 0.7),
        new THREE.Vector2(0.3, 0.7)
      ], true);

      const withoutCaps = loftCurves([curve1, curve2], {
        curveIds: ['curve1', 'curve2'],
        axis: 'y',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      });

      const withCaps = loftCurves([curve1, curve2], {
        curveIds: ['curve1', 'curve2'],
        axis: 'y',
        segments: 20,
        closed: false,
        cap: true,
        smooth: true
      });

      const withoutVertices = withoutCaps.geometry.attributes.position.count;
      const withVertices = withCaps.geometry.attributes.position.count;

      // With caps should have more vertices
      expect(withVertices).toBeGreaterThan(withoutVertices);
    });

    it('should compute vertex normals', () => {
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1)
      ]);

      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(0.5, 0.5),
        new THREE.Vector2(1.5, 0.5),
        new THREE.Vector2(1.5, 1.5)
      ]);

      const options: LoftOptions = {
        curveIds: ['curve1', 'curve2'],
        axis: 'y',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      const mesh = loftCurves([curve1, curve2], options);
      const geometry = mesh.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.normal).toBeDefined();
      expect(geometry.attributes.normal.count).toBeGreaterThan(0);
    });

    it('should generate UVs', () => {
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1)
      ]);

      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.5, 0),
        new THREE.Vector2(0.5, 0.5)
      ]);

      const options: LoftOptions = {
        curveIds: ['curve1', 'curve2'],
        axis: 'y',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      const mesh = loftCurves([curve1, curve2], options);
      const geometry = mesh.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.uv).toBeDefined();
      expect(geometry.attributes.uv.count).toBeGreaterThan(0);
    });

    it('should handle 4+ curves', () => {
      const curves = Array.from({ length: 5 }, (_, i) => {
        const scale = 1 - i * 0.2;
        return createMockCurve(`curve${i}`, [
          new THREE.Vector2(-scale, -scale),
          new THREE.Vector2(scale, -scale),
          new THREE.Vector2(scale, scale),
          new THREE.Vector2(-scale, scale)
        ]);
      });

      const options: LoftOptions = {
        curveIds: curves.map(c => c.id),
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      const mesh = loftCurves(curves, options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should handle curves with different orientations', () => {
      // Curve 1: Counter-clockwise
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(0, 1)
      ]);

      // Curve 2: Clockwise (reversed)
      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(0, 1),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(0, 0)
      ]);

      const options: LoftOptions = {
        curveIds: ['curve1', 'curve2'],
        axis: 'y',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      };

      // Should handle orientation mismatch by reversing one curve
      const mesh = loftCurves([curve1, curve2], options);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should loft along X axis', () => {
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1)
      ]);

      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.5, 0),
        new THREE.Vector2(0.5, 0.5)
      ]);

      const mesh = loftCurves([curve1, curve2], {
        curveIds: ['curve1', 'curve2'],
        axis: 'x',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      });

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should loft along Z axis', () => {
      const curve1 = createMockCurve('curve1', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1)
      ]);

      const curve2 = createMockCurve('curve2', [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.5, 0),
        new THREE.Vector2(0.5, 0.5)
      ]);

      const mesh = loftCurves([curve1, curve2], {
        curveIds: ['curve1', 'curve2'],
        axis: 'z',
        segments: 20,
        closed: false,
        cap: false,
        smooth: true
      });

      expect(mesh).toBeInstanceOf(THREE.Mesh);
    });
  });

  describe('generateLoftName()', () => {
    it('should generate name for 2 curves', () => {
      const name = generateLoftName(['star', 'circle']);

      expect(name).toBe('loft_2_curves');
    });

    it('should generate name for single curve', () => {
      const name = generateLoftName(['star']);

      expect(name).toBe('star_lofted');
    });

    it('should generate name for empty array', () => {
      const name = generateLoftName([]);

      expect(name).toBe('lofted');
    });

    it('should generate name for many curves', () => {
      const names = Array.from({ length: 10 }, (_, i) => `curve${i}`);
      const name = generateLoftName(names);

      expect(name).toBe('loft_10_curves');
    });
  });
});
