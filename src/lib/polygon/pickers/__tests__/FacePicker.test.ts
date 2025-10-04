/**
 * Face Picker Tests
 *
 * Tests for face selection logic.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { pickFace, getFaceCount, getFaceVertices } from '../FacePicker';

describe('FacePicker', () => {
  let geometry: THREE.BufferGeometry;

  beforeEach(() => {
    // Create a simple quad (2 triangles)
    const positions = new Float32Array([
      0, 0, 0,  // v0
      1, 0, 0,  // v1
      1, 1, 0,  // v2
      0, 1, 0,  // v3
    ]);
    const indices = new Uint32Array([
      0, 1, 2,  // Face 0
      0, 2, 3,  // Face 1
    ]);

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
  });

  describe('pickFace', () => {
    test('should pick face by index', () => {
      const result = pickFace(geometry, 0);

      expect(result).not.toBeNull();
      expect(result!.faceIndex).toBe(0);
    });

    test('should return face center', () => {
      const result = pickFace(geometry, 0);

      expect(result).not.toBeNull();
      expect(result!.center).toBeInstanceOf(THREE.Vector3);
      // Center of triangle (0,0,0), (1,0,0), (1,1,0)
      expect(result!.center.x).toBeCloseTo(0.666, 1);
      expect(result!.center.y).toBeCloseTo(0.333, 1);
    });

    test('should return face normal', () => {
      const result = pickFace(geometry, 0);

      expect(result).not.toBeNull();
      expect(result!.normal).toBeInstanceOf(THREE.Vector3);
      // Normal should point in +Z direction
      expect(result!.normal.z).toBeGreaterThan(0.9);
    });

    test('should return vertex indices', () => {
      const result = pickFace(geometry, 0);

      expect(result).not.toBeNull();
      expect(result!.vertices).toEqual([0, 1, 2]);
    });

    test('should return null for undefined face index', () => {
      const result = pickFace(geometry, undefined as any);
      expect(result).toBeNull();
    });

    test('should return null for null face index', () => {
      const result = pickFace(geometry, null as any);
      expect(result).toBeNull();
    });
  });

  describe('getFaceCount', () => {
    test('should return correct face count for indexed geometry', () => {
      const count = getFaceCount(geometry);
      expect(count).toBe(2); // 2 triangles
    });

    test('should return correct face count for non-indexed geometry', () => {
      const nonIndexedGeom = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
        // Second triangle
        1, 0, 0,
        1, 1, 0,
        0, 1, 0,
      ]);
      nonIndexedGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const count = getFaceCount(nonIndexedGeom);
      expect(count).toBe(2);
    });

    test('should handle empty geometry', () => {
      const emptyGeom = new THREE.BufferGeometry();
      emptyGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([]), 3));

      const count = getFaceCount(emptyGeom);
      expect(count).toBe(0);
    });
  });

  describe('getFaceVertices', () => {
    test('should return vertex indices for face', () => {
      const vertices = getFaceVertices(geometry, 0);
      expect(vertices).toEqual([0, 1, 2]);
    });

    test('should return vertices for second face', () => {
      const vertices = getFaceVertices(geometry, 1);
      expect(vertices).toEqual([0, 2, 3]);
    });

    test('should handle non-indexed geometry', () => {
      const nonIndexedGeom = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);
      nonIndexedGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const vertices = getFaceVertices(nonIndexedGeom, 0);
      expect(vertices).toEqual([0, 1, 2]);
    });
  });

  describe('Non-indexed geometry', () => {
    test('should pick face from non-indexed geometry', () => {
      const nonIndexedGeom = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
      ]);
      nonIndexedGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const result = pickFace(nonIndexedGeom, 0);

      expect(result).not.toBeNull();
      expect(result!.faceIndex).toBe(0);
    });

    test('should calculate normal for non-indexed geometry', () => {
      const nonIndexedGeom = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);
      nonIndexedGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const result = pickFace(nonIndexedGeom, 0);

      expect(result).not.toBeNull();
      expect(result!.normal).toBeInstanceOf(THREE.Vector3);
      expect(result!.normal.z).toBeGreaterThan(0.9); // Points in +Z
    });
  });
});
