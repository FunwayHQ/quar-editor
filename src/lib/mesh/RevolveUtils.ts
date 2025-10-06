/**
 * Revolve Utilities
 *
 * Creates 3D meshes by revolving 2D curves around an axis (lathe operation).
 */

import * as THREE from 'three';
import { RevolveOptions } from '../../stores/meshOperationsStore';
import { Curve } from '../../stores/curveStore';

/**
 * Revolve a curve around an axis to create a 3D mesh
 */
export function revolveCurve(
  curve: Curve,
  options: RevolveOptions
): THREE.Mesh {
  // Convert 2D points to array for LatheGeometry
  // Add offset to move curve away from axis
  const lathePoints = curve.points.map(p =>
    new THREE.Vector2(
      Math.abs(p.x) + options.offset, // Distance from axis (absolute value ensures positive)
      p.y
    )
  );

  // LatheGeometry expects points to be ordered from bottom to top
  // and positive X values (distance from axis)

  // Create lathe geometry
  const geometry = new THREE.LatheGeometry(
    lathePoints,
    options.segments,
    options.phiStart * Math.PI / 180, // Convert to radians
    options.angle * Math.PI / 180 // Convert to radians
  );

  // Rotate geometry based on selected axis
  // LatheGeometry revolves around Y axis by default
  if (options.axis === 'x') {
    // Revolve around X axis: rotate 90° around Z
    geometry.rotateZ(Math.PI / 2);
  } else if (options.axis === 'z') {
    // Revolve around Z axis: rotate 90° around X
    geometry.rotateX(Math.PI / 2);
  }
  // Y axis is default (no additional rotation needed)

  // Compute normals for smooth shading
  geometry.computeVertexNormals();

  // Create mesh with default material
  const material = new THREE.MeshStandardMaterial({
    color: 0x7C3AED,
    metalness: 0.3,
    roughness: 0.6,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
}

/**
 * Generate name for revolved object
 */
export function generateRevolveName(curveName: string): string {
  return `${curveName}_revolved`;
}
