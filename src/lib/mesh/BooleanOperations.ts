/**
 * Boolean Operations (CSG)
 *
 * Constructive Solid Geometry operations for meshes.
 */

import * as THREE from 'three';
import { CSG } from 'three-csg-ts';

export type BooleanOperation = 'union' | 'subtract' | 'intersect';

/**
 * Perform Union (A + B) - Combine two meshes
 */
export function performUnion(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  try {
    console.log('[BooleanOps] Performing union...');

    const result = CSG.union(meshA, meshB);

    // Ensure geometry has proper attributes
    if (!result.geometry.attributes.normal) {
      result.geometry.computeVertexNormals();
    }

    console.log('[BooleanOps] Union completed successfully');
    return result;
  } catch (error) {
    console.error('[BooleanOps] Union failed:', error);
    throw new Error(`Union operation failed: ${error}`);
  }
}

/**
 * Perform Subtract (A - B) - Remove B from A
 */
export function performSubtract(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  try {
    console.log('[BooleanOps] Performing subtract...');

    const result = CSG.subtract(meshA, meshB);

    if (!result.geometry.attributes.normal) {
      result.geometry.computeVertexNormals();
    }

    console.log('[BooleanOps] Subtract completed successfully');
    return result;
  } catch (error) {
    console.error('[BooleanOps] Subtract failed:', error);
    throw new Error(`Subtract operation failed: ${error}`);
  }
}

/**
 * Perform Intersect (A ∩ B) - Keep only overlapping volume
 */
export function performIntersect(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  try {
    console.log('[BooleanOps] Performing intersect...', {
      meshA: meshA.geometry.attributes.position.count,
      meshB: meshB.geometry.attributes.position.count
    });

    const result = CSG.intersect(meshA, meshB);

    console.log('[BooleanOps] Intersect result:', {
      vertices: result.geometry.attributes.position.count,
      hasNormals: !!result.geometry.attributes.normal
    });

    // Check if result is empty (no overlap)
    if (result.geometry.attributes.position.count === 0) {
      console.warn('[BooleanOps] Intersect produced empty geometry (meshes may not overlap)');
      throw new Error('No intersection found - meshes may not overlap');
    }

    if (!result.geometry.attributes.normal) {
      result.geometry.computeVertexNormals();
    }

    console.log('[BooleanOps] Intersect completed successfully');
    return result;
  } catch (error) {
    console.error('[BooleanOps] Intersect failed:', error);
    throw error;
  }
}

/**
 * Generate name for boolean result
 */
export function generateBooleanName(
  operation: BooleanOperation,
  nameA: string,
  nameB: string
): string {
  switch (operation) {
    case 'union':
      return `${nameA}_union_${nameB}`;
    case 'subtract':
      return `${nameA}_minus_${nameB}`;
    case 'intersect':
      return `${nameA}_intersect_${nameB}`;
    default:
      return `${nameA}_${operation}_${nameB}`;
  }
}

/**
 * Validate mesh is suitable for boolean operations
 */
export function validateMeshForBoolean(mesh: THREE.Mesh): {
  valid: boolean;
  reason?: string;
} {
  if (!mesh.geometry) {
    return { valid: false, reason: 'Mesh has no geometry' };
  }

  if (!(mesh.geometry instanceof THREE.BufferGeometry)) {
    return { valid: false, reason: 'Geometry must be BufferGeometry' };
  }

  const positions = mesh.geometry.attributes.position;
  if (!positions || positions.count === 0) {
    return { valid: false, reason: 'Geometry has no vertices' };
  }

  return { valid: true };
}
