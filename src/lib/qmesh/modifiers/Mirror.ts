/**
 * Mirror Modifier
 *
 * Mirrors geometry across a specified axis with optional vertex merging at the seam.
 */

import { QMesh, QVertex, QFace, QHalfEdge } from '../QMesh';
import * as THREE from 'three';

/**
 * Apply mirror modifier to a QMesh
 */
export function applyMirrorModifier(
  qMesh: QMesh,
  axis: 'x' | 'y' | 'z',
  mergeThreshold: number = 0.001,
  clip: boolean = false
): QMesh {
  const newMesh = new QMesh();

  // Step 1: Create original vertices (with clipping if enabled)
  const originalVertices = new Map<string, QVertex>();

  qMesh.vertices.forEach((vertex, vertexId) => {
    let pos = vertex.position.clone();

    // If clip is enabled, clamp vertices on the mirror plane
    if (clip) {
      const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      if (pos.getComponent(axisIndex) > -mergeThreshold) {
        pos.setComponent(axisIndex, Math.max(0, pos.getComponent(axisIndex)));
      }
    }

    const newVertex = new QVertex(`orig_${vertexId}`, pos);
    originalVertices.set(vertexId, newVertex);
    newMesh.vertices.set(newVertex.id, newVertex);
  });

  // Step 2: Create mirrored vertices
  const mirroredVertices = new Map<string, QVertex>();

  qMesh.vertices.forEach((vertex, vertexId) => {
    const pos = vertex.position.clone();

    // Mirror the position across the axis
    switch (axis) {
      case 'x':
        pos.x = -pos.x;
        break;
      case 'y':
        pos.y = -pos.y;
        break;
      case 'z':
        pos.z = -pos.z;
        break;
    }

    const newVertex = new QVertex(`mir_${vertexId}`, pos);
    mirroredVertices.set(vertexId, newVertex);
    newMesh.vertices.set(newVertex.id, newVertex);
  });

  // Step 3: Merge vertices at the seam
  const vertexMergeMap = new Map<string, QVertex>(); // Maps mirrored vertex ID to merged vertex

  originalVertices.forEach((originalVertex, originalId) => {
    const mirroredVertex = mirroredVertices.get(originalId);
    if (!mirroredVertex) return;

    // Check if vertices are close enough to merge
    const distance = originalVertex.position.distanceTo(mirroredVertex.position);
    if (distance < mergeThreshold) {
      // Merge to the average position (on the mirror plane)
      const mergedPos = new THREE.Vector3()
        .addVectors(originalVertex.position, mirroredVertex.position)
        .divideScalar(2);

      // Ensure the merged position is exactly on the mirror plane
      const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      mergedPos.setComponent(axisIndex, 0);

      // Update original vertex to merged position
      originalVertex.position.copy(mergedPos);

      // Map mirrored vertex to original (so faces use the same vertex)
      vertexMergeMap.set(mirroredVertex.id, originalVertex);

      // Remove mirrored vertex from mesh
      newMesh.vertices.delete(mirroredVertex.id);
    }
  });

  // Step 4: Create original faces
  let faceCounter = 0;
  let heCounter = 0;

  const originalFaceMap = new Map<string, QFace>();

  qMesh.faces.forEach((face, faceId) => {
    const vertices = face.getVertices();
    if (vertices.length < 3) return;

    const newFaceId = `f_orig_${faceCounter++}`;
    const newFace = new QFace(newFaceId);
    newMesh.faces.set(newFaceId, newFace);
    originalFaceMap.set(faceId, newFace);

    // Create half-edges
    const halfEdges: QHalfEdge[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const fromVertex = originalVertices.get(vertices[i].id)!;
      const toVertex = originalVertices.get(vertices[(i + 1) % vertices.length].id)!;

      const he = new QHalfEdge(`he_${heCounter++}`, toVertex);
      he.face = newFace;
      halfEdges.push(he);
      newMesh.halfEdges.set(he.id, he);

      if (!fromVertex.oneOutgoingHalfEdge) {
        fromVertex.oneOutgoingHalfEdge = he;
      }
    }

    // Link next/prev
    for (let i = 0; i < halfEdges.length; i++) {
      halfEdges[i].next = halfEdges[(i + 1) % halfEdges.length];
      halfEdges[i].prev = halfEdges[(i - 1 + halfEdges.length) % halfEdges.length];
    }

    newFace.oneHalfEdge = halfEdges[0];
  });

  // Step 5: Create mirrored faces (with reversed winding)
  const mirroredFaceMap = new Map<string, QFace>();

  qMesh.faces.forEach((face, faceId) => {
    const vertices = face.getVertices();
    if (vertices.length < 3) return;

    const newFaceId = `f_mir_${faceCounter++}`;
    const newFace = new QFace(newFaceId);
    newMesh.faces.set(newFaceId, newFace);
    mirroredFaceMap.set(faceId, newFace);

    // Create half-edges with reversed winding
    const halfEdges: QHalfEdge[] = [];
    for (let i = vertices.length - 1; i >= 0; i--) {
      // Check if this vertex was merged
      let fromVertex = mirroredVertices.get(vertices[i].id);
      if (vertexMergeMap.has(fromVertex!.id)) {
        fromVertex = vertexMergeMap.get(fromVertex!.id);
      }

      let toVertex = mirroredVertices.get(vertices[(i - 1 + vertices.length) % vertices.length].id);
      if (vertexMergeMap.has(toVertex!.id)) {
        toVertex = vertexMergeMap.get(toVertex!.id);
      }

      if (!fromVertex || !toVertex) continue;

      const he = new QHalfEdge(`he_${heCounter++}`, toVertex);
      he.face = newFace;
      halfEdges.push(he);
      newMesh.halfEdges.set(he.id, he);

      if (!fromVertex.oneOutgoingHalfEdge) {
        fromVertex.oneOutgoingHalfEdge = he;
      }
    }

    // Link next/prev
    for (let i = 0; i < halfEdges.length; i++) {
      halfEdges[i].next = halfEdges[(i + 1) % halfEdges.length];
      halfEdges[i].prev = halfEdges[(i - 1 + halfEdges.length) % halfEdges.length];
    }

    newFace.oneHalfEdge = halfEdges[0];
  });

  // Step 6: Link twin edges
  linkTwins(newMesh);

  console.log(`[Mirror] Created ${newMesh.vertices.size} vertices, ${newMesh.faces.size} faces`);
  console.log(`[Mirror] Merged ${vertexMergeMap.size} vertices at seam`);

  return newMesh;
}

/**
 * Link twin half-edges
 */
function linkTwins(mesh: QMesh): void {
  // Build a map of (fromVertexId, toVertexId) -> HalfEdge
  const edgeMap = new Map<string, QHalfEdge>();

  mesh.halfEdges.forEach(he => {
    const fromVertex = he.getFromVertex();
    if (!fromVertex) return;

    const key = `${fromVertex.id}->${he.toVertex.id}`;
    edgeMap.set(key, he);
  });

  // Find twins
  mesh.halfEdges.forEach(he => {
    if (he.twin) return; // Already linked

    const fromVertex = he.getFromVertex();
    if (!fromVertex) return;

    // Look for the opposite edge
    const oppositeKey = `${he.toVertex.id}->${fromVertex.id}`;
    const twin = edgeMap.get(oppositeKey);

    if (twin) {
      he.twin = twin;
      twin.twin = he;
    }
  });
}
