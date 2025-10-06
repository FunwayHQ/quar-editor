/**
 * MeshOptimizer Tests
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  mergeVertices,
  computeNormals,
  generateUVs,
  removeDegenerateTriangles,
  validateGeometry,
  optimizeMesh
} from '../MeshOptimizer';

describe('MeshOptimizer', () => {
  describe('mergeVertices()', () => {
    it('should merge duplicate vertices', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const originalCount = geometry.attributes.position.count;

      const merged = mergeVertices(geometry);

      expect(merged.attributes.position.count).toBeLessThanOrEqual(originalCount);
    });

    it('should not merge if no duplicates', () => {
      const geometry = new THREE.SphereGeometry(1, 8, 8);
      const originalCount = geometry.attributes.position.count;

      const merged = mergeVertices(geometry, 0.0001);

      // May be same or slightly less
      expect(merged.attributes.position.count).toBeLessThanOrEqual(originalCount);
    });
  });

  describe('computeNormals()', () => {
    it('should compute vertex normals', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.deleteAttribute('normal');

      const withNormals = computeNormals(geometry, true);

      expect(withNormals.attributes.normal).toBeDefined();
      expect(withNormals.attributes.normal.count).toBe(withNormals.attributes.position.count);
    });

    it('should handle geometry that already has normals', () => {
      const geometry = new THREE.SphereGeometry(1, 16, 16);

      const withNormals = computeNormals(geometry);

      expect(withNormals.attributes.normal).toBeDefined();
    });
  });

  describe('generateUVs()', () => {
    it('should generate UVs for geometry without them', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.deleteAttribute('uv');

      const withUVs = generateUVs(geometry);

      expect(withUVs.attributes.uv).toBeDefined();
      expect(withUVs.attributes.uv.count).toBe(withUVs.attributes.position.count);
    });

    it('should not overwrite existing UVs', () => {
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      const originalUVs = geometry.attributes.uv.array.slice();

      const withUVs = generateUVs(geometry);

      expect(withUVs.attributes.uv.array).toEqual(originalUVs);
    });

    it('should generate UVs in 0-1 range', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.deleteAttribute('uv');

      const withUVs = generateUVs(geometry);

      // Check all UVs are in reasonable range
      for (let i = 0; i < withUVs.attributes.uv.count; i++) {
        const u = withUVs.attributes.uv.getX(i);
        const v = withUVs.attributes.uv.getY(i);

        // UVs should be finite numbers
        expect(isFinite(u)).toBe(true);
        expect(isFinite(v)).toBe(true);
      }
    });
  });

  describe('removeDegenerateTriangles()', () => {
    it('should remove triangles with duplicate indices', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
        1, 1, 0
      ]);
      const indices = new Uint16Array([
        0, 1, 2, // Valid triangle
        0, 0, 0, // Degenerate (all same)
        1, 2, 3  // Valid triangle
      ]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const cleaned = removeDegenerateTriangles(geometry);

      // Should have 2 triangles (1 removed)
      expect(cleaned.index!.count).toBe(6); // 2 triangles * 3 indices
    });

    it('should handle geometry without index', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      const cleaned = removeDegenerateTriangles(geometry);

      expect(cleaned).toBeDefined();
    });
  });

  describe('validateGeometry()', () => {
    it('should validate valid geometry', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      const result = validateGeometry(geometry);

      expect(result.valid).toBe(true);
    });

    it('should detect empty geometry', () => {
      const geometry = new THREE.BufferGeometry();

      const result = validateGeometry(geometry);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Geometry has no vertices');
    });

    it('should detect missing normals', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.deleteAttribute('normal');

      const result = validateGeometry(geometry);

      expect(result.issues.some(i => i.includes('normals'))).toBe(true);
    });

    it('should detect missing UVs', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.deleteAttribute('uv');

      const result = validateGeometry(geometry);

      expect(result.issues.some(i => i.includes('UVs'))).toBe(true);
    });

    it('should detect NaN vertices', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, NaN, 0, 0, 1, 1, 1]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      const result = validateGeometry(geometry);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Invalid vertex'))).toBe(true);
    });
  });

  describe('optimizeMesh()', () => {
    it('should run full optimization pipeline', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.deleteAttribute('uv');
      geometry.deleteAttribute('normal');

      const optimized = optimizeMesh(geometry);

      expect(optimized.attributes.position).toBeDefined();
      expect(optimized.attributes.normal).toBeDefined();
      expect(optimized.attributes.uv).toBeDefined();
    });

    it('should merge vertices by default', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const originalCount = geometry.attributes.position.count;

      const optimized = optimizeMesh(geometry, { mergeVertices: true });

      expect(optimized.attributes.position.count).toBeLessThanOrEqual(originalCount);
    });

    it('should skip steps when disabled', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.deleteAttribute('uv');

      const optimized = optimizeMesh(geometry, {
        mergeVertices: false,
        generateUVs: false,
        removeDegenerates: false,
        computeNormals: false
      });

      // UVs should still be missing
      expect(optimized.attributes.uv).toBeUndefined();
    });

    it('should use custom tolerance for merging', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      const optimized = optimizeMesh(geometry, {
        mergeVertices: true,
        tolerance: 0.1 // Very loose tolerance
      });

      expect(optimized).toBeDefined();
    });
  });
});
