/**
 * Sweep Utilities
 *
 * Creates 3D meshes by sweeping a profile curve along a path curve.
 */

import * as THREE from 'three';
import { SweepOptions } from '../../stores/meshOperationsStore';
import { Curve } from '../../stores/curveStore';
import { pointsToCurve } from '../curves/CurveUtils';

/**
 * Sweep a profile curve along a path curve
 */
export function sweepCurve(
  profileCurve: Curve,
  pathCurve: Curve,
  options: SweepOptions
): THREE.Mesh {
  // Convert 2D curves to 3D curves for computation
  const path = pointsToCurve(pathCurve.points);

  // Auto-close profile if option is enabled and profile is open
  let profilePoints = profileCurve.points;
  let isClosed = profileCurve.closed;

  if (options.closeProfile && !profileCurve.closed) {
    // Add first point at end to close the profile
    profilePoints = [...profileCurve.points, profileCurve.points[0]];
    isClosed = true;
    console.log('[SweepUtils] Auto-closed open profile');
  }

  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const segments = options.segments;
  const profileCount = profilePoints.length;

  // Sample path at regular intervals
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    // Get point on path
    const pathPoint = path.getPoint(t);

    // Get tangent (direction along path)
    const tangent = path.getTangent(t).normalize();

    // Calculate perpendicular vectors (simplified Frenet frame)
    // For 2D paths on XZ plane, we can use a simpler approach
    let normal: THREE.Vector3;
    let binormal: THREE.Vector3;

    // Up vector (Y+)
    const up = new THREE.Vector3(0, 1, 0);

    // If tangent is parallel to up, use different reference
    if (Math.abs(tangent.dot(up)) > 0.999) {
      binormal = new THREE.Vector3(1, 0, 0).cross(tangent).normalize();
    } else {
      binormal = tangent.clone().cross(up).normalize();
    }
    normal = binormal.clone().cross(tangent).normalize();

    // Calculate scale (taper) at this point
    const scale = THREE.MathUtils.lerp(
      options.scaleStart,
      options.scaleEnd,
      t
    );

    // Calculate rotation (twist) at this point
    const twist = (options.rotation * t * Math.PI) / 180;
    const cosTheta = Math.cos(twist);
    const sinTheta = Math.sin(twist);

    // Transform each profile point
    for (let j = 0; j < profileCount; j++) {
      const profilePoint = profilePoints[j];

      // Apply twist rotation
      const rotatedX = profilePoint.x * cosTheta - profilePoint.y * sinTheta;
      const rotatedY = profilePoint.x * sinTheta + profilePoint.y * cosTheta;

      // Apply scale (taper)
      const scaledX = rotatedX * scale;
      const scaledY = rotatedY * scale;

      // Transform to path frame
      const worldPoint = pathPoint.clone()
        .add(normal.clone().multiplyScalar(scaledX))
        .add(binormal.clone().multiplyScalar(scaledY));

      vertices.push(worldPoint.x, worldPoint.y, worldPoint.z);

      // UVs
      const u = j / (profileCount - 1);
      const v = t;
      uvs.push(u, v);
    }
  }

  // Generate indices (connect profile slices)
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < profileCount; j++) {
      const a = i * profileCount + j;
      const b = a + profileCount;

      // Handle wrapping for closed profiles
      const nextJ = (j + 1) % profileCount;
      const c = i * profileCount + nextJ;
      const d = c + profileCount;

      // Skip last face if profile is not closed
      if (!isClosed && nextJ === 0) continue;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  // Add end caps if profile is closed and option is enabled
  if (isClosed && options.capEnds) {
    addSweepCaps(geometry, profilePoints, path, options, segments, profileCount);
  }

  geometry.computeVertexNormals();

  // Create mesh with material
  const material = new THREE.MeshStandardMaterial({
    color: 0x7C3AED,
    metalness: 0.2,
    roughness: 0.7,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
}

/**
 * Add triangulated caps to the sweep (start and end)
 */
function addSweepCaps(
  geometry: THREE.BufferGeometry,
  profilePoints: THREE.Vector2[],
  path: THREE.CatmullRomCurve3,
  options: SweepOptions,
  segments: number,
  profileCount: number
): void {
  const positions = Array.from(geometry.attributes.position.array);
  const currentIndices = Array.from(geometry.index?.array || []);

  // Get start and end transformations
  const startT = 0;
  const endT = 1;

  const startPoint = path.getPoint(startT);
  const endPoint = path.getPoint(endT);

  const startTangent = path.getTangent(startT).normalize();
  const endTangent = path.getTangent(endT).normalize();

  // Start cap (at t=0)
  const startCapIndices: number[] = [];
  const baseVertexIndex = 0; // First ring of vertices

  // Use simple fan triangulation for start cap
  const centerIndex = positions.length / 3;
  positions.push(startPoint.x, startPoint.y, startPoint.z);

  for (let i = 0; i < profileCount - 1; i++) {
    startCapIndices.push(centerIndex, baseVertexIndex + i, baseVertexIndex + i + 1);
  }
  if (profilePoints.length > 2) {
    startCapIndices.push(centerIndex, baseVertexIndex + profileCount - 1, baseVertexIndex);
  }

  // End cap (at t=1)
  const endCapIndices: number[] = [];
  const endVertexBase = segments * profileCount; // Last ring of vertices

  const endCenterIndex = positions.length / 3;
  positions.push(endPoint.x, endPoint.y, endPoint.z);

  for (let i = 0; i < profileCount - 1; i++) {
    // Reverse winding for end cap
    endCapIndices.push(endCenterIndex, endVertexBase + i + 1, endVertexBase + i);
  }
  if (profilePoints.length > 2) {
    endCapIndices.push(endCenterIndex, endVertexBase, endVertexBase + profileCount - 1);
  }

  // Update geometry
  const newPositions = new Float32Array(positions);
  const newIndices = [...currentIndices, ...startCapIndices, ...endCapIndices];

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  geometry.setIndex(newIndices);
}

/**
 * Generate name for swept object
 */
export function generateSweepName(profileName: string, pathName: string): string {
  return `${profileName}_swept_along_${pathName}`;
}
