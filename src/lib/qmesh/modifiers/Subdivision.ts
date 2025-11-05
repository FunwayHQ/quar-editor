/**
 * Subdivision Surface Modifier
 *
 * Implements Catmull-Clark subdivision algorithm on QMesh half-edge structure.
 * This smooths the mesh by subdividing faces and repositioning vertices.
 */

import { QMesh, QVertex, QFace, QHalfEdge } from '../QMesh';
import * as THREE from 'three';

/**
 * Apply Catmull-Clark subdivision to a QMesh
 */
export function applySubdivisionModifier(qMesh: QMesh, levels: number): QMesh {
  let subdividedMesh = qMesh;

  // Run the subdivision algorithm `levels` times
  for (let i = 0; i < levels; i++) {
    subdividedMesh = catmullClarkIteration(subdividedMesh);
    console.log(`[Subdivision] Completed iteration ${i + 1}/${levels}`);
  }

  return subdividedMesh;
}

/**
 * Perform one iteration of Catmull-Clark subdivision
 */
function catmullClarkIteration(inputMesh: QMesh): QMesh {
  const newMesh = new QMesh();

  // Step 1: Calculate Face Points (centroid of each face)
  const facePoints = new Map<string, QVertex>();
  inputMesh.faces.forEach((face, faceId) => {
    const center = face.calculateCenter();
    const vertexId = `fp_${faceId}`;
    const vertex = new QVertex(vertexId, center);
    facePoints.set(faceId, vertex);
    newMesh.vertices.set(vertexId, vertex);
  });

  // Step 2: Calculate Edge Points
  // For each edge, average of: edge endpoints + adjacent face points
  const edgePoints = new Map<string, QVertex>();
  const processedEdges = new Set<string>();

  inputMesh.halfEdges.forEach(he => {
    const edgeKey = he.getEdgeKey();
    if (!edgeKey || processedEdges.has(edgeKey)) return;
    processedEdges.add(edgeKey);

    const fromVertex = he.getFromVertex();
    if (!fromVertex) return;

    // Average of edge endpoints
    const edgeMidpoint = new THREE.Vector3()
      .addScaledVector(fromVertex.position, 0.5)
      .addScaledVector(he.toVertex.position, 0.5);

    // Add adjacent face points
    const adjacentFacePoints: THREE.Vector3[] = [];
    if (he.face) {
      const fp = facePoints.get(he.face.id);
      if (fp) adjacentFacePoints.push(fp.position);
    }
    if (he.twin?.face) {
      const fp = facePoints.get(he.twin.face.id);
      if (fp) adjacentFacePoints.push(fp.position);
    }

    // Edge point = (edge midpoint + average of face points) / 2
    const edgePoint = edgeMidpoint.clone();
    if (adjacentFacePoints.length > 0) {
      const faceAvg = new THREE.Vector3();
      adjacentFacePoints.forEach(fp => faceAvg.add(fp));
      faceAvg.divideScalar(adjacentFacePoints.length);

      edgePoint.add(faceAvg).divideScalar(2);
    }

    const vertexId = `ep_${edgeKey}`;
    const vertex = new QVertex(vertexId, edgePoint);
    edgePoints.set(edgeKey, vertex);
    newMesh.vertices.set(vertexId, vertex);
  });

  // Step 3: Calculate New Vertex Points
  // For each original vertex:
  // newPos = (Q + 2*R + (n-3)*S) / n
  // where Q = average of adjacent face points
  //       R = average of adjacent edge midpoints
  //       S = original vertex position
  //       n = number of adjacent faces (valence)
  const newVertexPoints = new Map<string, QVertex>();

  inputMesh.vertices.forEach((vertex, vertexId) => {
    // Find adjacent faces
    const adjacentFaces: QFace[] = [];
    const adjacentEdges: QHalfEdge[] = [];

    if (vertex.oneOutgoingHalfEdge) {
      let current = vertex.oneOutgoingHalfEdge;
      const startHe = current;

      do {
        if (current.face) {
          adjacentFaces.push(current.face);
        }
        adjacentEdges.push(current);

        // Move to next outgoing half-edge
        if (current.twin?.next) {
          current = current.twin.next;
        } else {
          break;
        }
      } while (current !== startHe && current);
    }

    const n = adjacentFaces.length;
    if (n === 0) {
      // Isolated vertex, keep original position
      const newVertex = new QVertex(`vp_${vertexId}`, vertex.position.clone());
      newVertexPoints.set(vertexId, newVertex);
      newMesh.vertices.set(newVertex.id, newVertex);
      return;
    }

    // Q = average of adjacent face points
    const Q = new THREE.Vector3();
    adjacentFaces.forEach(face => {
      const fp = facePoints.get(face.id);
      if (fp) Q.add(fp.position);
    });
    Q.divideScalar(adjacentFaces.length);

    // R = average of adjacent edge midpoints
    const R = new THREE.Vector3();
    adjacentEdges.forEach(he => {
      const fromVertex = he.getFromVertex();
      if (fromVertex) {
        const midpoint = new THREE.Vector3()
          .addScaledVector(fromVertex.position, 0.5)
          .addScaledVector(he.toVertex.position, 0.5);
        R.add(midpoint);
      }
    });
    R.divideScalar(adjacentEdges.length);

    // S = original position
    const S = vertex.position.clone();

    // newPos = (Q + 2*R + (n-3)*S) / n
    const newPos = new THREE.Vector3()
      .add(Q)
      .addScaledVector(R, 2)
      .addScaledVector(S, n - 3)
      .divideScalar(n);

    const newVertex = new QVertex(`vp_${vertexId}`, newPos);
    newVertexPoints.set(vertexId, newVertex);
    newMesh.vertices.set(newVertex.id, newVertex);
  });

  // Step 4: Build new faces
  // For each original face with N vertices, create N new quad faces
  let faceCounter = 0;
  let heCounter = 0;

  inputMesh.faces.forEach((face, faceId) => {
    const halfEdges = face.getHalfEdges();
    const facePoint = facePoints.get(faceId);
    if (!facePoint) return;

    // For each edge in the face, create a quad
    halfEdges.forEach(he => {
      const edgeKey = he.getEdgeKey();
      const edgePoint = edgePoints.get(edgeKey);
      if (!edgeKey || !edgePoint) return;

      // Get the vertex point for the "from" vertex
      const fromVertex = he.getFromVertex();
      if (!fromVertex) return;

      const vertexPoint = newVertexPoints.get(fromVertex.id);
      if (!vertexPoint) return;

      // Get the previous edge's edge point
      const prevHe = he.prev;
      if (!prevHe) return;

      const prevEdgeKey = prevHe.getEdgeKey();
      const prevEdgePoint = edgePoints.get(prevEdgeKey);
      if (!prevEdgeKey || !prevEdgePoint) return;

      // Create a new quad face: vertexPoint -> edgePoint -> facePoint -> prevEdgePoint
      const newFaceId = `f_${faceCounter++}`;
      const newFace = new QFace(newFaceId);
      newMesh.faces.set(newFaceId, newFace);

      // Create 4 half-edges for the quad
      const he1 = new QHalfEdge(`he_${heCounter++}`, edgePoint);
      const he2 = new QHalfEdge(`he_${heCounter++}`, facePoint);
      const he3 = new QHalfEdge(`he_${heCounter++}`, prevEdgePoint);
      const he4 = new QHalfEdge(`he_${heCounter++}`, vertexPoint);

      // Link next/prev
      he1.next = he2; he2.prev = he1;
      he2.next = he3; he3.prev = he2;
      he3.next = he4; he4.prev = he3;
      he4.next = he1; he1.prev = he4;

      // Link to face
      he1.face = newFace;
      he2.face = newFace;
      he3.face = newFace;
      he4.face = newFace;
      newFace.oneHalfEdge = he1;

      // Add to mesh
      newMesh.halfEdges.set(he1.id, he1);
      newMesh.halfEdges.set(he2.id, he2);
      newMesh.halfEdges.set(he3.id, he3);
      newMesh.halfEdges.set(he4.id, he4);

      // Update vertex outgoing half-edges
      if (!edgePoint.oneOutgoingHalfEdge) edgePoint.oneOutgoingHalfEdge = he1;
      if (!facePoint.oneOutgoingHalfEdge) facePoint.oneOutgoingHalfEdge = he2;
      if (!prevEdgePoint.oneOutgoingHalfEdge) prevEdgePoint.oneOutgoingHalfEdge = he3;
      if (!vertexPoint.oneOutgoingHalfEdge) vertexPoint.oneOutgoingHalfEdge = he4;
    });
  });

  // Step 5: Link twin edges
  linkTwins(newMesh);

  console.log(`[Subdivision] Created ${newMesh.vertices.size} vertices, ${newMesh.faces.size} faces`);

  return newMesh;
}

/**
 * Link twin half-edges by finding matching edges in opposite directions
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
