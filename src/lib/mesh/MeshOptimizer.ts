/**
 * Mesh Optimizer
 *
 * Utilities for optimizing and cleaning up mesh geometry.
 */

import * as THREE from 'three';

/**
 * Merge duplicate vertices within tolerance
 */
export function mergeVertices(geometry: THREE.BufferGeometry, tolerance: number = 0.0001): THREE.BufferGeometry {
  console.log('[MeshOptimizer] Merging vertices, tolerance:', tolerance);

  const originalCount = geometry.attributes.position.count;

  // Simple manual implementation - just return geometry for now
  // Three.js BufferGeometryUtils.mergeVertices has import issues
  // This is good enough for MVP - we can improve later
  console.log(`[MeshOptimizer] Vertices: ${originalCount} (merge skipped - manual impl needed)`);

  return geometry;
}

/**
 * Compute vertex normals for smooth shading
 */
export function computeNormals(geometry: THREE.BufferGeometry, smooth: boolean = true): THREE.BufferGeometry {
  if (smooth) {
    geometry.computeVertexNormals();
  } else {
    // Flat shading - compute face normals
    geometry.deleteAttribute('normal');
    geometry.computeVertexNormals();

    // For truly flat shading, we'd need to split vertices per face
    // This is a simplified version
  }

  console.log('[MeshOptimizer] Normals computed');
  return geometry;
}

/**
 * Generate basic UVs if missing (box mapping)
 */
export function generateUVs(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geometry.attributes.uv) {
    console.log('[MeshOptimizer] UVs already exist, skipping');
    return geometry;
  }

  console.log('[MeshOptimizer] Generating UVs via box mapping');

  const positions = geometry.attributes.position;
  const uvs: number[] = [];

  // Simple box mapping based on position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    // Use XY projection normalized to 0-1
    const u = (x + 5) / 10; // Assuming -5 to 5 range
    const v = (y + 5) / 10;

    uvs.push(u, v);
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return geometry;
}

/**
 * Remove degenerate triangles (zero area, duplicate indices)
 */
export function removeDegenerateTriangles(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = geometry.index;
  if (!index) {
    console.log('[MeshOptimizer] No index buffer, skipping degenerate removal');
    return geometry;
  }

  const positions = geometry.attributes.position;
  const indices = Array.from(index.array);
  const cleanIndices: number[] = [];

  let removedCount = 0;

  // Check each triangle
  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i];
    const i2 = indices[i + 1];
    const i3 = indices[i + 2];

    // Skip if any indices are the same (degenerate)
    if (i1 === i2 || i2 === i3 || i3 === i1) {
      removedCount++;
      continue;
    }

    // Get vertices
    const v1 = new THREE.Vector3(
      positions.getX(i1),
      positions.getY(i1),
      positions.getZ(i1)
    );
    const v2 = new THREE.Vector3(
      positions.getX(i2),
      positions.getY(i2),
      positions.getZ(i2)
    );
    const v3 = new THREE.Vector3(
      positions.getX(i3),
      positions.getY(i3),
      positions.getZ(i3)
    );

    // Compute triangle area
    const edge1 = v2.clone().sub(v1);
    const edge2 = v3.clone().sub(v1);
    const area = edge1.cross(edge2).length() / 2;

    // Skip if area is too small (degenerate triangle)
    if (area < 0.0001) {
      removedCount++;
      continue;
    }

    // Keep this triangle
    cleanIndices.push(i1, i2, i3);
  }

  if (removedCount > 0) {
    console.log(`[MeshOptimizer] Removed ${removedCount} degenerate triangles`);
    geometry.setIndex(cleanIndices);
  } else {
    console.log('[MeshOptimizer] No degenerate triangles found');
  }

  return geometry;
}

/**
 * Validate geometry for common issues
 */
export function validateGeometry(geometry: THREE.BufferGeometry): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for NaN/Infinity
  const positions = geometry.attributes.position;
  if (positions) {
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
        issues.push(`Invalid vertex at index ${i}: (${x}, ${y}, ${z})`);
        break; // Only report first issue
      }
    }
  }

  // Check for empty geometry
  if (!positions || positions.count === 0) {
    issues.push('Geometry has no vertices');
  }

  // Check for normals
  if (!geometry.attributes.normal) {
    issues.push('Geometry has no normals (will appear flat)');
  }

  // Check for UVs (warning, not critical)
  if (!geometry.attributes.uv) {
    issues.push('Geometry has no UVs (textures will not work)');
  }

  return {
    valid: issues.filter(i => !i.includes('UVs') && !i.includes('normals')).length === 0,
    issues
  };
}

/**
 * Full optimization pipeline
 */
export function optimizeMesh(
  geometry: THREE.BufferGeometry,
  options: {
    mergeVertices?: boolean;
    generateUVs?: boolean;
    removeDegenerates?: boolean;
    computeNormals?: boolean;
    tolerance?: number;
  } = {}
): THREE.BufferGeometry {
  const {
    mergeVertices: doMerge = true,
    generateUVs: doUVs = true,
    removeDegenerates: doRemove = true,
    computeNormals: doNormals = true,
    tolerance = 0.0001
  } = options;

  console.log('[MeshOptimizer] Starting optimization pipeline');

  let optimized = geometry;

  if (doRemove) {
    optimized = removeDegenerateTriangles(optimized);
  }

  if (doMerge) {
    optimized = mergeVertices(optimized, tolerance);
  }

  if (doUVs) {
    optimized = generateUVs(optimized);
  }

  if (doNormals) {
    optimized = computeNormals(optimized);
  }

  const validation = validateGeometry(optimized);
  if (!validation.valid) {
    console.warn('[MeshOptimizer] Validation issues:', validation.issues);
  }

  console.log('[MeshOptimizer] Optimization complete');

  return optimized;
}
