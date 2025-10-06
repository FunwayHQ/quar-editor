/**
 * Edge Filtering Utilities
 *
 * Detect and filter quad edges vs triangulation edges for clean wireframe rendering.
 * Sprint Y: Fix quad faces showing 5 edges instead of 4
 */

import * as THREE from 'three';

/**
 * Get quad edges (non-triangulation edges) from geometry
 * Returns array of edge pairs [v0, v1] that should be visible
 *
 * Sprint Y: Feature edges (knife cuts, etc.) stored in geometry.userData are always visible
 */
export function getQuadEdges(geometry: THREE.BufferGeometry): [number, number][] {
  const index = geometry.index;
  if (!index) {
    // Non-indexed geometry - return all edges
    return getAllEdges(geometry);
  }

  // Get feature edges from geometry metadata
  const featureEdgeSet = new Set<string>(
    (geometry.userData?.featureEdges as string[]) || []
  );

  // Build edge map: edge key -> array of face indices that use this edge
  const edgeToFaces = new Map<string, number[]>();

  // Process all triangles
  for (let i = 0; i < index.count; i += 3) {
    const faceIdx = Math.floor(i / 3);
    const v0 = index.array[i];
    const v1 = index.array[i + 1];
    const v2 = index.array[i + 2];

    // Add 3 edges of this triangle
    addEdgeToMap(edgeToFaces, v0, v1, faceIdx);
    addEdgeToMap(edgeToFaces, v1, v2, faceIdx);
    addEdgeToMap(edgeToFaces, v2, v0, faceIdx);
  }

  // Filter edges
  const quadEdges: [number, number][] = [];

  edgeToFaces.forEach((faces, edgeKey) => {
    const [v0, v1] = parseEdgeKey(edgeKey);

    // Sprint Y: Feature edges are ALWAYS visible (knife cuts, etc.)
    if (featureEdgeSet.has(edgeKey)) {
      quadEdges.push([v0, v1]);
      return; // Skip other checks
    }

    if (faces.length === 1) {
      // Boundary edge (only 1 face uses it) - always visible
      quadEdges.push([v0, v1]);
    } else if (faces.length === 2) {
      // Internal edge shared by 2 faces
      // Check if this is a diagonal edge (triangulation) or a real quad edge
      const isDiagonal = isTriangulationDiagonal(faces[0], faces[1], index, edgeKey);

      if (!isDiagonal) {
        // Real quad edge - keep it
        quadEdges.push([v0, v1]);
      }
      // Skip diagonal edges (triangulation artifacts) UNLESS marked as feature
    } else if (faces.length > 2) {
      // Non-manifold edge (shared by 3+ faces) - show it
      quadEdges.push([v0, v1]);
    }
  });

  return quadEdges;
}

/**
 * Get all edges from geometry (fallback for non-indexed)
 */
function getAllEdges(geometry: THREE.BufferGeometry): [number, number][] {
  const positions = geometry.attributes.position;
  const edges: [number, number][] = [];

  // Assume triangles
  for (let i = 0; i < positions.count; i += 3) {
    edges.push([i, i + 1]);
    edges.push([i + 1, i + 2]);
    edges.push([i + 2, i]);
  }

  return edges;
}

/**
 * Add edge to map with face index
 */
function addEdgeToMap(
  edgeToFaces: Map<string, number[]>,
  v0: number,
  v1: number,
  faceIndex: number
): void {
  const key = getEdgeKey(v0, v1);
  const faces = edgeToFaces.get(key) || [];
  faces.push(faceIndex);
  edgeToFaces.set(key, faces);
}

/**
 * Create normalized edge key (always v0 < v1)
 */
function getEdgeKey(v0: number, v1: number): string {
  return v0 < v1 ? `${v0}-${v1}` : `${v1}-${v0}`;
}

/**
 * Parse edge key back to vertex indices
 */
function parseEdgeKey(key: string): [number, number] {
  const [v0, v1] = key.split('-').map(Number);
  return [v0, v1];
}

/**
 * Check if an edge is a triangulation diagonal
 *
 * An edge is a diagonal if:
 * - It's shared by exactly 2 faces
 * - The 2 faces together form a quad (4 unique vertices total)
 * - The edge connects opposite corners of the quad
 */
function isTriangulationDiagonal(
  face1Idx: number,
  face2Idx: number,
  index: THREE.BufferAttribute | THREE.GLBufferAttribute,
  edgeKey: string
): boolean {
  // Get vertices of both faces
  const face1Vertices = [
    index.getX(face1Idx * 3),
    index.getX(face1Idx * 3 + 1),
    index.getX(face1Idx * 3 + 2),
  ];

  const face2Vertices = [
    index.getX(face2Idx * 3),
    index.getX(face2Idx * 3 + 1),
    index.getX(face2Idx * 3 + 2),
  ];

  // Get all unique vertices
  const allVertices = new Set([...face1Vertices, ...face2Vertices]);

  // If we have exactly 4 unique vertices, it's a quad
  if (allVertices.size === 4) {
    // This edge is likely the diagonal
    // Double-check: the edge should connect two vertices that aren't shared
    const [v0, v1] = parseEdgeKey(edgeKey);

    // Count how many faces each vertex appears in
    const v0InFace1 = face1Vertices.includes(v0);
    const v0InFace2 = face2Vertices.includes(v0);
    const v1InFace1 = face1Vertices.includes(v1);
    const v1InFace2 = face2Vertices.includes(v1);

    // If both vertices appear in both faces, it's the diagonal
    if (v0InFace1 && v0InFace2 && v1InFace1 && v1InFace2) {
      return true; // This is the diagonal edge
    }
  }

  return false; // Not a diagonal
}

/**
 * Get unique edges from geometry (for reference)
 */
export function getUniqueEdges(geometry: THREE.BufferGeometry): [number, number][] {
  const index = geometry.index;
  if (!index) return getAllEdges(geometry);

  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];

  for (let i = 0; i < index.count; i += 3) {
    const v0 = index.array[i];
    const v1 = index.array[i + 1];
    const v2 = index.array[i + 2];

    // Add 3 edges
    [
      [v0, v1],
      [v1, v2],
      [v2, v0],
    ].forEach(([a, b]) => {
      const key = getEdgeKey(a, b);
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([a, b]);
      }
    });
  }

  return edges;
}
