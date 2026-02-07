/**
 * Loft Utilities
 *
 * Creates 3D meshes by interpolating (lofting) between multiple 2D curves.
 */

import * as THREE from 'three';
import earcut from 'earcut';
import { LoftOptions } from '../../stores/meshOperationsStore';
import { Curve } from '../../stores/curveStore';
import { resampleCurve, getCurveOrientation, reverseCurve } from '../curves/CurveUtils';

/**
 * Loft between multiple curves to create a 3D mesh
 */
export function loftCurves(
  curves: Curve[],
  options: LoftOptions
): THREE.Mesh {
  if (curves.length < 2) {
    throw new Error('Loft requires at least 2 curves');
  }

  // Step 1: Resample all curves to same point count
  const targetPointCount = 50;
  const resampledCurves = curves.map(curve =>
    resampleCurve(curve.points, targetPointCount)
  );

  // Step 2: Check and fix orientation (all should have same winding)
  const orientations = resampledCurves.map(points => getCurveOrientation(points));
  const referenceOrientation = orientations[0];

  const alignedCurves = resampledCurves.map((points, index) => {
    // If orientation differs from reference, reverse the curve
    const sameSign = (orientations[index] >= 0) === (referenceOrientation >= 0);
    return sameSign ? points : reverseCurve(points);
  });

  // Step 3: Create mesh geometry
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  // Spacing between curves along selected axis
  const spacing = 2.0 / (curves.length - 1); // Distribute across 2 units

  // Generate vertices
  for (let curveIdx = 0; curveIdx < alignedCurves.length; curveIdx++) {
    const curvePoints = alignedCurves[curveIdx];
    const axisValue = -1.0 + curveIdx * spacing; // Center along axis

    for (let pointIdx = 0; pointIdx < curvePoints.length; pointIdx++) {
      const point = curvePoints[pointIdx];

      // Position based on selected axis
      let x: number, y: number, z: number;

      if (options.axis === 'y') {
        // Default: loft along Y axis (vertical)
        x = point.x;
        y = axisValue;
        z = point.y;
      } else if (options.axis === 'x') {
        // Loft along X axis (horizontal left-right)
        x = axisValue;
        y = point.y;
        z = point.x;
      } else { // 'z'
        // Loft along Z axis (horizontal front-back)
        x = point.x;
        y = point.y;
        z = axisValue;
      }

      vertices.push(x, y, z);

      // UVs
      const u = pointIdx / (curvePoints.length - 1);
      const v = curveIdx / (curves.length - 1);
      uvs.push(u, v);
    }
  }

  // Generate face indices (connect curves with quads split into triangles)
  const pointsPerCurve = targetPointCount;
  for (let curveIdx = 0; curveIdx < curves.length - 1; curveIdx++) {
    for (let pointIdx = 0; pointIdx < pointsPerCurve - 1; pointIdx++) {
      const a = curveIdx * pointsPerCurve + pointIdx;
      const b = a + pointsPerCurve;
      const c = b + 1;
      const d = a + 1;

      // Two triangles per quad
      indices.push(a, b, d);
      indices.push(b, c, d);
    }

    // Close the loop if curves are closed
    if (curves[0].closed) {
      const a = curveIdx * pointsPerCurve + (pointsPerCurve - 1);
      const b = a + pointsPerCurve;
      const c = curveIdx * pointsPerCurve + pointsPerCurve;
      const d = curveIdx * pointsPerCurve;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Step 4: Add end caps if requested
  if (options.cap && curves[0].closed) {
    addLoftCaps(geometry, alignedCurves, spacing, options.axis || 'y');
  }

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
 * Add triangulated caps to the loft mesh (top and bottom)
 */
function addLoftCaps(
  geometry: THREE.BufferGeometry,
  curves: THREE.Vector2[][],
  spacing: number,
  axis: 'x' | 'y' | 'z'
): void {
  if (curves.length < 2) return;

  const firstCurve = curves[0];
  const lastCurve = curves[curves.length - 1];

  // Triangulate first curve (bottom cap)
  const bottomAxisValue = -1.0;
  const bottomCap = triangulateCurve(firstCurve, bottomAxisValue, axis, false);

  // Triangulate last curve (top cap)
  const topAxisValue = -1.0 + (curves.length - 1) * spacing;
  const topCap = triangulateCurve(lastCurve, topAxisValue, axis, true); // Reverse winding for top

  // Merge cap geometries with main geometry
  const positions = geometry.attributes.position.array;
  const indices = geometry.index?.array || [];

  const newPositions = new Float32Array([
    ...Array.from(positions),
    ...bottomCap.vertices,
    ...topCap.vertices
  ]);

  const positionOffset = positions.length / 3;
  const newIndices = [
    ...Array.from(indices),
    ...bottomCap.indices.map(i => i + positionOffset),
    ...topCap.indices.map(i => i + positionOffset + bottomCap.vertices.length / 3)
  ];

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  geometry.setIndex(newIndices);
  geometry.computeVertexNormals();
}

/**
 * Triangulate a 2D curve for end cap
 */
function triangulateCurve(
  points: THREE.Vector2[],
  axisValue: number,
  axis: 'x' | 'y' | 'z',
  reverseWinding: boolean = false
): { vertices: number[]; indices: number[] } {
  // Flatten points to earcut format [x, z, x, z, ...]
  const flatPoints: number[] = [];
  points.forEach(p => {
    flatPoints.push(p.x, p.y);
  });

  // Triangulate with earcut
  let triangles = earcut(flatPoints);

  // Reverse winding if needed (for top cap)
  if (reverseWinding) {
    const reversed: number[] = [];
    for (let i = 0; i < triangles.length; i += 3) {
      reversed.push(triangles[i + 2], triangles[i + 1], triangles[i]);
    }
    triangles = reversed;
  }

  // Convert to 3D vertices based on axis
  const vertices: number[] = [];
  points.forEach(p => {
    if (axis === 'y') {
      // Lofting along Y axis
      vertices.push(p.x, axisValue, p.y);
    } else if (axis === 'x') {
      // Lofting along X axis
      vertices.push(axisValue, p.y, p.x);
    } else { // 'z'
      // Lofting along Z axis
      vertices.push(p.x, p.y, axisValue);
    }
  });

  return { vertices, indices: triangles };
}

/**
 * Generate name for lofted object
 */
export function generateLoftName(curveNames: string[]): string {
  if (curveNames.length === 0) return 'lofted';
  if (curveNames.length === 1) return `${curveNames[0]}_lofted`;
  return `loft_${curveNames.length}_curves`;
}
