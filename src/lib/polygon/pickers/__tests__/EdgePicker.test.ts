/**
 * Edge Picker Tests
 *
 * Tests for edge selection logic.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { pickEdge, getAllEdges, createEdgesMesh } from '../EdgePicker';

describe('EdgePicker', () => {
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
      0, 1, 2,  // Triangle 1
      0, 2, 3,  // Triangle 2
    ]);

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  });

  describe('pickEdge', () => {
    test('should pick edge close to intersection point', () => {
      const intersectionPoint = new THREE.Vector3(0.5, 0, 0); // Middle of edge 0-1
      const result = pickEdge(geometry, intersectionPoint, 0.1);

      expect(result).not.toBeNull();
      expect(result!.edgeKey).toBe('0-1');
    });

    test('should return null if no edge within threshold', () => {
      const intersectionPoint = new THREE.Vector3(5, 5, 5); // Far away
      const result = pickEdge(geometry, intersectionPoint, 0.05);

      expect(result).toBeNull();
    });

    test('should return edge with midpoint', () => {
      const intersectionPoint = new THREE.Vector3(0.5, 0, 0);
      const result = pickEdge(geometry, intersectionPoint, 0.1);

      expect(result).not.toBeNull();
      expect(result!.midpoint).toBeInstanceOf(THREE.Vector3);
      expect(result!.midpoint.x).toBeCloseTo(0.5);
      expect(result!.midpoint.y).toBeCloseTo(0);
    });

    test('should use custom threshold', () => {
      const intersectionPoint = new THREE.Vector3(0.5, 0.2, 0); // Slightly off edge
      const resultSmall = pickEdge(geometry, intersectionPoint, 0.1);
      const resultLarge = pickEdge(geometry, intersectionPoint, 0.3);

      expect(resultSmall).toBeNull();
      expect(resultLarge).not.toBeNull();
    });
  });

  describe('getAllEdges', () => {
    test('should extract all unique edges', () => {
      const edges = getAllEdges(geometry);

      // Quad has 5 unique edges (4 outer + 1 diagonal)
      expect(edges.length).toBe(5);
    });

    test('should not duplicate edges', () => {
      const edges = getAllEdges(geometry);
      const uniqueEdges = new Set(edges);

      expect(edges.length).toBe(uniqueEdges.size);
    });

    test('should create normalized edge keys', () => {
      const edges = getAllEdges(geometry);

      // All edges should be in format "smaller-larger"
      for (const edge of edges) {
        const [v1, v2] = edge.split('-').map(Number);
        expect(v1).toBeLessThanOrEqual(v2);
      }
    });
  });

  describe('createEdgesMesh', () => {
    test('should create LineSegments for edges', () => {
      const edgesMesh = createEdgesMesh(geometry);

      expect(edgesMesh).toBeInstanceOf(THREE.LineSegments);
      expect(edgesMesh.material).toBeInstanceOf(THREE.LineBasicMaterial);
    });

    test('should create invisible edges for picking', () => {
      const edgesMesh = createEdgesMesh(geometry);
      const material = edgesMesh.material as THREE.LineBasicMaterial;

      expect(material.opacity).toBe(0);
      expect(material.transparent).toBe(true);
    });
  });

  describe('Non-indexed geometry', () => {
    test('should handle non-indexed geometry', () => {
      const nonIndexedGeom = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
      ]);
      nonIndexedGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const intersectionPoint = new THREE.Vector3(0.5, 0, 0);
      const result = pickEdge(nonIndexedGeom, intersectionPoint, 0.1);

      expect(result).not.toBeNull();
    });

    test('should get all edges from non-indexed geometry', () => {
      const nonIndexedGeom = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
      ]);
      nonIndexedGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const edges = getAllEdges(nonIndexedGeom);
      expect(edges.length).toBe(3); // Triangle has 3 edges
    });
  });
});
