/**
 * Boolean Operations + QMesh Integration Tests
 *
 * Verifies that boolean operation results can be properly converted to QMesh
 * and used in edit mode operations.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { performUnion, performSubtract, performIntersect } from '../BooleanOperations';
import { QMesh } from '../../qmesh/QMesh';

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

describe('Boolean Operations + QMesh Integration', () => {
  describe('Union + QMesh', () => {
    it('should create valid QMesh from union result', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const result = performUnion(cube1, cube2);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      // Verify QMesh was created
      expect(qmesh.vertices.size).toBeGreaterThan(0);
      expect(qmesh.faces.size).toBeGreaterThan(0);
      expect(qmesh.halfEdges.size).toBeGreaterThan(0);
    });

    it('should create compilable QMesh from union', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const result = performUnion(cube1, cube2);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      // Verify QMesh can be compiled back to BufferGeometry
      const compiled = qmesh.toBufferGeometry();

      expect(compiled.attributes.position.count).toBe(qmesh.vertices.size);
      expect(compiled.index).toBeDefined();
      expect(compiled.index!.count).toBeGreaterThan(0);
    });

    it('should support edit operations on union result', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const result = performUnion(cube1, cube2);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      // Try extruding a face
      const faceIds = Array.from(qmesh.faces.keys());
      if (faceIds.length > 0) {
        const originalFaceCount = qmesh.faces.size;
        const originalVertexCount = qmesh.vertices.size;

        const extrudeResult = qmesh.extrudeFaces([faceIds[0]], 0.5);

        expect(qmesh.faces.size).toBeGreaterThan(originalFaceCount);
        expect(qmesh.vertices.size).toBeGreaterThan(originalVertexCount);
        expect(extrudeResult.newFaceIds.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Subtract + QMesh', () => {
    it('should create valid QMesh from subtract result', () => {
      const cube = createCube(2, [0, 0, 0]);
      const sphere = createSphere(0.8, [0, 0, 0]);

      const result = performSubtract(cube, sphere);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      expect(qmesh.vertices.size).toBeGreaterThan(0);
      expect(qmesh.faces.size).toBeGreaterThan(0);
      expect(qmesh.halfEdges.size).toBeGreaterThan(0);
    });

    it('should preserve topology in QMesh from subtract', () => {
      const cube = createCube(2, [0, 0, 0]);
      const sphere = createSphere(0.8, [0, 0, 0]);

      const result = performSubtract(cube, sphere);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      // Verify all faces have valid vertices
      qmesh.faces.forEach(face => {
        const vertices = face.getVertices();
        expect(vertices.length).toBeGreaterThanOrEqual(3);
      });

      // Verify all half-edges have valid connections
      qmesh.halfEdges.forEach(he => {
        expect(he.toVertex).toBeDefined();
        expect(he.next).toBeDefined();
        expect(he.prev).toBeDefined();
      });
    });

    it('should support operations on subtract result', () => {
      const cube = createCube(2, [0, 0, 0]);
      const sphere = createSphere(0.8, [0, 0, 0]);

      const result = performSubtract(cube, sphere);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      // Get edges and verify they exist
      const edges = qmesh.getEdges();
      expect(edges.length).toBeGreaterThan(0);

      // Verify each edge has valid vertices
      edges.forEach(edge => {
        expect(edge.v1).toBeDefined();
        expect(edge.v2).toBeDefined();
        expect(edge.edgeKey).toBeDefined();
      });
    });
  });

  describe('Intersect + QMesh', () => {
    it('should create valid QMesh from intersect result', () => {
      const cube1 = createCube(2, [0, 0, 0]);
      const cube2 = createCube(2, [1, 0, 0]);

      const result = performIntersect(cube1, cube2);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      expect(qmesh.vertices.size).toBeGreaterThan(0);
      expect(qmesh.faces.size).toBeGreaterThan(0);
      expect(qmesh.halfEdges.size).toBeGreaterThan(0);
    });

    it('should create editable QMesh from intersect', () => {
      const cube = createCube(2, [0, 0, 0]);
      const sphere = createSphere(1, [0, 0, 0]);

      const result = performIntersect(cube, sphere);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      // Try to get face normals
      qmesh.faces.forEach(face => {
        const normal = face.calculateNormal();
        expect(normal).toBeDefined();
        expect(normal.length()).toBeGreaterThan(0);
      });
    });
  });

  describe('Round-trip: Boolean → QMesh → BufferGeometry', () => {
    it('should preserve geometry through round-trip', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const booleanResult = performUnion(cube1, cube2);
      const originalVertexCount = booleanResult.geometry.attributes.position.count;

      const qmesh = QMesh.fromBufferGeometry(booleanResult.geometry as THREE.BufferGeometry);
      const compiled = qmesh.toBufferGeometry();

      // Vertex count should be same or less (due to vertex merging)
      expect(compiled.attributes.position.count).toBeLessThanOrEqual(originalVertexCount);
      expect(compiled.attributes.position.count).toBeGreaterThan(0);

      // Should have valid triangles
      expect(compiled.index).toBeDefined();
      expect(compiled.index!.count).toBeGreaterThan(0);
      expect(compiled.index!.count % 3).toBe(0); // Must be triangles
    });

    it('should maintain manifold topology after round-trip', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const booleanResult = performUnion(cube1, cube2);
      const qmesh = QMesh.fromBufferGeometry(booleanResult.geometry as THREE.BufferGeometry);

      // Check that twin edges are properly linked
      let twinCount = 0;
      qmesh.halfEdges.forEach(he => {
        if (he.twin) twinCount++;
      });

      // Most edges should have twins (internal edges)
      // Boundary edges won't have twins
      expect(twinCount).toBeGreaterThan(0);
    });
  });

  describe('Edit Operations on Boolean Results', () => {
    it('should allow vertex merging on union result', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const result = performUnion(cube1, cube2);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      const vertexIds = Array.from(qmesh.vertices.keys()).slice(0, 2);
      if (vertexIds.length === 2) {
        const originalCount = qmesh.vertices.size;
        qmesh.mergeVertices(vertexIds);

        expect(qmesh.vertices.size).toBe(originalCount - 1);
      }
    });

    it('should allow face operations on boolean result', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const result = performUnion(cube1, cube2);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      // Get all faces
      const faceIds = Array.from(qmesh.faces.keys());
      expect(faceIds.length).toBeGreaterThan(0);

      // Verify each face has valid center and normal
      faceIds.forEach(faceId => {
        const face = qmesh.faces.get(faceId)!;
        const center = face.calculateCenter();
        const normal = face.calculateNormal();

        expect(center).toBeDefined();
        expect(normal).toBeDefined();
        expect(normal.length()).toBeCloseTo(1.0, 5); // Should be normalized
      });
    });

    it('should allow edge operations on boolean result', () => {
      const cube1 = createCube(1, [0, 0, 0]);
      const cube2 = createCube(1, [0.5, 0, 0]);

      const result = performUnion(cube1, cube2);
      const qmesh = QMesh.fromBufferGeometry(result.geometry as THREE.BufferGeometry);

      const edges = qmesh.getEdges();
      expect(edges.length).toBeGreaterThan(0);

      // Try to dissolve an edge
      if (edges.length > 0) {
        const originalFaceCount = qmesh.faces.size;
        const edgeKey = edges[0].edgeKey;

        // Find if this edge has two adjacent faces
        const he = Array.from(qmesh.halfEdges.values()).find(h => h.getEdgeKey() === edgeKey);

        if (he && he.twin && he.face && he.twin.face) {
          qmesh.dissolveEdges([edgeKey]);
          // If dissolution happened, face count should change
          expect(qmesh.faces.size).not.toBe(originalFaceCount);
        }
      }
    });
  });
});
