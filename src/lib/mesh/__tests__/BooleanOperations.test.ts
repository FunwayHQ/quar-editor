/**
 * BooleanOperations Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  performUnion,
  performSubtract,
  performIntersect,
  generateBooleanName,
  validateMeshForBoolean
} from '../BooleanOperations';

// Helper to create test meshes
function createCube(size: number = 1, position: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({ color: 0x7C3AED });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.updateMatrix();
  mesh.updateMatrixWorld();
  return mesh;
}

function createSphere(radius: number = 0.5, position: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0xFF6600 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.updateMatrix();
  mesh.updateMatrixWorld();
  return mesh;
}

describe('BooleanOperations', () => {
  describe('performUnion()', () => {
    it('should combine two overlapping cubes', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const result = performUnion(cube1, cube2);

      // Check it's a mesh-like object (instanceof fails due to Three.js version mismatch)
      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
      expect(result.geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it('should combine cube and sphere', () => {
      const cube = createCube(1, [0, 0, 0]);
      const sphere = createSphere(0.6, [0, 0, 0]);

      const result = performUnion(cube, sphere);

      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
      expect(result.geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it('should combine non-overlapping meshes', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [3, 0, 0]); // Far apart

      const result = performUnion(cube1, cube2);

      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
    });

    it('should compute vertex normals', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const result = performUnion(cube1, cube2);
      const geometry = result.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.normal).toBeDefined();
      expect(geometry.attributes.normal.count).toBeGreaterThan(0);
    });

    it('should handle identical meshes', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0, 0, 0]); // Same position

      const result = performUnion(cube1, cube2);

      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
    });
  });

  describe('performSubtract()', () => {
    it('should subtract sphere from cube', () => {
      const cube = createCube(2, [0, 0, 0]);
      const sphere = createSphere(0.8, [0, 0, 0]);

      const result = performSubtract(cube, sphere);

      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
      expect(result.geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it('should subtract overlapping cube', () => {
      const cube1 = createCube(2, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const result = performSubtract(cube1, cube2);

      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
    });

    it('should handle non-overlapping meshes', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [5, 0, 0]); // No overlap

      const result = performSubtract(cube1, cube2);

      // Should return cube1 unchanged
      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
    });

    it('should subtract larger mesh from smaller mesh', () => {
      const small = createCube(0.5, [0, 0, 0]);
      const large = createCube(2, [0, 0, 0]);

      const result = performSubtract(small, large);

      // Result may be empty or very small
      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
    });

    it('should compute vertex normals', () => {
      const cube = createCube(2, [0, 0, 0]);
      const sphere = createSphere(0.8, [0, 0, 0]);

      const result = performSubtract(cube, sphere);
      const geometry = result.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.normal).toBeDefined();
    });
  });

  describe('performIntersect()', () => {
    it('should create intersection of overlapping cubes', () => {
      const cube1 = createCube(2, [0, 0, 0]);
      const cube2 = createCube(2, [1, 0, 0]); // Partial overlap

      const result = performIntersect(cube1, cube2);

      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
      expect(result.geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it('should create intersection of cube and sphere', () => {
      const cube = createCube(2, [0, 0, 0]);
      const sphere = createSphere(1, [0, 0, 0]);

      const result = performIntersect(cube, sphere);

      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
      expect(result.geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it('should throw error for non-overlapping meshes', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [5, 0, 0]); // No overlap

      expect(() => performIntersect(cube1, cube2)).toThrow('No intersection found');
    });

    it('should handle fully contained meshes', () => {
      const large = createCube(3, [0, 0, 0]);
      const small = createCube(1, [0, 0, 0]); // Inside large

      const result = performIntersect(large, small);

      expect(result).toBeDefined();
      expect(result.geometry).toBeDefined();
    });

    it('should compute vertex normals', () => {
      const cube1 = createCube(2, [0, 0, 0]);
      const cube2 = createCube(2, [1, 0, 0]);

      const result = performIntersect(cube1, cube2);
      const geometry = result.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.normal).toBeDefined();
    });
  });

  describe('generateBooleanName()', () => {
    it('should generate union name', () => {
      const name = generateBooleanName('union', 'Cube', 'Sphere');
      expect(name).toBe('Cube_union_Sphere');
    });

    it('should generate subtract name', () => {
      const name = generateBooleanName('subtract', 'Cube', 'Sphere');
      expect(name).toBe('Cube_minus_Sphere');
    });

    it('should generate intersect name', () => {
      const name = generateBooleanName('intersect', 'Cube', 'Sphere');
      expect(name).toBe('Cube_intersect_Sphere');
    });

    it('should handle empty names', () => {
      const name = generateBooleanName('union', '', '');
      expect(name).toBe('_union_');
    });
  });

  describe('validateMeshForBoolean()', () => {
    it('should validate valid mesh', () => {
      const cube = createCube();
      const result = validateMeshForBoolean(cube);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject mesh without geometry', () => {
      const mesh = new THREE.Mesh();
      mesh.geometry = null as any;

      const result = validateMeshForBoolean(mesh);

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should reject mesh with empty geometry', () => {
      const mesh = new THREE.Mesh();
      mesh.geometry = new THREE.BufferGeometry();

      const result = validateMeshForBoolean(mesh);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('no vertices');
    });

    it('should accept sphere geometry', () => {
      const sphere = createSphere();
      const result = validateMeshForBoolean(sphere);

      expect(result.valid).toBe(true);
    });
  });
});
