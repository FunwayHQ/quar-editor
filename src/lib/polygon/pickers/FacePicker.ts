/**
 * Face Picker
 *
 * Face selection using standard Three.js raycasting.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import * as THREE from 'three';

export interface FacePickResult {
  faceIndex: number;
  normal: THREE.Vector3;
  center: THREE.Vector3;
  vertices: [number, number, number];
}

/**
 * Pick face from raycaster intersection
 */
export function pickFace(
  geometry: THREE.BufferGeometry,
  faceIndex: number
): FacePickResult | null {
  if (faceIndex === undefined || faceIndex === null) {
    return null;
  }

  const indices = geometry.index?.array;
  const positions = geometry.attributes.position.array;
  const normals = geometry.attributes.normal?.array;

  if (!indices) {
    return pickFaceNonIndexed(geometry, faceIndex);
  }

  // Get vertex indices for this face
  const v1Idx = indices[faceIndex * 3];
  const v2Idx = indices[faceIndex * 3 + 1];
  const v3Idx = indices[faceIndex * 3 + 2];

  // Get vertex positions
  const v1 = new THREE.Vector3(
    positions[v1Idx * 3],
    positions[v1Idx * 3 + 1],
    positions[v1Idx * 3 + 2]
  );
  const v2 = new THREE.Vector3(
    positions[v2Idx * 3],
    positions[v2Idx * 3 + 1],
    positions[v2Idx * 3 + 2]
  );
  const v3 = new THREE.Vector3(
    positions[v3Idx * 3],
    positions[v3Idx * 3 + 1],
    positions[v3Idx * 3 + 2]
  );

  // Calculate face center
  const center = v1.clone().add(v2).add(v3).multiplyScalar(1 / 3);

  // Calculate face normal (or use existing normals)
  let normal: THREE.Vector3;
  if (normals) {
    normal = new THREE.Vector3(
      (normals[v1Idx * 3] + normals[v2Idx * 3] + normals[v3Idx * 3]) / 3,
      (normals[v1Idx * 3 + 1] + normals[v2Idx * 3 + 1] + normals[v3Idx * 3 + 1]) / 3,
      (normals[v1Idx * 3 + 2] + normals[v2Idx * 3 + 2] + normals[v3Idx * 3 + 2]) / 3
    ).normalize();
  } else {
    // Calculate from triangle
    const edge1 = v2.clone().sub(v1);
    const edge2 = v3.clone().sub(v1);
    normal = edge1.cross(edge2).normalize();
  }

  return {
    faceIndex,
    normal,
    center,
    vertices: [v1Idx, v2Idx, v3Idx],
  };
}

/**
 * Pick face from non-indexed geometry
 */
function pickFaceNonIndexed(
  geometry: THREE.BufferGeometry,
  faceIndex: number
): FacePickResult | null {
  const positions = geometry.attributes.position.array;

  // For non-indexed geometry, vertices are in groups of 3 per face
  const v1Idx = faceIndex * 3;
  const v2Idx = faceIndex * 3 + 1;
  const v3Idx = faceIndex * 3 + 2;

  const v1 = new THREE.Vector3(
    positions[v1Idx * 3],
    positions[v1Idx * 3 + 1],
    positions[v1Idx * 3 + 2]
  );
  const v2 = new THREE.Vector3(
    positions[v2Idx * 3],
    positions[v2Idx * 3 + 1],
    positions[v2Idx * 3 + 2]
  );
  const v3 = new THREE.Vector3(
    positions[v3Idx * 3],
    positions[v3Idx * 3 + 1],
    positions[v3Idx * 3 + 2]
  );

  const center = v1.clone().add(v2).add(v3).multiplyScalar(1 / 3);

  // Calculate normal
  const edge1 = v2.clone().sub(v1);
  const edge2 = v3.clone().sub(v1);
  const normal = edge1.cross(edge2).normalize();

  return {
    faceIndex,
    normal,
    center,
    vertices: [v1Idx, v2Idx, v3Idx],
  };
}

/**
 * Get total face count from geometry
 */
export function getFaceCount(geometry: THREE.BufferGeometry): number {
  if (geometry.index) {
    return geometry.index.count / 3;
  } else {
    return geometry.attributes.position.count / 3;
  }
}

/**
 * Get vertices for a specific face
 */
export function getFaceVertices(
  geometry: THREE.BufferGeometry,
  faceIndex: number
): [number, number, number] {
  const indices = geometry.index?.array;

  if (indices) {
    return [
      indices[faceIndex * 3],
      indices[faceIndex * 3 + 1],
      indices[faceIndex * 3 + 2],
    ];
  } else {
    // Non-indexed
    return [faceIndex * 3, faceIndex * 3 + 1, faceIndex * 3 + 2];
  }
}
