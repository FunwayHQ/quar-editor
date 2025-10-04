/**
 * Vertex Picker
 *
 * Proximity-based vertex selection for polygon editing.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import * as THREE from 'three';

export interface VertexPickResult {
  vertexIndex: number;
  distance: number;
  position: THREE.Vector3;
}

/**
 * Pick the closest vertex to an intersection point
 */
export function pickVertex(
  geometry: THREE.BufferGeometry,
  intersectionPoint: THREE.Vector3,
  faceIndex: number,
  threshold: number = 0.1
): VertexPickResult | null {
  const indices = geometry.index?.array;
  const positions = geometry.attributes.position.array;

  if (!indices) {
    // Non-indexed geometry
    return pickVertexNonIndexed(geometry, intersectionPoint, faceIndex, threshold);
  }

  // Get vertices of the hit face
  const v1Idx = indices[faceIndex * 3];
  const v2Idx = indices[faceIndex * 3 + 1];
  const v3Idx = indices[faceIndex * 3 + 2];

  // Find closest vertex to intersection point
  const vertices = [v1Idx, v2Idx, v3Idx];
  let closestVertex: VertexPickResult | null = null;
  let minDistance = threshold;

  for (const vIdx of vertices) {
    const v = new THREE.Vector3(
      positions[vIdx * 3],
      positions[vIdx * 3 + 1],
      positions[vIdx * 3 + 2]
    );

    const distance = v.distanceTo(intersectionPoint);
    if (distance < minDistance) {
      minDistance = distance;
      closestVertex = {
        vertexIndex: vIdx,
        distance,
        position: v,
      };
    }
  }

  return closestVertex;
}

/**
 * Pick vertex from non-indexed geometry
 */
function pickVertexNonIndexed(
  geometry: THREE.BufferGeometry,
  intersectionPoint: THREE.Vector3,
  faceIndex: number,
  threshold: number
): VertexPickResult | null {
  const positions = geometry.attributes.position.array;

  // For non-indexed geometry, vertices are in groups of 3 per face
  const v1Idx = faceIndex * 3;
  const v2Idx = faceIndex * 3 + 1;
  const v3Idx = faceIndex * 3 + 2;

  const vertices = [v1Idx, v2Idx, v3Idx];
  let closestVertex: VertexPickResult | null = null;
  let minDistance = threshold;

  for (const vIdx of vertices) {
    const v = new THREE.Vector3(
      positions[vIdx * 3],
      positions[vIdx * 3 + 1],
      positions[vIdx * 3 + 2]
    );

    const distance = v.distanceTo(intersectionPoint);
    if (distance < minDistance) {
      minDistance = distance;
      closestVertex = {
        vertexIndex: vIdx,
        distance,
        position: v,
      };
    }
  }

  return closestVertex;
}

/**
 * Get all unique vertices from geometry
 */
export function getAllVertices(geometry: THREE.BufferGeometry): number {
  const positions = geometry.attributes.position;
  return positions.count;
}

/**
 * Get vertex position
 */
export function getVertexPosition(
  geometry: THREE.BufferGeometry,
  vertexIndex: number
): THREE.Vector3 {
  const positions = geometry.attributes.position.array;
  return new THREE.Vector3(
    positions[vertexIndex * 3],
    positions[vertexIndex * 3 + 1],
    positions[vertexIndex * 3 + 2]
  );
}
