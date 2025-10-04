/**
 * Triangulation Utilities
 *
 * Helper functions for proper mesh triangulation after cuts
 */

import * as THREE from 'three';

/**
 * Split a triangle along a cut line defined by 2 edge intersections
 * Returns the new triangle indices
 */
export function splitTriangleAlongCut(
  v0Idx: number,
  v1Idx: number,
  v2Idx: number,
  cut1Idx: number,
  cut2Idx: number,
  edgeInfo: { edge1: number; edge2: number }
): number[] {
  const newIndices: number[] = [];

  // edgeInfo tells us which edges were cut:
  // edge 0 = v0-v1
  // edge 1 = v1-v2
  // edge 2 = v2-v0

  let { edge1, edge2 } = edgeInfo;

  // Normalize edge order (lower edge number first)
  if (edge1 > edge2) {
    [edge1, edge2] = [edge2, edge1];
    [cut1Idx, cut2Idx] = [cut2Idx, cut1Idx]; // Swap cut points too
  }

  console.log(`[Triangulation] Splitting along edges ${edge1}-${edge2}`);

  // Case 1: Cut crosses edges 0 and 1 (v0-v1 and v1-v2)
  // cut1 on edge v0-v1, cut2 on edge v1-v2
  // Isolated vertex: v1
  if (edge1 === 0 && edge2 === 1) {
    // Triangle 1: Isolated v1
    newIndices.push(v1Idx, cut2Idx, cut1Idx);

    // Triangle 2: Quad first half
    newIndices.push(v0Idx, cut1Idx, v2Idx);

    // Triangle 3: Quad second half
    newIndices.push(cut1Idx, cut2Idx, v2Idx);
  }
  // Case 2: Cut crosses edges 1 and 2 (v1-v2 and v2-v0)
  // cut1 on edge v1-v2, cut2 on edge v2-v0
  // Isolated vertex: v2
  else if (edge1 === 1 && edge2 === 2) {
    // Triangle 1: Isolated v2
    newIndices.push(v2Idx, cut2Idx, cut1Idx);

    // Triangle 2: Quad first half
    newIndices.push(v1Idx, cut1Idx, v0Idx);

    // Triangle 3: Quad second half
    newIndices.push(cut1Idx, cut2Idx, v0Idx);
  }
  // Case 3: Cut crosses edges 0 and 2 (v0-v1 and v2-v0)
  else if (edge1 === 0 && edge2 === 2) {
    // cut1 on edge v0-v1, cut2 on edge v2-v0
    // Isolated vertex: v0
    // Quad side: v1, v2, cut2, cut1

    // Triangle 1: Isolated vertex with cut line
    newIndices.push(v0Idx, cut1Idx, cut2Idx);

    // Triangle 2: Quad first half (v1, cut1, v2)
    newIndices.push(v1Idx, cut1Idx, v2Idx);

    // Triangle 3: Quad second half (cut1, cut2, v2)
    newIndices.push(cut1Idx, cut2Idx, v2Idx);
  }

  console.log(`[Triangulation] Created ${newIndices.length / 3} triangles`);
  return newIndices;
}
