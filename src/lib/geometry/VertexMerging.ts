/**
 * Vertex Merging Utilities
 *
 * Find vertices that share the same position (merged vertices).
 * Sprint Y: Merged vertex mode for intuitive editing
 */

import * as THREE from 'three';

/**
 * Find all vertices at the same position as the given vertex
 * Returns array of vertex indices that should move together
 */
export function findMergedVertices(
  vertexIndex: number,
  geometry: THREE.BufferGeometry,
  threshold: number = 0.0001
): number[] {
  const positions = geometry.attributes.position;
  if (!positions) return [vertexIndex];

  const targetPos = new THREE.Vector3(
    positions.getX(vertexIndex),
    positions.getY(vertexIndex),
    positions.getZ(vertexIndex)
  );

  const mergedIndices: number[] = [vertexIndex];

  // Check all other vertices
  for (let i = 0; i < positions.count; i++) {
    if (i === vertexIndex) continue;

    const pos = new THREE.Vector3(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i)
    );

    // If positions are the same (within threshold), they're merged
    if (pos.distanceTo(targetPos) < threshold) {
      mergedIndices.push(i);
    }
  }

  return mergedIndices;
}

/**
 * Find all merged vertices for a set of vertex indices
 * Returns expanded set including all merged vertices
 */
export function findAllMergedVertices(
  vertexIndices: Set<number>,
  geometry: THREE.BufferGeometry,
  threshold: number = 0.0001
): Set<number> {
  const allMerged = new Set<number>();

  vertexIndices.forEach(vertexIndex => {
    const merged = findMergedVertices(vertexIndex, geometry, threshold);
    merged.forEach(idx => allMerged.add(idx));
  });

  return allMerged;
}

/**
 * Build a map of merged vertex groups
 * Returns Map of position key -> array of vertex indices at that position
 */
export function buildMergedVertexMap(
  geometry: THREE.BufferGeometry,
  precision: number = 4 // decimal places for position key
): Map<string, number[]> {
  const positions = geometry.attributes.position;
  if (!positions) return new Map();

  const mergedMap = new Map<string, number[]>();

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i).toFixed(precision);
    const y = positions.getY(i).toFixed(precision);
    const z = positions.getZ(i).toFixed(precision);
    const key = `${x},${y},${z}`;

    const group = mergedMap.get(key) || [];
    group.push(i);
    mergedMap.set(key, group);
  }

  return mergedMap;
}
