/**
 * Solidify Modifier
 *
 * Adds thickness to a mesh by creating a shell.
 * Creates a duplicate shell offset along normals and stitches them together.
 */

import { QMesh, QVertex, QFace, QHalfEdge } from '../QMesh';
import * as THREE from 'three';

/**
 * Apply solidify modifier to a QMesh
 */
export function applySolidifyModifier(qMesh: QMesh, thickness: number, offset: number = 0): QMesh {
  if (thickness === 0) {
    console.warn('[Solidify] Thickness is 0, returning original mesh');
    return qMesh;
  }

  const newMesh = new QMesh();

  // Step 1: Calculate vertex normals for the original mesh
  const vertexNormals = calculateVertexNormals(qMesh);

  // Step 2: Create mapping of original vertices to new vertices (for both shells)
  const originalVertices = new Map<string, QVertex>(); // Original shell vertices
  const offsetVertices = new Map<string, QVertex>();   // Offset shell vertices

  qMesh.vertices.forEach((vertex, vertexId) => {
    const normal = vertexNormals.get(vertexId) || new THREE.Vector3(0, 1, 0);

    // Original shell (with offset applied)
    const originalPos = vertex.position.clone().addScaledVector(normal, offset);
    const originalVertex = new QVertex(`orig_${vertexId}`, originalPos);
    originalVertices.set(vertexId, originalVertex);
    newMesh.vertices.set(originalVertex.id, originalVertex);

    // Offset shell (original + thickness + offset)
    const offsetPos = vertex.position.clone().addScaledVector(normal, thickness + offset);
    const offsetVertex = new QVertex(`off_${vertexId}`, offsetPos);
    offsetVertices.set(vertexId, offsetVertex);
    newMesh.vertices.set(offsetVertex.id, offsetVertex);
  });

  // Step 3: Create original shell faces (same topology as input)
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

    // Create half-edges for this face
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

  // Step 4: Create offset shell faces (reversed winding for outward normals)
  const offsetFaceMap = new Map<string, QFace>();

  qMesh.faces.forEach((face, faceId) => {
    const vertices = face.getVertices();
    if (vertices.length < 3) return;

    const newFaceId = `f_off_${faceCounter++}`;
    const newFace = new QFace(newFaceId);
    newMesh.faces.set(newFaceId, newFace);
    offsetFaceMap.set(faceId, newFace);

    // Create half-edges with reversed winding
    const halfEdges: QHalfEdge[] = [];
    for (let i = vertices.length - 1; i >= 0; i--) {
      const fromVertex = offsetVertices.get(vertices[i].id)!;
      const toVertex = offsetVertices.get(vertices[(i - 1 + vertices.length) % vertices.length].id)!;

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

  // Step 5: Create rim faces (connecting the two shells at boundaries)
  const boundaryEdges = findBoundaryEdges(qMesh);

  boundaryEdges.forEach(he => {
    const fromVertex = he.getFromVertex();
    if (!fromVertex) return;

    // Get the four vertices for the rim quad:
    // orig1 -> orig2 -> off2 -> off1
    const orig1 = originalVertices.get(fromVertex.id)!;
    const orig2 = originalVertices.get(he.toVertex.id)!;
    const off1 = offsetVertices.get(fromVertex.id)!;
    const off2 = offsetVertices.get(he.toVertex.id)!;

    // Create rim quad face
    const rimFaceId = `f_rim_${faceCounter++}`;
    const rimFace = new QFace(rimFaceId);
    newMesh.faces.set(rimFaceId, rimFace);

    // Create 4 half-edges for the rim quad
    const he1 = new QHalfEdge(`he_${heCounter++}`, orig2);
    const he2 = new QHalfEdge(`he_${heCounter++}`, off2);
    const he3 = new QHalfEdge(`he_${heCounter++}`, off1);
    const he4 = new QHalfEdge(`he_${heCounter++}`, orig1);

    // Link next/prev
    he1.next = he2; he2.prev = he1;
    he2.next = he3; he3.prev = he2;
    he3.next = he4; he4.prev = he3;
    he4.next = he1; he1.prev = he4;

    // Link to face
    he1.face = rimFace;
    he2.face = rimFace;
    he3.face = rimFace;
    he4.face = rimFace;
    rimFace.oneHalfEdge = he1;

    // Add to mesh
    newMesh.halfEdges.set(he1.id, he1);
    newMesh.halfEdges.set(he2.id, he2);
    newMesh.halfEdges.set(he3.id, he3);
    newMesh.halfEdges.set(he4.id, he4);

    // Update vertex outgoing half-edges if not set
    if (!orig1.oneOutgoingHalfEdge) orig1.oneOutgoingHalfEdge = he4;
    if (!orig2.oneOutgoingHalfEdge) orig2.oneOutgoingHalfEdge = he1;
    if (!off1.oneOutgoingHalfEdge) off1.oneOutgoingHalfEdge = he3;
    if (!off2.oneOutgoingHalfEdge) off2.oneOutgoingHalfEdge = he2;
  });

  // Step 6: Link twin edges
  linkTwins(newMesh);

  console.log(`[Solidify] Created ${newMesh.vertices.size} vertices, ${newMesh.faces.size} faces`);

  return newMesh;
}

/**
 * Calculate smooth vertex normals
 */
function calculateVertexNormals(mesh: QMesh): Map<string, THREE.Vector3> {
  const normals = new Map<string, THREE.Vector3>();

  mesh.vertices.forEach((vertex, vertexId) => {
    const normal = new THREE.Vector3();
    const adjacentFaces: QFace[] = [];

    // Find all adjacent faces
    if (vertex.oneOutgoingHalfEdge) {
      let current = vertex.oneOutgoingHalfEdge;
      const startHe = current;

      do {
        if (current.face) {
          adjacentFaces.push(current.face);
        }

        // Move to next outgoing half-edge
        if (current.twin?.next) {
          current = current.twin.next;
        } else {
          break;
        }
      } while (current !== startHe && current);
    }

    // Average face normals
    if (adjacentFaces.length > 0) {
      adjacentFaces.forEach(face => {
        normal.add(face.calculateNormal());
      });
      normal.divideScalar(adjacentFaces.length).normalize();
    } else {
      // Default normal if no faces
      normal.set(0, 1, 0);
    }

    normals.set(vertexId, normal);
  });

  return normals;
}

/**
 * Find boundary edges (edges without a twin)
 */
function findBoundaryEdges(mesh: QMesh): QHalfEdge[] {
  const boundaryEdges: QHalfEdge[] = [];

  mesh.halfEdges.forEach(he => {
    if (!he.twin) {
      boundaryEdges.push(he);
    }
  });

  return boundaryEdges;
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
