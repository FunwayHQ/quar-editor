/**
 * Skeleton Importer
 *
 * Handles conversion of THREE.js Skeleton/Bone structures to BoneStore format.
 * Extracts bone hierarchy, skinning weights, and bind matrices from GLTF/GLB files.
 */

import * as THREE from 'three';
import { useBoneStore } from '../../stores/boneStore';
import { useObjectsStore, BonePose } from '../../stores/objectsStore';
import { useAnimationStore, Animation, AnimationTrack, Keyframe, InterpolationType } from '../../stores/animationStore';

export interface BoneImportResult {
  armatureId: string;
  boneIdMap: Map<THREE.Bone, string>;  // Maps THREE.Bone to our bone IDs
  rootBoneId: string;
}

export interface SkinnedMeshImportResult {
  meshId: string;
  skeleton: THREE.Skeleton;
  skinIndex: THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
  skinWeight: THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
}

export class SkeletonImporter {
  /**
   * Import a THREE.js Skeleton and create corresponding armature and bones
   */
  static importSkeleton(
    skeleton: THREE.Skeleton,
    name: string = 'Armature'
  ): BoneImportResult {
    const boneStore = useBoneStore.getState();
    const objectsStore = useObjectsStore.getState();

    console.log('[SkeletonImporter] Importing skeleton with', skeleton.bones.length, 'bones');

    // Calculate armature position (average of all bone positions)
    const avgPosition: [number, number, number] = [0, 0, 0];
    skeleton.bones.forEach(bone => {
      bone.updateWorldMatrix(false, false);
      const worldPos = new THREE.Vector3();
      bone.getWorldPosition(worldPos);
      avgPosition[0] += worldPos.x;
      avgPosition[1] += worldPos.y;
      avgPosition[2] += worldPos.z;
    });
    avgPosition[0] /= skeleton.bones.length;
    avgPosition[1] /= skeleton.bones.length;
    avgPosition[2] /= skeleton.bones.length;

    // Create armature
    const armatureId = boneStore.createArmature(name, avgPosition);
    console.log('[SkeletonImporter] Created armature:', armatureId);

    // Map THREE.Bone to our bone IDs
    const boneIdMap = new Map<THREE.Bone, string>();

    // PASS 1: Create all bones
    skeleton.bones.forEach(threeBone => {
      threeBone.updateMatrix();
      threeBone.updateMatrixWorld(false);

      // Get bone world position
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      threeBone.matrixWorld.decompose(worldPos, worldQuat, worldScale);

      // Calculate tail position (1 unit down in local Y axis)
      const localTailOffset = new THREE.Vector3(0, 1, 0);
      localTailOffset.applyQuaternion(worldQuat);

      const tailPos = worldPos.clone().add(localTailOffset);

      const headPosition: [number, number, number] = [
        worldPos.x,
        worldPos.y,
        worldPos.z,
      ];

      const tailPosition: [number, number, number] = [
        tailPos.x,
        tailPos.y,
        tailPos.z,
      ];

      // Create bone (parent will be set in pass 2)
      const boneId = boneStore.createBoneWithHeadTail(
        armatureId,  // Temporarily parent to armature
        headPosition,
        tailPosition
      );

      // Update bone name
      objectsStore.updateObject(boneId, {
        name: threeBone.name || `Bone${skeleton.bones.indexOf(threeBone)}`,
      });

      boneIdMap.set(threeBone, boneId);
      console.log('[SkeletonImporter] Created bone:', threeBone.name, boneId);
    });

    // PASS 2: Set up parent-child relationships
    skeleton.bones.forEach(threeBone => {
      const boneId = boneIdMap.get(threeBone);
      if (!boneId) return;

      // Check if bone has a parent in the skeleton
      if (threeBone.parent && threeBone.parent instanceof THREE.Bone) {
        const parentId = boneIdMap.get(threeBone.parent);
        if (parentId) {
          // Re-parent bone to its actual parent
          objectsStore.setParent(boneId, parentId);
          console.log('[SkeletonImporter] Set bone parent:', threeBone.name, '->', threeBone.parent.name);
        }
      }
    });

    // Get root bone (first bone with no parent, or first bone in array)
    const rootThreeBone = skeleton.bones.find(bone =>
      !bone.parent || !(bone.parent instanceof THREE.Bone)
    ) || skeleton.bones[0];

    const rootBoneId = boneIdMap.get(rootThreeBone)!;

    console.log('[SkeletonImporter] Skeleton import complete. Root bone:', rootBoneId);

    return {
      armatureId,
      boneIdMap,
      rootBoneId,
    };
  }

  /**
   * Import skinning data from a SkinnedMesh
   */
  static importSkinning(
    meshId: string,
    skinnedMesh: THREE.SkinnedMesh,
    boneIdMap: Map<THREE.Bone, string>,
    armatureId: string
  ): void {
    const boneStore = useBoneStore.getState();
    const objectsStore = useObjectsStore.getState();

    console.log('[SkeletonImporter] Importing skinning data for mesh:', meshId);

    if (!skinnedMesh.skeleton || !skinnedMesh.geometry) {
      console.warn('[SkeletonImporter] SkinnedMesh has no skeleton or geometry');
      return;
    }

    // Bind mesh to armature
    boneStore.bindMeshToArmature(meshId, armatureId);

    // Extract skinning attributes
    const geometry = skinnedMesh.geometry;
    const skinIndexAttr = geometry.getAttribute('skinIndex');
    const skinWeightAttr = geometry.getAttribute('skinWeight');

    if (!skinIndexAttr || !skinWeightAttr) {
      console.warn('[SkeletonImporter] No skinning attributes found');
      return;
    }

    const vertexCount = geometry.getAttribute('position').count;
    console.log('[SkeletonImporter] Processing', vertexCount, 'vertices');

    // Import weights for each vertex
    for (let vertexIdx = 0; vertexIdx < vertexCount; vertexIdx++) {
      const influences: Array<{ boneId: string; weight: number }> = [];

      // Each vertex can be influenced by up to 4 bones (typical GLTF setup)
      // skinIndex and skinWeight are Vector4 attributes (4 components per vertex)
      for (let i = 0; i < 4; i++) {
        let boneIndex: number;
        let weight: number;

        // Read the i-th component (X=0, Y=1, Z=2, W=3)
        if (i === 0) {
          boneIndex = skinIndexAttr.getX(vertexIdx);
          weight = skinWeightAttr.getX(vertexIdx);
        } else if (i === 1) {
          boneIndex = skinIndexAttr.getY(vertexIdx);
          weight = skinWeightAttr.getY(vertexIdx);
        } else if (i === 2) {
          boneIndex = skinIndexAttr.getZ(vertexIdx);
          weight = skinWeightAttr.getZ(vertexIdx);
        } else {
          boneIndex = skinIndexAttr.getW(vertexIdx);
          weight = skinWeightAttr.getW(vertexIdx);
        }

        if (weight > 0.001) {  // Ignore negligible weights
          if (boneIndex >= 0 && boneIndex < skinnedMesh.skeleton.bones.length) {
            const threeBone = skinnedMesh.skeleton.bones[boneIndex];
            const boneId = boneIdMap.get(threeBone);

            if (boneId) {
              influences.push({ boneId, weight });
            }
          }
        }
      }

      // Set vertex weights if any influences found
      if (influences.length > 0) {
        boneStore.setVertexWeights(meshId, vertexIdx, influences);
      }
    }

    // Extract bind pose (rest pose) from skeleton
    const bindPose = new Map<string, BonePose>();
    skinnedMesh.skeleton.bones.forEach((threeBone, index) => {
      const boneId = boneIdMap.get(threeBone);
      if (!boneId) return;

      // Get bind matrix (inverse bind matrix)
      const bindMatrix = skinnedMesh.skeleton.boneInverses[index];
      const inverseBindMatrix = bindMatrix.clone().invert();

      // Decompose to get position, rotation, scale
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      inverseBindMatrix.decompose(position, quaternion, scale);

      bindPose.set(boneId, {
        position: [position.x, position.y, position.z],
        rotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
        scale: [scale.x, scale.y, scale.z],
      });
    });

    // Store bind pose and bind matrix
    const mesh = objectsStore.objects.get(meshId);
    if (mesh?.skinData) {
      objectsStore.updateObject(meshId, {
        skinData: {
          ...mesh.skinData,
          bindPose,
          bindMatrix: Array.from(skinnedMesh.bindMatrix.elements),
        },
      });
    }

    // Normalize weights to ensure they sum to 1.0
    boneStore.normalizeWeights(meshId);

    console.log('[SkeletonImporter] Skinning import complete for mesh:', meshId);
  }

  /**
   * Helper: Check if a THREE.Object3D is a SkinnedMesh with bones
   */
  static isSkinnedMesh(object: THREE.Object3D): object is THREE.SkinnedMesh {
    return (
      object instanceof THREE.SkinnedMesh &&
      object.skeleton !== undefined &&
      object.skeleton.bones.length > 0
    );
  }

  /**
   * Helper: Find all SkinnedMesh objects in a scene
   */
  static findSkinnedMeshes(root: THREE.Object3D): THREE.SkinnedMesh[] {
    const skinnedMeshes: THREE.SkinnedMesh[] = [];

    root.traverse((child) => {
      if (this.isSkinnedMesh(child)) {
        skinnedMeshes.push(child);
      }
    });

    return skinnedMeshes;
  }

  /**
   * Helper: Find skeleton root in hierarchy
   */
  static findSkeletonRoot(bones: THREE.Bone[]): THREE.Bone | null {
    if (bones.length === 0) return null;

    // Find the bone with no parent (or parent that's not a bone)
    const rootBone = bones.find(bone =>
      !bone.parent || !(bone.parent instanceof THREE.Bone)
    );

    return rootBone || bones[0];
  }

  /**
   * Import animations from THREE.js AnimationClips
   * Converts GLTF/GLB animations to our Animation format
   */
  static importAnimations(
    clips: THREE.AnimationClip[],
    boneIdMap: Map<THREE.Bone, string>,
    skeleton: THREE.Skeleton
  ): Animation[] {
    const importedAnimations: Animation[] = [];

    console.log('[SkeletonImporter] Importing', clips.length, 'animation clips');

    // Create a map from bone name to bone ID for faster lookups
    const boneNameToId = new Map<string, string>();
    skeleton.bones.forEach(threeBone => {
      const boneId = boneIdMap.get(threeBone);
      if (boneId && threeBone.name) {
        boneNameToId.set(threeBone.name, boneId);
      }
    });

    clips.forEach(clip => {
      console.log('[SkeletonImporter] Processing animation:', clip.name, 'duration:', clip.duration);

      // Build tracks array locally
      const tracks: AnimationTrack[] = [];

      // Process each track in the clip
      clip.tracks.forEach(track => {
        // Parse track name to extract bone name and property
        // Track names are typically in format: ".bones[BoneName].position" or "BoneName.quaternion"
        const trackName = track.name;
        let boneName: string | null = null;
        let propertyType: 'position' | 'rotation' | 'scale' | null = null;

        // Try to extract bone name from various formats
        const bonesMatch = trackName.match(/\.bones\[([^\]]+)\]\.(\w+)/);
        const directMatch = trackName.match(/([^.]+)\.(\w+)/);

        if (bonesMatch) {
          boneName = bonesMatch[1];
          const prop = bonesMatch[2];
          if (prop === 'position') propertyType = 'position';
          else if (prop === 'quaternion' || prop === 'rotation') propertyType = 'rotation';
          else if (prop === 'scale') propertyType = 'scale';
        } else if (directMatch) {
          boneName = directMatch[1];
          const prop = directMatch[2];
          if (prop === 'position') propertyType = 'position';
          else if (prop === 'quaternion' || prop === 'rotation') propertyType = 'rotation';
          else if (prop === 'scale') propertyType = 'scale';
        }

        if (!boneName || !propertyType) {
          console.warn('[SkeletonImporter] Could not parse track name:', trackName);
          return;
        }

        // Get bone ID from name
        const boneId = boneNameToId.get(boneName);
        if (!boneId) {
          console.warn('[SkeletonImporter] Could not find bone for track:', boneName);
          return;
        }

        // Determine interpolation type
        let interpolation: InterpolationType = 'linear';
        if (track.getInterpolation) {
          const threeInterpolation = track.getInterpolation();
          if (threeInterpolation === THREE.InterpolateDiscrete) {
            interpolation = 'step';
          } else if (threeInterpolation === THREE.InterpolateLinear) {
            interpolation = 'linear';
          }
          // THREE.InterpolateSmooth could map to 'bezier', but we'll use linear for now
        }

        // Extract keyframes from track
        const times = track.times;
        const values = track.values;
        const valueSize = track.getValueSize(); // 3 for position/scale, 4 for quaternion

        const keyframes: Keyframe[] = [];

        for (let i = 0; i < times.length; i++) {
          const time = times[i];
          const startIdx = i * valueSize;

          let value: any;
          if (propertyType === 'rotation' && valueSize === 4) {
            // Quaternion
            value = [
              values[startIdx],
              values[startIdx + 1],
              values[startIdx + 2],
              values[startIdx + 3],
            ];
          } else if (valueSize === 3) {
            // Vector3 (position or scale)
            value = [
              values[startIdx],
              values[startIdx + 1],
              values[startIdx + 2],
            ];
          } else {
            console.warn('[SkeletonImporter] Unexpected value size:', valueSize);
            continue;
          }

          const keyframe: Keyframe = {
            id: `kf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            time,
            value,
            interpolation,
            space: 'local', // GLTF animations are typically in local space
          };

          keyframes.push(keyframe);
        }

        // Create animation track
        const animTrack: AnimationTrack = {
          id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          objectId: boneId,
          property: 'boneTransform',
          propertyPath: ['boneTransform', propertyType],
          keyframes,
          enabled: true,
          boneId,
          transformType: propertyType,
          space: 'local',
        };

        tracks.push(animTrack);

        console.log('[SkeletonImporter] Created track for bone:', boneName, propertyType, 'with', keyframes.length, 'keyframes');
      });

      // Create animation object with all tracks
      const now = Date.now();
      const animation: Animation = {
        id: `anim_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name: clip.name || 'Imported Animation',
        duration: clip.duration,
        tracks,
        loop: false,
        enabled: true,
        createdAt: now,
        modifiedAt: now,
      };

      importedAnimations.push(animation);
      console.log('[SkeletonImporter] Imported animation:', animation.name, 'with', tracks.length, 'tracks');
    });

    return importedAnimations;
  }
}
