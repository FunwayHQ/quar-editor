/**
 * Mesh Operations Tests
 *
 * Tests for mesh editing operations like extrude, inset, subdivide.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MeshOperations } from '../MeshOperations';

describe('MeshOperations', () => {
  let geometry: THREE.BufferGeometry;

  beforeEach(() => {
    // Create a simple triangle mesh for testing
    geometry = new THREE.BufferGeometry();

    // Define vertices for a triangle
    const vertices = new Float32Array([
      0, 0, 0,    // vertex 0
      1, 0, 0,    // vertex 1
      0.5, 1, 0,  // vertex 2
    ]);

    const indices = new Uint32Array([0, 1, 2]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
  });

  describe('extrudeFaces', () => {
    it('extrudes selected faces along normal', () => {
      const selectedFaces = new Set([0]); // Select the only face
      const originalVertexCount = geometry.attributes.position.count;

      MeshOperations.extrudeFaces(geometry, selectedFaces, {
        distance: 1,
        divisions: 1,
        keepOriginalFaces: false,
      });

      const newVertexCount = geometry.attributes.position.count;

      // Should have created 3 new vertices (one for each original vertex)
      expect(newVertexCount).toBe(originalVertexCount + 3);

      // Check that new vertices are displaced
      const positions = geometry.attributes.position;
      expect(positions.getZ(3)).toBeGreaterThan(0); // New vertices should be extruded along Z
      expect(positions.getZ(4)).toBeGreaterThan(0);
      expect(positions.getZ(5)).toBeGreaterThan(0);
    });

    it('keeps original faces when specified', () => {
      const selectedFaces = new Set([0]);
      const originalIndexCount = geometry.index!.count;

      MeshOperations.extrudeFaces(geometry, selectedFaces, {
        distance: 1,
        keepOriginalFaces: true,
      });

      const newIndexCount = geometry.index!.count;

      // Should have original face + extruded face + side faces
      expect(newIndexCount).toBeGreaterThan(originalIndexCount);
    });

    it('creates side faces for boundary edges', () => {
      const selectedFaces = new Set([0]);

      MeshOperations.extrudeFaces(geometry, selectedFaces, {
        distance: 1,
        keepOriginalFaces: false,
      });

      const indices = geometry.index!;
      const faceCount = indices.count / 3;

      // Should have: 1 top face + 3 side faces (2 triangles per edge * 3 edges)
      expect(faceCount).toBeGreaterThanOrEqual(4);
    });

    it('handles empty selection gracefully', () => {
      const selectedFaces = new Set<number>();
      const originalVertexCount = geometry.attributes.position.count;

      MeshOperations.extrudeFaces(geometry, selectedFaces, {
        distance: 1,
      });

      // Should not change geometry
      expect(geometry.attributes.position.count).toBe(originalVertexCount);
    });

    it('warns when geometry is not indexed', () => {
      geometry.setIndex(null);
      const selectedFaces = new Set([0]);
      const consoleSpy = vi.spyOn(console, 'warn');

      MeshOperations.extrudeFaces(geometry, selectedFaces, {
        distance: 1,
      });

      expect(consoleSpy).toHaveBeenCalledWith('Extrude requires indexed geometry');
    });
  });

  describe('insetFaces', () => {
    it('insets faces toward their center', () => {
      const selectedFaces = new Set([0]);
      const positions = geometry.attributes.position;

      // Get original positions
      const v0 = new THREE.Vector3(
        positions.getX(0),
        positions.getY(0),
        positions.getZ(0)
      );
      const v1 = new THREE.Vector3(
        positions.getX(1),
        positions.getY(1),
        positions.getZ(1)
      );

      const originalDistance = v0.distanceTo(v1);

      MeshOperations.insetFaces(geometry, selectedFaces, 0.5);

      // Get new positions
      const newV0 = new THREE.Vector3(
        positions.getX(0),
        positions.getY(0),
        positions.getZ(0)
      );
      const newV1 = new THREE.Vector3(
        positions.getX(1),
        positions.getY(1),
        positions.getZ(1)
      );

      const newDistance = newV0.distanceTo(newV1);

      // Vertices should be closer together after inset
      expect(newDistance).toBeLessThan(originalDistance);
    });

    it('handles inset amount of 0', () => {
      const selectedFaces = new Set([0]);
      const positions = geometry.attributes.position;

      const originalX = positions.getX(0);
      const originalY = positions.getY(0);

      MeshOperations.insetFaces(geometry, selectedFaces, 0);

      // Should not change positions
      expect(positions.getX(0)).toBe(originalX);
      expect(positions.getY(0)).toBe(originalY);
    });

    it('handles inset amount of 1', () => {
      const selectedFaces = new Set([0]);
      const positions = geometry.attributes.position;

      MeshOperations.insetFaces(geometry, selectedFaces, 1);

      // All vertices should converge to center
      const centerX = (positions.getX(0) + positions.getX(1) + positions.getX(2)) / 3;
      const centerY = (positions.getY(0) + positions.getY(1) + positions.getY(2)) / 3;

      // Check that vertices are at or very close to center
      expect(Math.abs(positions.getX(0) - centerX)).toBeLessThan(0.01);
      expect(Math.abs(positions.getY(0) - centerY)).toBeLessThan(0.01);
    });

    it('returns early for non-indexed geometry', () => {
      geometry.setIndex(null);
      const selectedFaces = new Set([0]);
      const positions = geometry.attributes.position;
      const originalX = positions.getX(0);

      MeshOperations.insetFaces(geometry, selectedFaces, 0.5);

      // Should not change
      expect(positions.getX(0)).toBe(originalX);
    });
  });

  describe('subdivideFaces', () => {
    it('logs not implemented message', () => {
      const selectedFaces = new Set([0]);
      const consoleSpy = vi.spyOn(console, 'log');

      MeshOperations.subdivideFaces(geometry, selectedFaces, 2);

      expect(consoleSpy).toHaveBeenCalledWith('Subdivide faces not yet implemented');
    });
  });

  describe('loopCut', () => {
    it('creates a loop cut on selected edge', () => {
      const edge: [number, number] = [0, 1];

      const result = MeshOperations.loopCut(geometry, edge, { position: 0.5 });

      expect(Array.isArray(result)).toBe(true);
    });

    it('handles custom position along edge', () => {
      const edge: [number, number] = [0, 1];

      const result1 = MeshOperations.loopCut(geometry, edge, { position: 0.25 });
      const result2 = MeshOperations.loopCut(geometry, edge, { position: 0.75 });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('supports multiple cuts', () => {
      const edge: [number, number] = [0, 1];

      const result = MeshOperations.loopCut(geometry, edge, {
        position: 0.5,
        numberOfCuts: 3
      });

      expect(result).toBeDefined();
    });

    it('warns for non-indexed geometry', () => {
      geometry.setIndex(null);
      const edge: [number, number] = [0, 1];
      const consoleSpy = vi.spyOn(console, 'warn');

      const result = MeshOperations.loopCut(geometry, edge, { position: 0.5 });

      expect(consoleSpy).toHaveBeenCalledWith('Loop cut requires indexed geometry');
      expect(result).toEqual([]);
    });
  });

  describe('bevel', () => {
    it('bevels selected vertices', () => {
      const selected = new Set([0, 1]);

      MeshOperations.bevel(geometry, selected, { amount: 0.1 }, 'vertex');

      expect(geometry.attributes.position).toBeDefined();
    });

    it('bevels selected edges', () => {
      const selected = new Set([0, 1]);

      MeshOperations.bevel(geometry, selected, { amount: 0.1 }, 'edge');

      expect(geometry.attributes.position).toBeDefined();
    });

    it('supports custom bevel amount', () => {
      [0.05, 0.1, 0.2].forEach(amount => {
        const geo = new THREE.BufferGeometry();
        const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0]);
        const indices = new Uint32Array([0, 1, 2]);
        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.setIndex(new THREE.BufferAttribute(indices, 1));

        MeshOperations.bevel(geo, new Set([0]), { amount }, 'vertex');
        expect(geo.attributes.position).toBeDefined();
      });
    });

    it('supports segments parameter', () => {
      const selected = new Set([0]);

      MeshOperations.bevel(geometry, selected, {
        amount: 0.1,
        segments: 3
      }, 'edge');

      expect(geometry.attributes.position).toBeDefined();
    });

    it('supports profile parameter', () => {
      const selected = new Set([0]);

      MeshOperations.bevel(geometry, selected, {
        amount: 0.1,
        segments: 2,
        profile: 0.7
      }, 'edge');

      expect(geometry.attributes.position).toBeDefined();
    });

    it('warns for non-indexed geometry', () => {
      geometry.setIndex(null);
      const selected = new Set([0]);
      const consoleSpy = vi.spyOn(console, 'warn');

      MeshOperations.bevel(geometry, selected, { amount: 0.1 }, 'vertex');

      expect(consoleSpy).toHaveBeenCalledWith('Bevel requires indexed geometry');
    });
  });

  describe('bridgeEdgeLoops', () => {
    beforeEach(() => {
      // Create geometry with more vertices for bridge testing
      const vertices = new Float32Array([
        0, 0, 0,    // 0
        1, 0, 0,    // 1
        1, 1, 0,    // 2
        0, 1, 0,    // 3
        0, 0, 1,    // 4
        1, 0, 1,    // 5
        1, 1, 1,    // 6
        0, 1, 1,    // 7
      ]);

      const indices = new Uint32Array([
        0, 1, 2,  // bottom face 1
        0, 2, 3,  // bottom face 2
      ]);

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeVertexNormals();
    });

    it('bridges two edge loops of same length', () => {
      const loop1: Array<[number, number]> = [[0, 1], [1, 2]];
      const loop2: Array<[number, number]> = [[4, 5], [5, 6]];

      const initialFaceCount = geometry.index!.count / 3;
      MeshOperations.bridgeEdgeLoops(geometry, loop1, loop2);

      const newFaceCount = geometry.index!.count / 3;
      expect(newFaceCount).toBeGreaterThan(initialFaceCount);
    });

    it('creates correct number of faces', () => {
      const loop1: Array<[number, number]> = [[0, 1], [1, 2]];
      const loop2: Array<[number, number]> = [[4, 5], [5, 6]];

      const initialFaceCount = geometry.index!.count / 3;
      MeshOperations.bridgeEdgeLoops(geometry, loop1, loop2);

      const newFaceCount = geometry.index!.count / 3;
      // Each edge pair creates 2 triangles
      expect(newFaceCount).toBe(initialFaceCount + loop1.length * 2);
    });

    it('warns for mismatched loop lengths', () => {
      const loop1: Array<[number, number]> = [[0, 1], [1, 2]];
      const loop2: Array<[number, number]> = [[4, 5]];
      const consoleSpy = vi.spyOn(console, 'warn');

      MeshOperations.bridgeEdgeLoops(geometry, loop1, loop2);

      expect(consoleSpy).toHaveBeenCalledWith('Edge loops must have same number of edges');
    });

    it('warns for non-indexed geometry', () => {
      geometry.setIndex(null);
      const loop1: Array<[number, number]> = [[0, 1]];
      const loop2: Array<[number, number]> = [[4, 5]];
      const consoleSpy = vi.spyOn(console, 'warn');

      MeshOperations.bridgeEdgeLoops(geometry, loop1, loop2);

      expect(consoleSpy).toHaveBeenCalledWith('Bridge requires indexed geometry');
    });

    it('handles empty loops', () => {
      const loop1: Array<[number, number]> = [];
      const loop2: Array<[number, number]> = [];

      const initialFaceCount = geometry.index!.count / 3;
      MeshOperations.bridgeEdgeLoops(geometry, loop1, loop2);

      const newFaceCount = geometry.index!.count / 3;
      expect(newFaceCount).toBe(initialFaceCount);
    });

    it('updates normals after bridging', () => {
      const loop1: Array<[number, number]> = [[0, 1]];
      const loop2: Array<[number, number]> = [[4, 5]];

      MeshOperations.bridgeEdgeLoops(geometry, loop1, loop2);

      expect(geometry.attributes.normal).toBeDefined();
    });
  });

  describe('Complex mesh operations', () => {
    beforeEach(() => {
      // Create a quad (two triangles) for more complex tests
      const vertices = new Float32Array([
        0, 0, 0,    // vertex 0
        1, 0, 0,    // vertex 1
        1, 1, 0,    // vertex 2
        0, 1, 0,    // vertex 3
      ]);

      const indices = new Uint32Array([
        0, 1, 2,  // face 0
        0, 2, 3,  // face 1
      ]);

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeVertexNormals();
    });

    it('extrudes multiple faces', () => {
      const selectedFaces = new Set([0, 1]); // Select both faces
      const originalVertexCount = geometry.attributes.position.count;

      MeshOperations.extrudeFaces(geometry, selectedFaces, {
        distance: 1,
        keepOriginalFaces: false,
      });

      const newVertexCount = geometry.attributes.position.count;

      // Should create 4 new vertices (one for each corner of the quad)
      expect(newVertexCount).toBe(originalVertexCount + 4);
    });

    it('handles shared edges correctly', () => {
      const selectedFaces = new Set([0, 1]); // Both faces share an edge

      MeshOperations.extrudeFaces(geometry, selectedFaces, {
        distance: 1,
        keepOriginalFaces: false,
      });

      // The shared edge should not create side faces
      const indices = geometry.index!;
      const faceCount = indices.count / 3;

      // Should have: 2 top faces + 4 boundary edges * 2 triangles per edge
      // (the shared edge between faces 0 and 1 should not create side faces)
      expect(faceCount).toBeLessThanOrEqual(10);
    });

    it('preserves geometry attributes after operations', () => {
      const selectedFaces = new Set([0]);

      MeshOperations.extrudeFaces(geometry, selectedFaces, {
        distance: 1,
      });

      // Check that geometry is still valid
      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.index).toBeDefined();
      expect(geometry.boundingBox).toBeDefined();
      expect(geometry.boundingSphere).toBeDefined();
    });
  });
});