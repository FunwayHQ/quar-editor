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
    console.log('[BooleanOps] Performing union...', {
      meshAVertices: meshA.geometry.attributes.position.count,
      meshBVertices: meshB.geometry.attributes.position.count
    });

    const result = CSG.union(meshA, meshB);

    console.log('[BooleanOps] CSG union result:', {
      vertices: result.geometry.attributes.position.count,
      hasIndex: !!result.geometry.index,
      indexCount: result.geometry.index?.count
    });

    // Ensure geometry is indexed
    if (!result.geometry.index) {
      console.log('[BooleanOps] Converting non-indexed geometry to indexed');
      const positions = result.geometry.attributes.position;
      const indices: number[] = [];
      for (let i = 0; i < positions.count; i++) {
        indices.push(i);
      }
      result.geometry.setIndex(indices);
    }

    // Ensure geometry has proper attributes
    if (!result.geometry.attributes.normal) {
      result.geometry.computeVertexNormals();
    }

    // Clean up geometry - remove degenerate triangles
    const beforeClean = {
      vertices: result.geometry.attributes.position.count,
      triangles: result.geometry.index!.count / 3
    };

    result.geometry = cleanGeometry(result.geometry);

    console.log('[BooleanOps] After cleaning:', {
      before: beforeClean,
      after: {
        vertices: result.geometry.attributes.position.count,
        triangles: result.geometry.index!.count / 3
      }
    });

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

    // Ensure geometry is indexed
    if (!result.geometry.index) {
      console.log('[BooleanOps] Converting non-indexed geometry to indexed');
      const positions = result.geometry.attributes.position;
      const indices: number[] = [];
      for (let i = 0; i < positions.count; i++) {
        indices.push(i);
      }
      result.geometry.setIndex(indices);
    }

    if (!result.geometry.attributes.normal) {
      result.geometry.computeVertexNormals();
    }

    // Clean up geometry
    result.geometry = cleanGeometry(result.geometry);

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

    // Ensure geometry is indexed
    if (!result.geometry.index) {
      console.log('[BooleanOps] Converting non-indexed geometry to indexed');
      const positions = result.geometry.attributes.position;
      const indices: number[] = [];
      for (let i = 0; i < positions.count; i++) {
        indices.push(i);
      }
      result.geometry.setIndex(indices);
    }

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

    // Clean up geometry
    result.geometry = cleanGeometry(result.geometry);

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

/**
 * Clean geometry - remove degenerate triangles and rebuild with only used vertices
 */
function cleanGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const uvs = geometry.attributes.uv;
  const index = geometry.index;

  if (!index || !positions) {
    return geometry;
  }

  const epsilon = 0.000001;
  const newPositions: number[] = [];
  const newNormals: number[] = [];
  const newUVs: number[] = [];
  const newIndices: number[] = [];
  const vertexMap = new Map<string, number>(); // old vertex key -> new index

  // Helper to get vertex key
  const getVertexKey = (idx: number): string => {
    return `${positions.getX(idx)}_${positions.getY(idx)}_${positions.getZ(idx)}`;
  };

  // Process each triangle
  for (let i = 0; i < index.count; i += 3) {
    const i0 = index.getX(i);
    const i1 = index.getX(i + 1);
    const i2 = index.getX(i + 2);

    // Get vertices
    const v0 = new THREE.Vector3(
      positions.getX(i0),
      positions.getY(i0),
      positions.getZ(i0)
    );
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

    // Check if triangle is degenerate (area too small)
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const cross = new THREE.Vector3().crossVectors(edge1, edge2);
    const area = cross.length() / 2;

    // Only keep non-degenerate triangles
    if (area > epsilon) {
      // Add vertices and get new indices
      const newI0 = addVertex(i0);
      const newI1 = addVertex(i1);
      const newI2 = addVertex(i2);

      newIndices.push(newI0, newI1, newI2);
    }
  }

  function addVertex(oldIdx: number): number {
    const key = getVertexKey(oldIdx);
    let newIdx = vertexMap.get(key);

    if (newIdx === undefined) {
      newIdx = newPositions.length / 3;
      vertexMap.set(key, newIdx);

      // Add position
      newPositions.push(
        positions.getX(oldIdx),
        positions.getY(oldIdx),
        positions.getZ(oldIdx)
      );

      // Add normal if exists
      if (normals) {
        newNormals.push(
          normals.getX(oldIdx),
          normals.getY(oldIdx),
          normals.getZ(oldIdx)
        );
      }

      // Add UV if exists
      if (uvs) {
        newUVs.push(
          uvs.getX(oldIdx),
          uvs.getY(oldIdx)
        );
      }
    }

    return newIdx;
  }

  // Create new geometry with cleaned data
  const cleanedGeometry = new THREE.BufferGeometry();
  cleanedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));

  if (newNormals.length > 0) {
    cleanedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
  } else {
    cleanedGeometry.computeVertexNormals();
  }

  if (newUVs.length > 0) {
    cleanedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUVs, 2));
  }

  cleanedGeometry.setIndex(newIndices);

  const removedTriangles = (index.count - newIndices.length) / 3;
  const removedVertices = positions.count - (newPositions.length / 3);

  if (removedTriangles > 0 || removedVertices > 0) {
    console.log(`[BooleanOps] Cleaned geometry: removed ${removedTriangles} triangles, ${removedVertices} unused vertices`);
  }

  // Compute bounding box and sphere (CRITICAL for rendering!)
  cleanedGeometry.computeBoundingBox();
  cleanedGeometry.computeBoundingSphere();

  return cleanedGeometry;
}
