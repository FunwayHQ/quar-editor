/**
 * splitFace bug reproduction test
 *
 * Tests the knife tool's QMesh splitFace operation to identify
 * why it reports "degenerate face(s)" on valid cuts.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { QMesh } from '../QMesh';

function createCubeQMesh(): QMesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const qmesh = QMesh.fromBufferGeometry(geometry);
  return qmesh;
}

describe('splitFace - knife tool bug', () => {
  it('should list all faces of cube with their vertices', () => {
    const qmesh = createCubeQMesh();

    console.log(`Cube: ${qmesh.vertices.size} vertices, ${qmesh.faces.size} faces`);

    qmesh.faces.forEach((face, faceId) => {
      const verts = face.getVertices();
      const vertInfo = verts.map((v, i) =>
        `${v.id}(${v.position.x.toFixed(2)},${v.position.y.toFixed(2)},${v.position.z.toFixed(2)})`
      ).join(' → ');
      console.log(`  ${faceId} [${verts.length} verts]: ${vertInfo}`);
    });

    expect(qmesh.faces.size).toBe(6);
  });

  it('should split a face with cut points on non-adjacent edges', () => {
    const qmesh = createCubeQMesh();

    // Find the front face (z = 0.5)
    let frontFaceId: string | null = null;
    qmesh.faces.forEach((face, faceId) => {
      const verts = face.getVertices();
      const allZ05 = verts.every(v => Math.abs(v.position.z - 0.5) < 0.01);
      if (allZ05) {
        frontFaceId = faceId;
        console.log(`Front face: ${faceId}`);
        const vertInfo = verts.map(v =>
          `${v.id}(${v.position.x.toFixed(2)},${v.position.y.toFixed(2)},${v.position.z.toFixed(2)})`
        ).join(' → ');
        console.log(`  Vertices: ${vertInfo}`);

        // List edges
        const halfEdges = face.getHalfEdges();
        halfEdges.forEach((he, i) => {
          const fromV = verts[i];
          const toV = verts[(i + 1) % verts.length];
          console.log(`  Edge ${i}: ${fromV.id} → ${toV.id} (he: ${he.id}, twin: ${he.twin?.id || 'none'})`);
        });
      }
    });

    expect(frontFaceId).not.toBeNull();

    // Get front face vertices
    const face = qmesh.faces.get(frontFaceId!)!;
    const verts = face.getVertices();

    // Place cut point 1 on the LEFT edge (midpoint)
    // Place cut point 2 on the RIGHT edge (midpoint)
    // We need to identify which edges are left and right
    const halfEdges = face.getHalfEdges();

    // Find edges with constant x (vertical edges = left and right)
    const edgeInfo: { index: number; from: THREE.Vector3; to: THREE.Vector3; midpoint: THREE.Vector3 }[] = [];
    for (let i = 0; i < verts.length; i++) {
      const from = verts[i].position;
      const to = verts[(i + 1) % verts.length].position;
      const mid = from.clone().add(to).multiplyScalar(0.5);
      edgeInfo.push({ index: i, from, to, midpoint: mid });
      console.log(`  Edge ${i}: (${from.x.toFixed(2)},${from.y.toFixed(2)},${from.z.toFixed(2)}) → (${to.x.toFixed(2)},${to.y.toFixed(2)},${to.z.toFixed(2)}) mid=(${mid.x.toFixed(2)},${mid.y.toFixed(2)},${mid.z.toFixed(2)})`);
    }

    // Pick two non-adjacent edges for the cut
    // For a quad, edges 0 and 2 are always non-adjacent
    const cutPoint1 = edgeInfo[0].midpoint.clone();
    const cutPoint2 = edgeInfo[2].midpoint.clone();

    console.log(`\nCut point 1 (edge 0 midpoint): (${cutPoint1.x.toFixed(3)}, ${cutPoint1.y.toFixed(3)}, ${cutPoint1.z.toFixed(3)})`);
    console.log(`Cut point 2 (edge 2 midpoint): (${cutPoint2.x.toFixed(3)}, ${cutPoint2.y.toFixed(3)}, ${cutPoint2.z.toFixed(3)})`);

    const result = qmesh.splitFace(frontFaceId!, cutPoint1, cutPoint2);

    console.log(`\nResult: ${result.newFaceIds.length} new faces: ${result.newFaceIds.join(', ')}`);

    expect(result.newFaceIds.length).toBe(2);
  });

  it('should split a face with cut points on adjacent edges', () => {
    const qmesh = createCubeQMesh();

    // Find any face
    const [faceId, face] = [...qmesh.faces.entries()][0];
    const verts = face.getVertices();

    console.log(`Face ${faceId}: ${verts.length} vertices`);
    verts.forEach((v, i) => {
      console.log(`  v${i}: ${v.id} (${v.position.x.toFixed(2)},${v.position.y.toFixed(2)},${v.position.z.toFixed(2)})`);
    });

    // Cut on edge 0 and edge 1 (adjacent edges)
    const from0 = verts[0].position;
    const to0 = verts[1].position;
    const cutPoint1 = from0.clone().add(to0).multiplyScalar(0.5);

    const from1 = verts[1].position;
    const to1 = verts[2].position;
    const cutPoint2 = from1.clone().add(to1).multiplyScalar(0.5);

    console.log(`Cut point 1 (edge 0 midpoint): (${cutPoint1.x.toFixed(3)}, ${cutPoint1.y.toFixed(3)}, ${cutPoint1.z.toFixed(3)})`);
    console.log(`Cut point 2 (edge 1 midpoint): (${cutPoint2.x.toFixed(3)}, ${cutPoint2.y.toFixed(3)}, ${cutPoint2.z.toFixed(3)})`);

    const result = qmesh.splitFace(faceId, cutPoint1, cutPoint2);

    console.log(`Result: ${result.newFaceIds.length} new faces: ${result.newFaceIds.join(', ')}`);

    // Adjacent edge cut should produce a triangle + pentagon
    expect(result.newFaceIds.length).toBe(2);
  });

  it('should split a face with cut points near but not on vertices', () => {
    const qmesh = createCubeQMesh();

    const [faceId, face] = [...qmesh.faces.entries()][0];
    const verts = face.getVertices();

    console.log(`Face ${faceId}: ${verts.length} vertices`);

    // Place cut points very close to edge midpoints (simulating imprecise mouse clicks)
    const from0 = verts[0].position;
    const to0 = verts[1].position;
    // Place at 30% of edge 0
    const cutPoint1 = from0.clone().lerp(to0, 0.3);

    const from2 = verts[2].position;
    const to2 = verts[3].position;
    // Place at 70% of edge 2
    const cutPoint2 = from2.clone().lerp(to2, 0.7);

    console.log(`Cut point 1 (edge 0 @ 30%): (${cutPoint1.x.toFixed(3)}, ${cutPoint1.y.toFixed(3)}, ${cutPoint1.z.toFixed(3)})`);
    console.log(`Cut point 2 (edge 2 @ 70%): (${cutPoint2.x.toFixed(3)}, ${cutPoint2.y.toFixed(3)}, ${cutPoint2.z.toFixed(3)})`);

    const result = qmesh.splitFace(faceId, cutPoint1, cutPoint2);

    console.log(`Result: ${result.newFaceIds.length} new faces: ${result.newFaceIds.join(', ')}`);

    expect(result.newFaceIds.length).toBe(2);
  });

  it('should split with points slightly off the edge (within tolerance)', () => {
    const qmesh = createCubeQMesh();

    const [faceId, face] = [...qmesh.faces.entries()][0];
    const verts = face.getVertices();

    // Place cut points slightly off-edge (within 0.05 tolerance)
    const from0 = verts[0].position;
    const to0 = verts[1].position;
    const mid0 = from0.clone().add(to0).multiplyScalar(0.5);
    // Offset slightly perpendicular to edge
    const cutPoint1 = mid0.clone();
    cutPoint1.x += 0.03; // Slight offset

    const from2 = verts[2].position;
    const to2 = verts[3].position;
    const mid2 = from2.clone().add(to2).multiplyScalar(0.5);
    const cutPoint2 = mid2.clone();
    cutPoint2.x += 0.03; // Slight offset

    console.log(`Cut point 1 (edge 0 mid + offset): (${cutPoint1.x.toFixed(3)}, ${cutPoint1.y.toFixed(3)}, ${cutPoint1.z.toFixed(3)})`);
    console.log(`Cut point 2 (edge 2 mid + offset): (${cutPoint2.x.toFixed(3)}, ${cutPoint2.y.toFixed(3)}, ${cutPoint2.z.toFixed(3)})`);

    const result = qmesh.splitFace(faceId, cutPoint1, cutPoint2);

    console.log(`Result: ${result.newFaceIds.length} new faces: ${result.newFaceIds.join(', ')}`);

    expect(result.newFaceIds.length).toBe(2);
  });

  it('should handle cut point near a vertex (snaps to vertex)', () => {
    const qmesh = createCubeQMesh();

    const [faceId, face] = [...qmesh.faces.entries()][0];
    const verts = face.getVertices();

    // Place cut1 very close to vertex 0 (should snap to it)
    const cutPoint1 = verts[0].position.clone();
    cutPoint1.x += 0.02;
    cutPoint1.y += 0.02;

    // Place cut2 on edge 2 midpoint
    const from2 = verts[2].position;
    const to2 = verts[3].position;
    const cutPoint2 = from2.clone().add(to2).multiplyScalar(0.5);

    console.log(`Cut point 1 (near vertex 0): (${cutPoint1.x.toFixed(3)}, ${cutPoint1.y.toFixed(3)}, ${cutPoint1.z.toFixed(3)})`);
    console.log(`Cut point 2 (edge 2 midpoint): (${cutPoint2.x.toFixed(3)}, ${cutPoint2.y.toFixed(3)}, ${cutPoint2.z.toFixed(3)})`);

    const result = qmesh.splitFace(faceId, cutPoint1, cutPoint2);

    console.log(`Result: ${result.newFaceIds.length} new faces: ${result.newFaceIds.join(', ')}`);

    // Vertex-to-edge cut should produce 2 faces (triangle + larger polygon)
    expect(result.newFaceIds.length).toBe(2);
  });

  it('should handle both cut points near same vertex (should fail gracefully)', () => {
    const qmesh = createCubeQMesh();

    const [faceId, face] = [...qmesh.faces.entries()][0];
    const verts = face.getVertices();

    // Both cut points near vertex 0 — should either snap to same edge or fail
    const cutPoint1 = verts[0].position.clone();
    cutPoint1.x += 0.01;
    const cutPoint2 = verts[0].position.clone();
    cutPoint2.y += 0.01;

    console.log(`Cut point 1 (near vertex 0): (${cutPoint1.x.toFixed(3)}, ${cutPoint1.y.toFixed(3)}, ${cutPoint1.z.toFixed(3)})`);
    console.log(`Cut point 2 (near vertex 0): (${cutPoint2.x.toFixed(3)}, ${cutPoint2.y.toFixed(3)}, ${cutPoint2.z.toFixed(3)})`);

    const result = qmesh.splitFace(faceId, cutPoint1, cutPoint2);

    console.log(`Result: ${result.newFaceIds.length} new faces: ${result.newFaceIds.join(', ')}`);

    // Should either succeed with 2 faces or fail with 0 (not crash)
    expect(result.newFaceIds.length === 0 || result.newFaceIds.length === 2).toBe(true);
  });
});
