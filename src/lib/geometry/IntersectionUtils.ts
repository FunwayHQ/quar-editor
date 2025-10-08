/**
 * Intersection Utilities
 *
 * Geometric intersection algorithms for knife tool and other operations.
 * Mini-Sprint: Knife Tool Implementation
 */

import * as THREE from 'three';
import { IntersectionPoint } from '../../stores/knifeToolStore';
import { findQuadPair } from './QuadDetection';

/**
 * Find intersections between a line segment and a mesh
 */
export function findLineIntersections(
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3,
  geometry: THREE.BufferGeometry,
  mesh: THREE.Mesh
): IntersectionPoint[] {
  const intersections: IntersectionPoint[] = [];
  const positions = geometry.attributes.position;
  const indices = geometry.index;

  if (!indices) {
    console.warn('[IntersectionUtils] Geometry must be indexed for knife cut');
    return [];
  }

  const line = new THREE.Line3(lineStart, lineEnd);
  const faceCount = indices.count / 3;

  // Check each face for intersection
  for (let faceIdx = 0; faceIdx < faceCount; faceIdx++) {
    const intersection = lineFaceIntersection(
      line,
      faceIdx,
      positions,
      indices,
      mesh
    );

    if (intersection) {
      intersections.push({
        point: intersection.point,
        faceIndex: faceIdx,
        uv: intersection.uv,
      });
    }
  }

  console.log(`[IntersectionUtils] Found ${intersections.length} intersections`);
  return intersections;
}

/**
 * Test if a line segment intersects a triangle face
 */
export function lineFaceIntersection(
  line: THREE.Line3,
  faceIndex: number,
  positions: THREE.BufferAttribute,
  indices: THREE.BufferAttribute,
  mesh: THREE.Mesh
): { point: THREE.Vector3; uv: THREE.Vector2 } | null {
  // Get triangle vertices in local space
  const i = faceIndex * 3;
  const v0Index = indices.getX(i);
  const v1Index = indices.getX(i + 1);
  const v2Index = indices.getX(i + 2);

  const v0 = new THREE.Vector3().fromBufferAttribute(positions, v0Index);
  const v1 = new THREE.Vector3().fromBufferAttribute(positions, v1Index);
  const v2 = new THREE.Vector3().fromBufferAttribute(positions, v2Index);

  // Transform vertices to world space
  v0.applyMatrix4(mesh.matrixWorld);
  v1.applyMatrix4(mesh.matrixWorld);
  v2.applyMatrix4(mesh.matrixWorld);

  // Create triangle
  const triangle = new THREE.Triangle(v0, v1, v2);

  // Get plane of the triangle
  const plane = new THREE.Plane();
  triangle.getPlane(plane);

  // Find intersection point with plane
  const intersectionPoint = new THREE.Vector3();
  const intersects = plane.intersectLine(line, intersectionPoint);

  if (!intersects) {
    return null; // Line parallel to plane or doesn't reach it
  }

  // Check if intersection point is inside the triangle
  const bary = new THREE.Vector3();
  triangle.getBarycoord(intersectionPoint, bary);

  // Point is inside triangle if all barycentric coordinates are >= 0
  if (bary.x >= 0 && bary.y >= 0 && bary.z >= 0) {
    return {
      point: intersectionPoint,
      uv: new THREE.Vector2(bary.x, bary.y),
    };
  }

  return null;
}

/**
 * Find the closest point on a line segment to a given point
 */
export function closestPointOnLine(
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3,
  point: THREE.Vector3
): THREE.Vector3 {
  const line = new THREE.Line3(lineStart, lineEnd);
  const closestPoint = new THREE.Vector3();
  line.closestPointToPoint(point, true, closestPoint);
  return closestPoint;
}

/**
 * Check if a point is close to a vertex (for snapping)
 */
export function findNearbyVertex(
  point: THREE.Vector3,
  geometry: THREE.BufferGeometry,
  mesh: THREE.Mesh,
  threshold: number = 0.1
): number | null {
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    vertex.applyMatrix4(mesh.matrixWorld);

    const distance = point.distanceTo(vertex);
    if (distance < threshold) {
      return i;
    }
  }

  return null;
}

/**
 * Check if a point is close to an edge (for snapping)
 */
export function findNearbyEdge(
  point: THREE.Vector3,
  geometry: THREE.BufferGeometry,
  mesh: THREE.Mesh,
  threshold: number = 0.1
): [number, number] | null {
  const positions = geometry.attributes.position;
  const indices = geometry.index;

  if (!indices) return null;

  const edgeMap = new Map<string, [number, number]>();

  // Build edge map
  for (let i = 0; i < indices.count; i += 3) {
    const v0 = indices.getX(i);
    const v1 = indices.getX(i + 1);
    const v2 = indices.getX(i + 2);

    const edges: Array<[number, number]> = [
      [v0, v1],
      [v1, v2],
      [v2, v0],
    ];

    edges.forEach(([a, b]) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edgeMap.set(key, [a, b]);
    });
  }

  // Check each edge
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();

  for (const [a, b] of edgeMap.values()) {
    p0.fromBufferAttribute(positions, a).applyMatrix4(mesh.matrixWorld);
    p1.fromBufferAttribute(positions, b).applyMatrix4(mesh.matrixWorld);

    const closestPoint = closestPointOnLine(p0, p1, point);
    const distance = point.distanceTo(closestPoint);

    if (distance < threshold) {
      return [a, b];
    }
  }

  return null;
}

/**
 * Sort intersection points along the cut line direction
 */
export function sortIntersectionsByDistance(
  intersections: IntersectionPoint[],
  lineStart: THREE.Vector3
): IntersectionPoint[] {
  return intersections.sort((a, b) => {
    const distA = lineStart.distanceTo(a.point);
    const distB = lineStart.distanceTo(b.point);
    return distA - distB;
  });
}

/**
 * Find where a 3D line segment intersects with another 3D line segment
 * Returns the intersection point if they intersect, null otherwise
 */
export function lineSegmentIntersection(
  line1Start: THREE.Vector3,
  line1End: THREE.Vector3,
  line2Start: THREE.Vector3,
  line2End: THREE.Vector3,
  tolerance: number = 0.0001
): THREE.Vector3 | null {
  const d1 = new THREE.Vector3().subVectors(line1End, line1Start);
  const d2 = new THREE.Vector3().subVectors(line2End, line2Start);
  const dc = new THREE.Vector3().subVectors(line2Start, line1Start);

  const cross = new THREE.Vector3().crossVectors(d1, d2);
  const crossLengthSq = cross.lengthSq();

  // Check if lines are parallel
  if (crossLengthSq < tolerance) {
    return null;
  }

  // Calculate intersection parameters
  const t1 = new THREE.Vector3().crossVectors(dc, d2).dot(cross) / crossLengthSq;
  const t2 = new THREE.Vector3().crossVectors(dc, d1).dot(cross) / crossLengthSq;

  // Check if intersection is within both line segments
  if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
    const intersection = line1Start.clone().add(d1.multiplyScalar(t1));
    return intersection;
  }

  return null;
}

/**
 * Get parameter t of a point on a line segment (0 = start, 1 = end)
 */
export function getPointParameterOnLine(
  point: THREE.Vector3,
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3
): number {
  const lineDir = new THREE.Vector3().subVectors(lineEnd, lineStart);
  const pointDir = new THREE.Vector3().subVectors(point, lineStart);

  const lineLength = lineDir.length();
  if (lineLength < 0.0001) return 0;

  const t = pointDir.dot(lineDir) / (lineLength * lineLength);
  return t;
}

/**
 * Project a cut line onto a face and find edge intersections
 */
export interface EdgeIntersection {
  point: THREE.Vector3;
  edgeIndex: number;
  t: number;
}

/**
 * Get the 4 exterior edges of a quad (filtering out the diagonal)
 */
function getQuadExteriorEdges(
  faceIndex: number,
  quadPairIndex: number,
  geometry: THREE.BufferGeometry,
  mesh: THREE.Mesh
): Array<{ start: THREE.Vector3; end: THREE.Vector3; startIdx: number; endIdx: number; index: number }> {
  const positions = geometry.attributes.position;
  const indices = geometry.index!;

  // Get vertices of both triangles
  const i1 = faceIndex * 3;
  const face1 = [
    indices.getX(i1),
    indices.getX(i1 + 1),
    indices.getX(i1 + 2),
  ];

  const i2 = quadPairIndex * 3;
  const face2 = [
    indices.getX(i2),
    indices.getX(i2 + 1),
    indices.getX(i2 + 2),
  ];

  // Find shared vertices (diagonal)
  const sharedVertices = face1.filter(v => face2.includes(v));

  // Get all unique vertices (the 4 corners)
  const allVertices = [...new Set([...face1, ...face2])];

  if (allVertices.length !== 4 || sharedVertices.length !== 2) {
    console.error('[IntersectionUtils] Invalid quad topology');
    return [];
  }

  // Build all edges from both triangles
  const allEdges = [
    [face1[0], face1[1]],
    [face1[1], face1[2]],
    [face1[2], face1[0]],
    [face2[0], face2[1]],
    [face2[1], face2[2]],
    [face2[2], face2[0]],
  ];

  // Create edge key helper
  const makeKey = (v0: number, v1: number) => v0 < v1 ? `${v0}-${v1}` : `${v1}-${v0}`;
  const diagonalKey = makeKey(sharedVertices[0], sharedVertices[1]);

  // Filter to unique exterior edges (exclude diagonal)
  const exteriorEdgesMap = new Map<string, [number, number]>();

  allEdges.forEach(([v0, v1]) => {
    const key = makeKey(v0, v1);

    // Skip the diagonal
    if (key === diagonalKey) {
      return;
    }

    exteriorEdgesMap.set(key, [v0, v1]);
  });

  // Convert to world space edge objects
  const exteriorEdges = Array.from(exteriorEdgesMap.values()).map(([v0, v1], index) => {
    const start = new THREE.Vector3().fromBufferAttribute(positions, v0);
    const end = new THREE.Vector3().fromBufferAttribute(positions, v1);

    start.applyMatrix4(mesh.matrixWorld);
    end.applyMatrix4(mesh.matrixWorld);

    return { start, end, startIdx: v0, endIdx: v1, index };
  });

  console.log(`[IntersectionUtils] Quad has ${exteriorEdges.length} exterior edges (diagonal filtered)`);

  return exteriorEdges;
}

export function projectCutOntoFace(
  pointA: THREE.Vector3,
  pointB: THREE.Vector3,
  faceIndex: number,
  geometry: THREE.BufferGeometry,
  mesh: THREE.Mesh,
  quadMode: boolean = false
): EdgeIntersection[] {
  const positions = geometry.attributes.position;
  const indices = geometry.index;

  if (!indices) return [];

  // Get face vertices in local space
  const i = faceIndex * 3;
  const v0Idx = indices.getX(i);
  const v1Idx = indices.getX(i + 1);
  const v2Idx = indices.getX(i + 2);

  const v0 = new THREE.Vector3().fromBufferAttribute(positions, v0Idx);
  const v1 = new THREE.Vector3().fromBufferAttribute(positions, v1Idx);
  const v2 = new THREE.Vector3().fromBufferAttribute(positions, v2Idx);

  // Transform to world space
  const v0World = v0.clone().applyMatrix4(mesh.matrixWorld);
  const v1World = v1.clone().applyMatrix4(mesh.matrixWorld);
  const v2World = v2.clone().applyMatrix4(mesh.matrixWorld);

  // Get face plane
  const triangle = new THREE.Triangle(v0World, v1World, v2World);
  const plane = new THREE.Plane();
  triangle.getPlane(plane);

  // Project cut points onto face plane
  const projA = plane.projectPoint(pointA, new THREE.Vector3());
  const projB = plane.projectPoint(pointB, new THREE.Vector3());

  console.log('[ProjectCut] Projected A:', projA.toArray());
  console.log('[ProjectCut] Projected B:', projB.toArray());

  // Check intersection with each edge
  const edgeIntersections: EdgeIntersection[] = [];

  // Sprint Y: Quad mode - use only exterior edges (filter out diagonal)
  let edges;
  if (quadMode) {
    const quadPairIndex = findQuadPair(faceIndex, geometry);

    if (quadPairIndex !== null) {
      console.log(`[ProjectCut] Quad mode: Testing 4 exterior edges (face ${faceIndex} + ${quadPairIndex})`);
      edges = getQuadExteriorEdges(faceIndex, quadPairIndex, geometry, mesh);
    } else {
      console.log('[ProjectCut] No quad pair found, falling back to triangle edges');
      edges = [
        { start: v0World, end: v1World, startIdx: v0Idx, endIdx: v1Idx, index: 0 },
        { start: v1World, end: v2World, startIdx: v1Idx, endIdx: v2Idx, index: 1 },
        { start: v2World, end: v0World, startIdx: v2Idx, endIdx: v0Idx, index: 2 },
      ];
    }
  } else {
    // Triangle mode - use 3 edges of single triangle
    edges = [
      { start: v0World, end: v1World, startIdx: v0Idx, endIdx: v1Idx, index: 0 },
      { start: v1World, end: v2World, startIdx: v1Idx, endIdx: v2Idx, index: 1 },
      { start: v2World, end: v0World, startIdx: v2Idx, endIdx: v0Idx, index: 2 },
    ];
  }

  edges.forEach(edge => {
    console.log(`[ProjectCut] Testing edge ${edge.index}: ${edge.start.toArray()} -> ${edge.end.toArray()}`);

    const intersection = lineSegmentIntersection(
      projA,
      projB,
      edge.start,
      edge.end
    );

    if (intersection) {
      const t = getPointParameterOnLine(intersection, edge.start, edge.end);
      console.log(`[ProjectCut] ✓ Edge ${edge.index} INTERSECTS at t=${t.toFixed(3)}, point:`, intersection.toArray());

      edgeIntersections.push({
        point: intersection.clone(),
        edgeIndex: edge.index,
        t,
      });
    } else {
      console.log(`[ProjectCut] ✗ Edge ${edge.index} no intersection`);
    }
  });

  console.log(`[ProjectCut] Found ${edgeIntersections.length} edge intersections`);
  return edgeIntersections;
}
