/**
 * Quad Detection Utilities
 *
 * Detect when two triangles form a quad and should be selected together.
 * Sprint Y: Professional UX - Auto-select quads in face mode
 */

import * as THREE from 'three';

/**
 * Find the paired triangle that forms a quad with the given triangle
 * Returns the paired face index, or null if no quad pair found
 */
export function findQuadPair(
  faceIndex: number,
  geometry: THREE.BufferGeometry
): number | null {
  const index = geometry.index;
  if (!index) return null;

  // Get vertices of the clicked triangle
  const i = faceIndex * 3;
  const v0 = index.getX(i);
  const v1 = index.getX(i + 1);
  const v2 = index.getX(i + 2);
  const clickedFaceVertices = new Set([v0, v1, v2]);

  // Search all other triangles for one that shares exactly 2 vertices
  for (let otherFaceIdx = 0; otherFaceIdx < index.count / 3; otherFaceIdx++) {
    if (otherFaceIdx === faceIndex) continue; // Skip self

    const j = otherFaceIdx * 3;
    const ov0 = index.getX(j);
    const ov1 = index.getX(j + 1);
    const ov2 = index.getX(j + 2);

    // Count shared vertices
    const otherVertices = [ov0, ov1, ov2];
    const sharedCount = otherVertices.filter(v => clickedFaceVertices.has(v)).length;

    // If exactly 2 vertices are shared, and 4 unique total, it's a quad
    if (sharedCount === 2) {
      const allVertices = new Set([v0, v1, v2, ov0, ov1, ov2]);
      if (allVertices.size === 4) {
        // This is a quad pair!
        return otherFaceIdx;
      }
    }
  }

  return null; // No quad pair found (this is a standalone triangle)
}

/**
 * Get all faces that form a quad with any of the given face indices
 * Returns a Set of all faces including pairs
 */
export function expandToQuads(
  faceIndices: Set<number>,
  geometry: THREE.BufferGeometry
): Set<number> {
  const expandedFaces = new Set<number>(faceIndices);

  // For each selected face, find its quad pair
  faceIndices.forEach(faceIdx => {
    const pairIdx = findQuadPair(faceIdx, geometry);
    if (pairIdx !== null) {
      expandedFaces.add(pairIdx);
    }
  });

  return expandedFaces;
}

/**
 * Check if two triangles form a quad (share 2 vertices, 4 unique total)
 */
export function isQuadPair(
  face1Index: number,
  face2Index: number,
  geometry: THREE.BufferGeometry
): boolean {
  const index = geometry.index;
  if (!index) return false;

  // Get vertices of face 1
  const i1 = face1Index * 3;
  const v1 = [index.getX(i1), index.getX(i1 + 1), index.getX(i1 + 2)];

  // Get vertices of face 2
  const i2 = face2Index * 3;
  const v2 = [index.getX(i2), index.getX(i2 + 1), index.getX(i2 + 2)];

  // Count shared vertices
  const shared = v1.filter(v => v2.includes(v)).length;

  // Check total unique vertices
  const allVertices = new Set([...v1, ...v2]);

  return shared === 2 && allVertices.size === 4;
}
