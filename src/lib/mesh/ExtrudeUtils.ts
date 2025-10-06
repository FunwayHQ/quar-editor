/**
 * Extrude Utilities
 *
 * Creates 3D meshes by extruding 2D curves.
 */

import * as THREE from 'three';
import { ExtrudeOptions } from '../../stores/meshOperationsStore';
import { Curve } from '../../stores/curveStore';
import { pointsToShape } from '../curves/CurveUtils';

/**
 * Extrude a curve into a 3D mesh
 */
export function extrudeCurve(
  curve: Curve,
  options: ExtrudeOptions
): THREE.Mesh {
  // Convert curve points to Three.js Shape
  const shape = pointsToShape(curve.points, curve.closed);

  // Configure extrude settings
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: options.depth,
    bevelEnabled: options.bevelEnabled,
    bevelThickness: options.bevelThickness,
    bevelSize: options.bevelSize,
    bevelOffset: options.bevelOffset,
    bevelSegments: options.bevelSegments,
    steps: options.steps,
    curveSegments: options.curveSegments
  };

  // Create extruded geometry
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Rotate to align with grid
  // ExtrudeGeometry extrudes along Z+, we want to extrude along Y+
  // Rotate 90 degrees around X axis (not -90)
  geometry.rotateX(Math.PI / 2);

  // Compute normals for smooth shading
  geometry.computeVertexNormals();

  // Create mesh with default material
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
 * Generate name for extruded object
 */
export function generateExtrudeName(curveName: string): string {
  return `${curveName}_extruded`;
}
