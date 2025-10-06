/**
 * Insert Face (Inset) Tool
 *
 * Creates a new face inside an existing face with connecting geometry.
 * Sprint Y: Professional modeling tools
 */

import * as THREE from 'three';

export interface InsertFaceResult {
  newGeometry: THREE.BufferGeometry;
  newFaceIndices: number[]; // Indices of newly created faces
}

/**
 * Insert (inset) a face - creates smaller face inside with connecting quads
 *
 * @param geometry - The geometry to modify
 * @param faceIndex - Index of the face to inset
 * @param insetAmount - How much to scale toward center (0.0 - 1.0, default 0.7)
 * @returns Modified geometry with inset face
 */
export function insertFace(
  geometry: THREE.BufferGeometry,
  faceIndex: number,
  insetAmount: number = 0.7
): InsertFaceResult {
  const index = geometry.index;
  const positions = geometry.attributes.position;

  if (!index) {
    throw new Error('Geometry must be indexed for insert face operation');
  }

  if (insetAmount <= 0 || insetAmount >= 1) {
    throw new Error('Inset amount must be between 0 and 1');
  }

  // Get face vertices
  const i = faceIndex * 3;
  const v0 = index.getX(i);
  const v1 = index.getX(i + 1);
  const v2 = index.getX(i + 2);

  const p0 = new THREE.Vector3(positions.getX(v0), positions.getY(v0), positions.getZ(v0));
  const p1 = new THREE.Vector3(positions.getX(v1), positions.getY(v1), positions.getZ(v1));
  const p2 = new THREE.Vector3(positions.getX(v2), positions.getY(v2), positions.getZ(v2));

  // Calculate face center
  const center = new THREE.Vector3()
    .add(p0)
    .add(p1)
    .add(p2)
    .divideScalar(3);

  // Create new vertices (offset toward center by insetAmount)
  const newP0 = p0.clone().lerp(center, 1 - insetAmount);
  const newP1 = p1.clone().lerp(center, 1 - insetAmount);
  const newP2 = p2.clone().lerp(center, 1 - insetAmount);

  // Build new geometry data
  const newPositions: number[] = [];
  const newIndices: number[] = [];

  // Copy existing vertices
  for (let j = 0; j < positions.count; j++) {
    newPositions.push(positions.getX(j), positions.getY(j), positions.getZ(j));
  }

  let nextVertexIndex = positions.count;

  // Add new inner vertices
  newPositions.push(newP0.x, newP0.y, newP0.z);
  const innerV0 = nextVertexIndex++;

  newPositions.push(newP1.x, newP1.y, newP1.z);
  const innerV1 = nextVertexIndex++;

  newPositions.push(newP2.x, newP2.y, newP2.z);
  const innerV2 = nextVertexIndex++;

  const newFaceIndices: number[] = [];

  // Rebuild all faces
  for (let faceIdx = 0; faceIdx < index.count / 3; faceIdx++) {
    const j = faceIdx * 3;
    const fv0 = index.getX(j);
    const fv1 = index.getX(j + 1);
    const fv2 = index.getX(j + 2);

    if (faceIdx === faceIndex) {
      // Replace original face with:
      // 1. Inner triangle
      // 2. Three connecting quads (each split into 2 triangles)

      // Inner triangle
      newIndices.push(innerV0, innerV1, innerV2);
      newFaceIndices.push(newIndices.length / 3 - 1);

      // Connecting quad 1: v0-v1 to innerV0-innerV1 (2 triangles)
      newIndices.push(v0, v1, innerV1);
      newFaceIndices.push(newIndices.length / 3 - 1);
      newIndices.push(v0, innerV1, innerV0);
      newFaceIndices.push(newIndices.length / 3 - 1);

      // Connecting quad 2: v1-v2 to innerV1-innerV2 (2 triangles)
      newIndices.push(v1, v2, innerV2);
      newFaceIndices.push(newIndices.length / 3 - 1);
      newIndices.push(v1, innerV2, innerV1);
      newFaceIndices.push(newIndices.length / 3 - 1);

      // Connecting quad 3: v2-v0 to innerV2-innerV0 (2 triangles)
      newIndices.push(v2, v0, innerV0);
      newFaceIndices.push(newIndices.length / 3 - 1);
      newIndices.push(v2, innerV0, innerV2);
      newFaceIndices.push(newIndices.length / 3 - 1);
    } else {
      // Keep face as-is
      newIndices.push(fv0, fv1, fv2);
    }
  }

  // Create new geometry
  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  newGeometry.setIndex(newIndices);
  newGeometry.computeVertexNormals();
  newGeometry.computeBoundingBox();
  newGeometry.computeBoundingSphere();

  console.log(`[InsertFace] Created inset face. New vertices: ${nextVertexIndex}, New faces: ${newFaceIndices.length}`);

  return {
    newGeometry,
    newFaceIndices,
  };
}
