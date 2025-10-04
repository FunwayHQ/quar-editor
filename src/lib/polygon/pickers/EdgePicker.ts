/**
 * Edge Picker
 *
 * Edge selection using invisible EdgesGeometry for raycasting.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import * as THREE from 'three';
import { makeEdgeKey } from '../../../stores/editModeStore';

export interface EdgePickResult {
  v1: number;
  v2: number;
  edgeKey: string;
  midpoint: THREE.Vector3;
}

/**
 * Create invisible edges mesh for picking
 */
export function createEdgesMesh(geometry: THREE.BufferGeometry): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(geometry, 15); // 15 degree threshold
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0, // Invisible for picking only
    depthTest: false,
  });

  return new THREE.LineSegments(edges, material);
}

/**
 * Pick edge from raycaster intersection
 */
export function pickEdge(
  geometry: THREE.BufferGeometry,
  intersectionPoint: THREE.Vector3,
  threshold: number = 0.05
): EdgePickResult | null {
  const positions = geometry.attributes.position.array;
  const indices = geometry.index?.array;

  if (!indices) {
    return pickEdgeNonIndexed(geometry, intersectionPoint, threshold);
  }

  // Get all edges from indices
  const edges = extractEdges(geometry);
  let closestEdge: EdgePickResult | null = null;
  let minDistance = threshold;

  for (const [v1, v2] of edges) {
    const p1 = new THREE.Vector3(
      positions[v1 * 3],
      positions[v1 * 3 + 1],
      positions[v1 * 3 + 2]
    );
    const p2 = new THREE.Vector3(
      positions[v2 * 3],
      positions[v2 * 3 + 1],
      positions[v2 * 3 + 2]
    );

    // Calculate distance from point to line segment
    const distance = distanceToLineSegment(intersectionPoint, p1, p2);

    if (distance < minDistance) {
      minDistance = distance;
      const midpoint = p1.clone().add(p2).multiplyScalar(0.5);
      closestEdge = {
        v1,
        v2,
        edgeKey: makeEdgeKey(v1, v2),
        midpoint,
      };
    }
  }

  return closestEdge;
}

/**
 * Extract unique edges from geometry
 */
function extractEdges(geometry: THREE.BufferGeometry): [number, number][] {
  const indices = geometry.index!.array;
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];

  for (let i = 0; i < indices.length; i += 3) {
    const v1 = indices[i];
    const v2 = indices[i + 1];
    const v3 = indices[i + 2];

    // Add three edges of the triangle
    addEdge(v1, v2, edgeSet, edges);
    addEdge(v2, v3, edgeSet, edges);
    addEdge(v3, v1, edgeSet, edges);
  }

  return edges;
}

/**
 * Add edge to set (avoiding duplicates)
 */
function addEdge(
  v1: number,
  v2: number,
  edgeSet: Set<string>,
  edges: [number, number][]
): void {
  const key = makeEdgeKey(v1, v2);
  if (!edgeSet.has(key)) {
    edgeSet.add(key);
    edges.push([v1, v2]);
  }
}

/**
 * Calculate distance from point to line segment
 */
function distanceToLineSegment(
  point: THREE.Vector3,
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3
): number {
  const line = lineEnd.clone().sub(lineStart);
  const lineLength = line.length();

  if (lineLength === 0) {
    return point.distanceTo(lineStart);
  }

  const t = Math.max(
    0,
    Math.min(1, point.clone().sub(lineStart).dot(line) / (lineLength * lineLength))
  );

  const projection = lineStart.clone().add(line.multiplyScalar(t));
  return point.distanceTo(projection);
}

/**
 * Pick edge from non-indexed geometry
 */
function pickEdgeNonIndexed(
  geometry: THREE.BufferGeometry,
  intersectionPoint: THREE.Vector3,
  threshold: number
): EdgePickResult | null {
  const positions = geometry.attributes.position.array;
  const faceCount = positions.length / 9; // 3 vertices per face, 3 coords per vertex

  let closestEdge: EdgePickResult | null = null;
  let minDistance = threshold;

  for (let f = 0; f < faceCount; f++) {
    const v1Idx = f * 3;
    const v2Idx = f * 3 + 1;
    const v3Idx = f * 3 + 2;

    // Check all three edges of the triangle
    const edges = [
      [v1Idx, v2Idx],
      [v2Idx, v3Idx],
      [v3Idx, v1Idx],
    ];

    for (const [v1, v2] of edges) {
      const p1 = new THREE.Vector3(
        positions[v1 * 3],
        positions[v1 * 3 + 1],
        positions[v1 * 3 + 2]
      );
      const p2 = new THREE.Vector3(
        positions[v2 * 3],
        positions[v2 * 3 + 1],
        positions[v2 * 3 + 2]
      );

      const distance = distanceToLineSegment(intersectionPoint, p1, p2);

      if (distance < minDistance) {
        minDistance = distance;
        const midpoint = p1.clone().add(p2).multiplyScalar(0.5);
        closestEdge = {
          v1,
          v2,
          edgeKey: makeEdgeKey(v1, v2),
          midpoint,
        };
      }
    }
  }

  return closestEdge;
}

/**
 * Get all edges from geometry
 */
export function getAllEdges(geometry: THREE.BufferGeometry): string[] {
  const indices = geometry.index?.array;

  if (!indices) {
    // Non-indexed geometry
    const positions = geometry.attributes.position.array;
    const faceCount = positions.length / 9;
    const edges: string[] = [];
    const edgeSet = new Set<string>();

    for (let f = 0; f < faceCount; f++) {
      const v1 = f * 3;
      const v2 = f * 3 + 1;
      const v3 = f * 3 + 2;

      const e1 = makeEdgeKey(v1, v2);
      const e2 = makeEdgeKey(v2, v3);
      const e3 = makeEdgeKey(v3, v1);

      if (!edgeSet.has(e1)) { edgeSet.add(e1); edges.push(e1); }
      if (!edgeSet.has(e2)) { edgeSet.add(e2); edges.push(e2); }
      if (!edgeSet.has(e3)) { edgeSet.add(e3); edges.push(e3); }
    }

    return edges;
  }

  // Indexed geometry
  const edgeSet = new Set<string>();
  const edges: string[] = [];

  for (let i = 0; i < indices.length; i += 3) {
    const v1 = indices[i];
    const v2 = indices[i + 1];
    const v3 = indices[i + 2];

    const e1 = makeEdgeKey(v1, v2);
    const e2 = makeEdgeKey(v2, v3);
    const e3 = makeEdgeKey(v3, v1);

    if (!edgeSet.has(e1)) { edgeSet.add(e1); edges.push(e1); }
    if (!edgeSet.has(e2)) { edgeSet.add(e2); edges.push(e2); }
    if (!edgeSet.has(e3)) { edgeSet.add(e3); edges.push(e3); }
  }

  return edges;
}
