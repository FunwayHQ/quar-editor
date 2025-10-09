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

// Helper: Find which edge a point lies on
function findEdgeForPoint(
  point: THREE.Vector3,
  edges: Array<[number, number]>,
  positions: THREE.BufferAttribute,
  tolerance: number = 0.01
): [number, number] | null {
  for (const [v0, v1] of edges) {
    const p0 = new THREE.Vector3().fromBufferAttribute(positions, v0);
    const p1 = new THREE.Vector3().fromBufferAttribute(positions, v1);

    // Check if point lies on the line segment v0-v1
    const edge = new THREE.Vector3().subVectors(p1, p0);
    const toPoint = new THREE.Vector3().subVectors(point, p0);
    const edgeLength = edge.length();
    edge.normalize();

    const projection = toPoint.dot(edge);
    if (projection < -tolerance || projection > edgeLength + tolerance) {
      continue;
    }

    const projectedPoint = p0.clone().addScaledVector(edge, projection);
    const distance = point.distanceTo(projectedPoint);

    if (distance < tolerance) {
      return [v0, v1];
    }
  }

  return null;
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

  // Build the quad's exterior edges (excluding the diagonal)
  const quadEdges: Array<[number, number]> = [
    [uniqueToFace1, diagonal1],
    [diagonal1, uniqueToFace2],
    [uniqueToFace2, diagonal2],
    [diagonal2, uniqueToFace1],
  ];

  // Find which edges the cut points lie on
  const cut1Edge = findEdgeForPoint(cut1, quadEdges, positions);
  const cut2Edge = findEdgeForPoint(cut2, quadEdges, positions);

  console.log('[QuadKnifeCut] Cut edges:', {
    cut1Edge,
    cut2Edge,
    cut1: cut1.toArray(),
    cut2: cut2.toArray(),
  });

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

  // Create the new quads based on proper connectivity
  // We need to preserve the original winding order

  // Get the original face normal to determine proper winding
  const v0 = new THREE.Vector3().fromBufferAttribute(positions, face1[0]);
  const v1 = new THREE.Vector3().fromBufferAttribute(positions, face1[1]);
  const v2 = new THREE.Vector3().fromBufferAttribute(positions, face1[2]);

  const edge1 = new THREE.Vector3().subVectors(v1, v0);
  const edge2 = new THREE.Vector3().subVectors(v2, v0);
  const originalNormal = new THREE.Vector3().crossVectors(edge1, edge2);
  originalNormal.normalize();

  // Helper function to check triangle winding
  const createTriangleWithCorrectWinding = (
    a: number,
    b: number,
    c: number
  ): number[] => {
    // Get positions of the three vertices
    const pa = new THREE.Vector3().fromBufferAttribute(positions, a);
    const pb = new THREE.Vector3().fromBufferAttribute(positions, b);
    const pc = new THREE.Vector3().fromBufferAttribute(positions, c);

    // Calculate normal for this ordering
    const e1 = new THREE.Vector3().subVectors(pb, pa);
    const e2 = new THREE.Vector3().subVectors(pc, pa);
    const testNormal = new THREE.Vector3().crossVectors(e1, e2);
    testNormal.normalize();

    // If the normal points in the opposite direction, flip the winding
    if (testNormal.dot(originalNormal) < 0) {
      return [a, c, b]; // Flipped winding
    }
    return [a, b, c]; // Original winding
  };

  // Determine the connectivity of the new quads
  // The cut creates 2 new quads from the original quad

  // First, we need to figure out which vertices form each new quad
  // The cut splits the quad along cut1-cut2 line

  // Quad 1: Contains uniqueToFace1
  // Find which diagonal vertex is on the same side as uniqueToFace1
  let quad1Vertices: number[];
  let quad2Vertices: number[];

  // Determine which edges the cut points lie on to understand the split
  if (cut1Edge && cut2Edge) {
    // Check if the cut goes from one side to the opposite side
    const cut1HasUnique1 = cut1Edge.includes(uniqueToFace1);
    const cut2HasUnique1 = cut2Edge.includes(uniqueToFace1);

    if (cut1HasUnique1 && cut2HasUnique1) {
      // Both cuts are on edges connected to uniqueToFace1
      // Quad 1: uniqueToFace1, cut1, cut2, and the diagonal between them
      quad1Vertices = [uniqueToFace1, cut1Idx, cut2Idx, diagonal1];
      quad2Vertices = [uniqueToFace2, diagonal1, diagonal2, cut1Idx];
    } else if (!cut1HasUnique1 && !cut2HasUnique1) {
      // Both cuts are on edges connected to uniqueToFace2
      quad1Vertices = [uniqueToFace1, diagonal1, diagonal2, cut1Idx];
      quad2Vertices = [uniqueToFace2, cut1Idx, cut2Idx, diagonal2];
    } else {
      // Standard case: cut goes across the quad
      // One cut is closer to uniqueToFace1, the other to uniqueToFace2
      quad1Vertices = [uniqueToFace1, diagonal1, cut1Idx, cut2Idx];
      quad2Vertices = [uniqueToFace2, cut2Idx, cut1Idx, diagonal2];
    }
  } else {
    // Fallback: standard quad split
    quad1Vertices = [uniqueToFace1, diagonal1, cut1Idx, cut2Idx];
    quad2Vertices = [uniqueToFace2, cut2Idx, cut1Idx, diagonal2];
  }

  // Create triangles for each quad with correct winding
  // Each quad needs 2 triangles

  // Quad 1 triangulation
  const newQuad1Triangle1 = createTriangleWithCorrectWinding(
    quad1Vertices[0], quad1Vertices[1], quad1Vertices[2]
  );
  const newQuad1Triangle2 = createTriangleWithCorrectWinding(
    quad1Vertices[0], quad1Vertices[2], quad1Vertices[3]
  );

  // Quad 2 triangulation
  const newQuad2Triangle1 = createTriangleWithCorrectWinding(
    quad2Vertices[0], quad2Vertices[1], quad2Vertices[2]
  );
  const newQuad2Triangle2 = createTriangleWithCorrectWinding(
    quad2Vertices[0], quad2Vertices[2], quad2Vertices[3]
  );

  // Add the new triangles
  newIndices.push(...newQuad1Triangle1);
  newIndices.push(...newQuad1Triangle2);
  newIndices.push(...newQuad2Triangle1);
  newIndices.push(...newQuad2Triangle2);

  // Create edge keys for marking
  const cutEdgeKey = makeEdgeKey(cut1Idx, cut2Idx);

  // The diagonals for the new quads (these should be hidden)
  // Quad 1 diagonal: connects vertices 0 and 2 of the quad
  const diagonal1Key = makeEdgeKey(quad1Vertices[0], quad1Vertices[2]);
  // Quad 2 diagonal: connects vertices 0 and 2 of the quad
  const diagonal2Key = makeEdgeKey(quad2Vertices[0], quad2Vertices[2]);

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