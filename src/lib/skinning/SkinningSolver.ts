/**
 * Skinning Solver
 *
 * Computes mesh deformation based on bone transforms and vertex weights.
 * Epic 7: Skeletal Mesh Deformation
 */

import * as THREE from 'three';
import { SceneObject, BonePose, SkinData } from '../../stores/objectsStore';

export interface BoneMatrices {
  boneId: string;
  worldMatrix: THREE.Matrix4;
  skinningMatrix: THREE.Matrix4;
}

/**
 * Compute bone world matrices from pose transforms
 */
export function computeBoneMatrices(
  bones: SceneObject[],
  boneMap: Map<string, SceneObject>,
  poses: Map<string, BonePose>
): Map<string, BoneMatrices> {
  const matrices = new Map<string, BoneMatrices>();

  // Helper to get bone world matrix recursively
  const computeWorldMatrix = (bone: SceneObject, parentMatrix?: THREE.Matrix4): THREE.Matrix4 => {
    // Get pose transform if available, otherwise use rest pose
    const pose = poses.get(bone.id);

    // Create local transform matrix
    const localMatrix = new THREE.Matrix4();

    if (pose) {
      // Use pose transform
      const position = new THREE.Vector3(...pose.position);
      const rotation = new THREE.Quaternion(...pose.rotation);
      const scale = new THREE.Vector3(...pose.scale);
      localMatrix.compose(position, rotation, scale);
    } else {
      // Use rest pose (from bone properties)
      if (bone.boneProps) {
        const position = new THREE.Vector3(...bone.boneProps.headPosition);
        const rotation = new THREE.Quaternion(0, 0, 0, 1); // Identity
        const scale = new THREE.Vector3(1, 1, 1);
        localMatrix.compose(position, rotation, scale);
      } else {
        // Fallback to object transform
        const position = new THREE.Vector3(...bone.position);
        const rotation = new THREE.Euler(...bone.rotation);
        const quaternion = new THREE.Quaternion().setFromEuler(rotation);
        const scale = new THREE.Vector3(...bone.scale);
        localMatrix.compose(position, quaternion, scale);
      }
    }

    // Compute world matrix by multiplying with parent
    const worldMatrix = parentMatrix
      ? parentMatrix.clone().multiply(localMatrix)
      : localMatrix.clone();

    return worldMatrix;
  };

  // Compute matrices for all bones
  const computeMatricesRecursive = (bone: SceneObject, parentMatrix?: THREE.Matrix4) => {
    const worldMatrix = computeWorldMatrix(bone, parentMatrix);

    matrices.set(bone.id, {
      boneId: bone.id,
      worldMatrix,
      skinningMatrix: new THREE.Matrix4(), // Will be computed later with bind matrix
    });

    // Process children
    bone.children.forEach(childId => {
      const child = boneMap.get(childId);
      if (child && child.type === 'bone') {
        computeMatricesRecursive(child, worldMatrix);
      }
    });
  };

  // Start from root bones (bones with no parent or parent is armature)
  bones.forEach(bone => {
    const parent = bone.parentId ? boneMap.get(bone.parentId) : null;
    if (!parent || parent.type === 'armature') {
      computeMatricesRecursive(bone);
    }
  });

  return matrices;
}

/**
 * Compute skinning matrices (bone matrix * inverse bind matrix)
 */
export function computeSkinningMatrices(
  boneMatrices: Map<string, BoneMatrices>,
  skinData: SkinData
): Map<string, THREE.Matrix4> {
  const skinningMatrices = new Map<string, THREE.Matrix4>();

  boneMatrices.forEach((matrices, boneId) => {
    // Get inverse bind matrix for this bone
    const bindPose = skinData.bindPose?.get(boneId);

    if (bindPose) {
      // Create inverse bind matrix from bind pose
      const position = new THREE.Vector3(...bindPose.position);
      const rotation = new THREE.Quaternion(...bindPose.rotation);
      const scale = new THREE.Vector3(...bindPose.scale);

      const bindMatrix = new THREE.Matrix4();
      bindMatrix.compose(position, rotation, scale);

      const inverseBindMatrix = bindMatrix.clone().invert();

      // Skinning matrix = bone world matrix * inverse bind matrix
      const skinningMatrix = matrices.worldMatrix.clone().multiply(inverseBindMatrix);

      skinningMatrices.set(boneId, skinningMatrix);
      matrices.skinningMatrix = skinningMatrix;
    } else {
      // No bind pose, use identity (no skinning)
      skinningMatrices.set(boneId, new THREE.Matrix4());
    }
  });

  return skinningMatrices;
}

/**
 * Apply skinning to mesh vertices
 */
export function applyVertexSkinning(
  originalVertices: Float32Array,
  skinData: SkinData,
  skinningMatrices: Map<string, THREE.Matrix4>
): Float32Array {
  const vertexCount = originalVertices.length / 3;
  const deformedVertices = new Float32Array(originalVertices.length);

  // Process each vertex
  for (let i = 0; i < vertexCount; i++) {
    const influences = skinData.weights.get(i) || [];

    if (influences.length === 0) {
      // No influences, copy original position
      deformedVertices[i * 3 + 0] = originalVertices[i * 3 + 0];
      deformedVertices[i * 3 + 1] = originalVertices[i * 3 + 1];
      deformedVertices[i * 3 + 2] = originalVertices[i * 3 + 2];
      continue;
    }

    // Get original vertex position
    const originalPos = new THREE.Vector3(
      originalVertices[i * 3 + 0],
      originalVertices[i * 3 + 1],
      originalVertices[i * 3 + 2]
    );

    // Accumulate skinned position from all influences
    const skinnedPos = new THREE.Vector3(0, 0, 0);

    influences.forEach(influence => {
      const skinningMatrix = skinningMatrices.get(influence.boneId);

      if (skinningMatrix) {
        // Transform vertex by skinning matrix and accumulate with weight
        const transformedPos = originalPos.clone().applyMatrix4(skinningMatrix);
        skinnedPos.add(transformedPos.multiplyScalar(influence.weight));
      }
    });

    // Write skinned position
    deformedVertices[i * 3 + 0] = skinnedPos.x;
    deformedVertices[i * 3 + 1] = skinnedPos.y;
    deformedVertices[i * 3 + 2] = skinnedPos.z;
  }

  return deformedVertices;
}

/**
 * Compute deformed mesh given bones, poses, and skin data
 */
export function computeSkinnedMesh(
  mesh: SceneObject,
  bones: SceneObject[],
  boneMap: Map<string, SceneObject>,
  poses: Map<string, BonePose>
): Float32Array | null {
  if (!mesh.skinData || !mesh.importedGeometry) {
    return null;
  }

  // 1. Compute bone world matrices from poses
  const boneMatrices = computeBoneMatrices(bones, boneMap, poses);

  // 2. Compute skinning matrices
  const skinningMatrices = computeSkinningMatrices(boneMatrices, mesh.skinData);

  // 3. Apply skinning to vertices
  const originalVertices = new Float32Array(mesh.importedGeometry.vertices);
  const deformedVertices = applyVertexSkinning(originalVertices, mesh.skinData, skinningMatrices);

  return deformedVertices;
}
