/**
 * Vertex Picker Tests
 *
 * Tests for vertex selection logic.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { describe, test, expect } from 'vitest';
import * as THREE from 'three';
import { pickVertex, getAllVertices, getVertexPosition } from '../VertexPicker';

describe('VertexPicker', () => {
  let geometry: THREE.BufferGeometry;

  beforeEach(() => {
    // Create a simple triangle geometry
    const positions = new Float32Array([
      0, 0, 0,  // v0
      1, 0, 0,  // v1
      0, 1, 0,  // v2
    ]);
    const indices = new Uint32Array([0, 1, 2]);

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  });

  describe('pickVertex', () => {
    test('should pick closest vertex to intersection point', () => {
      const intersectionPoint = new THREE.Vector3(0.1, 0, 0); // Close to v0
      const result = pickVertex(geometry, intersectionPoint, 0, 0.5);

      expect(result).not.toBeNull();
      expect(result!.vertexIndex).toBe(0);
    });

    test('should return null if no vertex within threshold', () => {
      const intersectionPoint = new THREE.Vector3(5, 5, 5); // Far away
      const result = pickVertex(geometry, intersectionPoint, 0, 0.1);

      expect(result).toBeNull();
    });

    test('should pick vertex with custom threshold', () => {
      const intersectionPoint = new THREE.Vector3(0.3, 0, 0);
      const result = pickVertex(geometry, intersectionPoint, 0, 0.5);

      expect(result).not.toBeNull();
    });

    test('should return closest vertex when multiple within threshold', () => {
      const intersectionPoint = new THREE.Vector3(0.7, 0, 0); // Closer to v1
      const result = pickVertex(geometry, intersectionPoint, 0, 0.5);

      expect(result).not.toBeNull();
      // Should pick v1 (at x=1, closer to 0.7 than v0 at x=0)
      expect(result!.vertexIndex).toBe(1);
    });

    test('should include distance and position in result', () => {
      const intersectionPoint = new THREE.Vector3(0.05, 0, 0);
      const result = pickVertex(geometry, intersectionPoint, 0, 0.5);

      expect(result).not.toBeNull();
      expect(result!.distance).toBeLessThan(0.1);
      expect(result!.position).toBeInstanceOf(THREE.Vector3);
    });
  });

  describe('Non-indexed geometry', () => {
    test('should handle non-indexed geometry', () => {
      const nonIndexedGeom = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);
      nonIndexedGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const intersectionPoint = new THREE.Vector3(0.1, 0, 0);
      const result = pickVertex(nonIndexedGeom, intersectionPoint, 0, 0.5);

      expect(result).not.toBeNull();
      expect(result!.vertexIndex).toBe(0);
    });
  });

  describe('getAllVertices', () => {
    test('should return vertex count', () => {
      const count = getAllVertices(geometry);
      expect(count).toBe(3);
    });

    test('should handle empty geometry', () => {
      const emptyGeom = new THREE.BufferGeometry();
      emptyGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([]), 3));

      const count = getAllVertices(emptyGeom);
      expect(count).toBe(0);
    });
  });

  describe('getVertexPosition', () => {
    test('should return correct vertex position', () => {
      const pos = getVertexPosition(geometry, 1);

      expect(pos.x).toBe(1);
      expect(pos.y).toBe(0);
      expect(pos.z).toBe(0);
    });

    test('should return position for all vertices', () => {
      const v0 = getVertexPosition(geometry, 0);
      const v1 = getVertexPosition(geometry, 1);
      const v2 = getVertexPosition(geometry, 2);

      expect(v0).toEqual(new THREE.Vector3(0, 0, 0));
      expect(v1).toEqual(new THREE.Vector3(1, 0, 0));
      expect(v2).toEqual(new THREE.Vector3(0, 1, 0));
    });
  });
});
