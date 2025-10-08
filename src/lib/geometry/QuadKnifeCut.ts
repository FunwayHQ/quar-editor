/**
 * Quad Knife Cut Algorithm
 *
 * Cuts a quad face (2 triangles) into 2 quads (4 triangles) preserving quad topology.
 * Sprint Y: Knife tool quad mode - no diagonals after cut
 */

import * as THREE from 'three';
import { findQuadPair } from './QuadDetection';

interface CutPoint {
  point: THREE.Vector3;
  faceIndex: number;
  edgeIndex?: number;
}

/**
 * Cut a quad in quad mode - creates 2 quads (4 triangles) from 1 quad (2 triangles)
 *
 * Algorithm:
 * 1. Find the 2 triangles that form the quad
 * 2. Identify the 4 corners
 * 3. Create 2 new vertices on the cut edges
 * 4. Split quad into 2 new quads (4 triangles total)
 * 5. Copy all other faces unchanged
 * 6. Result: Clean quad topology, no diagonals through cut
 */
// Helper: Create normalized edge key
function makeEdgeKey(v0: number, v1: number): string {
  return v0 < v1 ? `${v0}-${v1}` : `${v1}-${v0}`;
}

export function cutQuadFace(
  geometry: THREE.BufferGeometry,
  faceIndex: number,
  cutPoints: CutPoint[]
): {
  newPositions: number[];
  newIndices: number[];
  cutVertexIndices: [number, number];
  featureEdge: string; // Edge key to mark as feature (visible cut line)
  diagonalEdges: string[]; // Edge keys of new quad diagonals (should be hidden)
} {
  const index = geometry.index!;
  const positions = geometry.attributes.position;

  // Find quad pair
  const quadPair = findQuadPair(faceIndex, geometry);

  if (quadPair === null) {
    throw new Error('Face is not part of a quad - use triangle cut mode');
  }

  // Get vertices of both triangles
  const i1 = faceIndex * 3;
  const face1 = [
    index.getX(i1),
    index.getX(i1 + 1),
    index.getX(i1 + 2),
  ];

  const i2 = quadPair * 3;
  const face2 = [
    index.getX(i2),
    index.getX(i2 + 1),
    index.getX(i2 + 2),
  ];

  console.log('[QuadKnifeCut] Face topology:', {
    faceIndex,
    quadPair,
    face1,
    face2,
    totalIndices: index.count,
  });

  // Find the 2 shared vertices (diagonal)
  const sharedVertices = face1.filter(v => face2.includes(v));

  // Find the 4 unique corner vertices
  const allVertices = [...new Set([...face1, ...face2])];

  console.log('[QuadKnifeCut] Vertex analysis:', {
    sharedVertices,
    allVertices,
    sharedCount: sharedVertices.length,
    uniqueCount: allVertices.length,
  });

  if (allVertices.length !== 4 || sharedVertices.length !== 2) {
    console.error('[QuadKnifeCut] Invalid quad topology!', {
      expected: '4 unique vertices, 2 shared',
      actual: `${allVertices.length} unique, ${sharedVertices.length} shared`,
    });
    throw new Error('Invalid quad topology');
  }

  // Find the 2 unique vertices (corners not on diagonal)
  const uniqueToFace1 = face1.find(v => !sharedVertices.includes(v));
  const uniqueToFace2 = face2.find(v => !sharedVertices.includes(v));

  // Sprint 10: Fix falsy value bug - vertex index 0 is valid!
  if (uniqueToFace1 === undefined || uniqueToFace2 === undefined) {
    console.error('[QuadKnifeCut] Failed to find unique vertices!', {
      face1,
      face2,
      sharedVertices,
      allVertices: Array.from(allVertices),
      uniqueCheck1: face1.filter(v => !sharedVertices.includes(v)),
      uniqueCheck2: face2.filter(v => !sharedVertices.includes(v)),
    });
    throw new Error('Invalid quad - could not find unique vertices');
  }

  // Quad corners: uniqueToFace1, sharedVertices[0], uniqueToFace2, sharedVertices[1]
  // We need to order them properly to form a quad
  const [diagonal1, diagonal2] = sharedVertices;

  console.log('[QuadKnifeCut] Quad vertices:', {
    diagonal: sharedVertices,
    corners: [uniqueToFace1, uniqueToFace2],
    allVertices,
    totalVertices: positions.count
  });

  // Copy ALL existing vertices
  const newPositions: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    newPositions.push(positions.getX(i), positions.getY(i), positions.getZ(i));
  }

  let nextVertexIndex = positions.count;

  // Add 2 new vertices from cut points
  if (cutPoints.length !== 2) {
    throw new Error('Quad cut requires exactly 2 cut points');
  }

  const cut1 = cutPoints[0].point;
  const cut2 = cutPoints[1].point;

  newPositions.push(cut1.x, cut1.y, cut1.z);
  const cut1Idx = nextVertexIndex++;

  newPositions.push(cut2.x, cut2.y, cut2.z);
  const cut2Idx = nextVertexIndex++;

  // Rebuild ALL faces - skip cut quad, copy others, append 4 new triangles
  const newIndices: number[] = [];
  const faceCount = index.count / 3;
  const processedFaces = new Set<number>([faceIndex, quadPair]);

  for (let fIdx = 0; fIdx < faceCount; fIdx++) {
    if (processedFaces.has(fIdx)) {
      // Skip cut faces - will be replaced by 4 new triangles
      continue;
    }

    // Copy face unchanged
    const i = fIdx * 3;
    newIndices.push(
      index.getX(i),
      index.getX(i + 1),
      index.getX(i + 2)
    );
  }

  // Sprint Y: Create clean 2 quads (4 triangles) - mark cut edge as FEATURE
  // Quad 1: uniqueToFace1, cut1, cut2, diagonal1
  newIndices.push(uniqueToFace1, cut1Idx, cut2Idx);    // Triangle 1
  newIndices.push(uniqueToFace1, cut2Idx, diagonal1);  // Triangle 2
  // These 2 triangles share edge uniqueToFace1-cut2Idx (diagonal - MUST HIDE)

  // Quad 2: cut1, uniqueToFace2, diagonal2, cut2
  newIndices.push(cut1Idx, uniqueToFace2, diagonal2);  // Triangle 3
  newIndices.push(cut1Idx, diagonal2, cut2Idx);        // Triangle 4
  // These 2 triangles share edge cut1Idx-diagonal2 (diagonal - MUST HIDE)

  // Create feature edge key for the cut edge (VISIBLE)
  const cutEdgeKey = makeEdgeKey(cut1Idx, cut2Idx);

  // Sprint 10: Mark the NEW quad diagonals as hidden
  // Quad 1 (faces at indices faceCount-4, faceCount-3): diagonal = uniqueToFace1-cut2Idx
  // Quad 2 (faces at indices faceCount-2, faceCount-1): diagonal = cut1Idx-diagonal2
  const diagonal1Key = makeEdgeKey(uniqueToFace1, cut2Idx);
  const diagonal2Key = makeEdgeKey(cut1Idx, diagonal2);

  const newFaceCount = newIndices.length / 3;
  const maxVertexIndex = Math.max(...newIndices);
  const totalVertices = newPositions.length / 3;

  console.log('[QuadKnifeCut] Index buffer validation:', {
    originalFaces: faceCount,
    newFaces: newFaceCount,
    totalVertices,
    maxVertexIndex,
    isValid: maxVertexIndex < totalVertices,
    cutFaces: [faceIndex, quadPair],
    appendedFaces: [newFaceCount - 4, newFaceCount - 3, newFaceCount - 2, newFaceCount - 1],
  });

  if (maxVertexIndex >= totalVertices) {
    console.error('[QuadKnifeCut] INVALID GEOMETRY - indices reference non-existent vertices!', {
      maxIndex: maxVertexIndex,
      vertexCount: totalVertices,
    });
    throw new Error('Invalid geometry - out of bounds vertex indices');
  }

  // Validate geometry
  console.log('[QuadKnifeCut] Result validation:', {
    totalVertices: newPositions.length / 3,
    totalTriangles: newIndices.length / 3,
    originalFaces: faceCount,
    newFaces: newIndices.length / 3,
    cutEdge: cutEdgeKey,
    diagonals: [diagonal1Key, diagonal2Key],
  });

  if (newIndices.length === 0 || newPositions.length === 0) {
    console.error('[QuadKnifeCut] INVALID GEOMETRY - no faces or vertices!');
    throw new Error('Quad cut produced empty geometry');
  }

  console.log(`[QuadKnifeCut] Created 2 clean quads (4 triangles)\n  ✓ Cut edge (visible): ${cutEdgeKey}\n  ✗ Diagonals (hidden): ${diagonal1Key}, ${diagonal2Key}`);

  return {
    newPositions,
    newIndices,
    cutVertexIndices: [cut1Idx, cut2Idx],
    featureEdge: cutEdgeKey, // Caller should add this to geometry.userData.featureEdges
    diagonalEdges: [diagonal1Key, diagonal2Key], // Caller should ensure these are hidden
  };
}
