/**
 * QMesh Monotonic ID Counter Tests
 *
 * Verifies that vertex, face, and half-edge IDs never collide,
 * even after deletions reduce the Map sizes.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { QMesh } from '../QMesh';

function createCubeQMesh(): QMesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  return QMesh.fromBufferGeometry(geometry);
}

describe('QMesh Monotonic ID Counters', () => {
  it('should generate unique vertex IDs via nextVertexId()', () => {
    const qmesh = new QMesh();
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const id = qmesh.nextVertexId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }

    expect(ids.size).toBe(100);
  });

  it('should generate unique face IDs via nextFaceId()', () => {
    const qmesh = new QMesh();
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const id = qmesh.nextFaceId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }

    expect(ids.size).toBe(100);
  });

  it('should generate unique half-edge IDs via nextHalfEdgeId()', () => {
    const qmesh = new QMesh();
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const id = qmesh.nextHalfEdgeId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }

    expect(ids.size).toBe(100);
  });

  it('should not collide IDs after face deletion and re-creation', () => {
    const qmesh = createCubeQMesh();

    // Collect all existing IDs
    const existingFaceIds = new Set(qmesh.faces.keys());
    const existingHeIds = new Set(qmesh.halfEdges.keys());

    // Pick a face to split (this creates new faces with new IDs)
    const [faceId, face] = [...qmesh.faces.entries()][0];
    const verts = face.getVertices();

    // Cut on edges 0 and 2 (non-adjacent)
    const from0 = verts[0].position;
    const to0 = verts[1].position;
    const cutPoint1 = from0.clone().add(to0).multiplyScalar(0.5);

    const from2 = verts[2].position;
    const to2 = verts[3].position;
    const cutPoint2 = from2.clone().add(to2).multiplyScalar(0.5);

    const result = qmesh.splitFace(faceId, cutPoint1, cutPoint2);

    // New face IDs should not collide with any existing face IDs
    for (const newFaceId of result.newFaceIds) {
      expect(existingFaceIds.has(newFaceId)).toBe(false);
    }

    // All half-edge IDs in the mesh should be unique
    const allHeIds = [...qmesh.halfEdges.keys()];
    const uniqueHeIds = new Set(allHeIds);
    expect(uniqueHeIds.size).toBe(allHeIds.length);
  });

  it('should not collide IDs after multiple sequential splits', () => {
    const qmesh = createCubeQMesh();
    const allFaceIdsEver = new Set(qmesh.faces.keys());

    // Do 3 sequential splits on different faces
    for (let splitNum = 0; splitNum < 3; splitNum++) {
      // Find a face that hasn't been split yet (has 4 vertices = quad)
      let targetFaceId: string | null = null;
      for (const [fid, face] of qmesh.faces) {
        const verts = face.getVertices();
        if (verts.length === 4) {
          targetFaceId = fid;
          break;
        }
      }

      if (!targetFaceId) break;

      const face = qmesh.faces.get(targetFaceId)!;
      const verts = face.getVertices();

      const cutPoint1 = verts[0].position.clone().add(verts[1].position).multiplyScalar(0.5);
      const cutPoint2 = verts[2].position.clone().add(verts[3].position).multiplyScalar(0.5);

      const result = qmesh.splitFace(targetFaceId, cutPoint1, cutPoint2);

      // New IDs should never have been seen before
      for (const newFaceId of result.newFaceIds) {
        expect(allFaceIdsEver.has(newFaceId)).toBe(false);
        allFaceIdsEver.add(newFaceId);
      }
    }

    // Verify all face IDs are unique
    const currentFaceIds = [...qmesh.faces.keys()];
    expect(new Set(currentFaceIds).size).toBe(currentFaceIds.length);

    // Verify all half-edge IDs are unique
    const currentHeIds = [...qmesh.halfEdges.keys()];
    expect(new Set(currentHeIds).size).toBe(currentHeIds.length);
  });

  it('fromBufferGeometry should produce unique IDs', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const qmesh = QMesh.fromBufferGeometry(geometry);

    // All vertex IDs unique
    const vertexIds = [...qmesh.vertices.keys()];
    expect(new Set(vertexIds).size).toBe(vertexIds.length);

    // All face IDs unique
    const faceIds = [...qmesh.faces.keys()];
    expect(new Set(faceIds).size).toBe(faceIds.length);

    // All half-edge IDs unique
    const heIds = [...qmesh.halfEdges.keys()];
    expect(new Set(heIds).size).toBe(heIds.length);
  });
});
