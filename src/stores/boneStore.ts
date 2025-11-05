/**
 * Bone Store
 *
 * Manages skeletal rigging, bone operations, pose mode, and skinning.
 * Sprint: Bones & Skeletal Animation
 */

import { create } from 'zustand';
import { useObjectsStore, SceneObject, BoneInfluence, BonePose, SkinWeights, SkinData } from './objectsStore';
import * as THREE from 'three';

// Auto-weighting methods
export type AutoWeightMethod = 'automatic' | 'envelope';

// IK constraint (Future)
export interface IKConstraint {
  id: string;
  boneId: string;
  targetId: string;
  chainLength: number;
  iterations: number;
  influence: number;
}

export interface BoneState {
  // Pose mode state
  isPoseMode: boolean;
  poseArmatureId: string | null;      // Which armature is being posed
  selectedBoneIds: Set<string>;       // Selected bones in pose mode

  // Weight paint mode state
  isWeightPaintMode: boolean;
  weightPaintMeshId: string | null;    // Which mesh is being weight painted
  weightPaintBoneId: string | null;    // Which bone we're painting weights for
  weightPaintBrushSize: number;        // Brush size in world units
  weightPaintBrushStrength: number;    // Brush strength (0-1)
  weightPaintMode: 'add' | 'subtract' | 'smooth' | 'average';  // Paint mode

  // Active bone (for transform controls)
  activeBoneId: string | null;

  // Pose mode operations
  enterPoseMode: (armatureId: string) => void;
  exitPoseMode: () => void;
  selectBone: (boneId: string, multiSelect?: boolean) => void;
  deselectBone: (boneId: string) => void;
  clearBoneSelection: () => void;
  setActiveBone: (boneId: string | null) => void;

  // Weight paint mode operations
  enterWeightPaintMode: (meshId: string) => void;
  exitWeightPaintMode: () => void;
  setWeightPaintBone: (boneId: string | null) => void;
  setWeightPaintBrushSize: (size: number) => void;
  setWeightPaintBrushStrength: (strength: number) => void;
  setWeightPaintMode: (mode: 'add' | 'subtract' | 'smooth' | 'average') => void;
  paintVertexWeight: (vertexIndex: number, weight: number) => void;

  // Bone creation and management
  createBone: (parentId: string | null, position: [number, number, number]) => string;
  createBoneWithHeadTail: (
    parentId: string | null,
    headPosition: [number, number, number],
    tailPosition: [number, number, number]
  ) => string;
  subdivideBone: (boneId: string, segments: number) => string[];
  deleteBone: (boneId: string, deleteChildren: boolean) => void;
  updateBoneTail: (boneId: string, tailPosition: [number, number, number]) => void;
  updateBoneRoll: (boneId: string, roll: number) => void;

  // Armature operations
  createArmature: (name: string, position: [number, number, number]) => string;
  deleteArmature: (armatureId: string) => void;
  setArmatureDisplayType: (armatureId: string, displayType: 'octahedral' | 'stick' | 'bbone' | 'envelope') => void;
  toggleArmatureXRay: (armatureId: string) => void;

  // Pose operations
  setPoseTransform: (boneId: string, transform: Partial<BonePose>) => void;
  resetPose: (boneId?: string) => void;
  applyPoseAsRest: () => void;
  copyPose: () => Map<string, BonePose>;
  pastePose: (pose: Map<string, BonePose>) => void;

  // Skinning operations
  bindMeshToArmature: (meshId: string, armatureId: string) => void;
  unbindMesh: (meshId: string) => void;
  setVertexWeights: (meshId: string, vertexIndex: number, influences: BoneInfluence[]) => void;
  autoWeight: (meshId: string, method: AutoWeightMethod) => void;
  normalizeWeights: (meshId: string) => void;
  smoothWeights: (meshId: string, vertexIndices: number[], iterations?: number) => void;

  // IK operations (Future)
  addIKConstraint?: (boneId: string, targetId: string, chainLength: number) => void;
  removeIKConstraint?: (boneId: string) => void;

  // Helper functions
  getBonesByArmature: (armatureId: string) => SceneObject[];
  getRootBone: (armatureId: string) => SceneObject | null;
  getBoneChain: (boneId: string) => string[];  // From root to this bone
  isBoneInArmature: (boneId: string, armatureId: string) => boolean;
}

// Helper to generate unique IDs
function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to calculate bone length
function calculateBoneLength(
  head: [number, number, number],
  tail: [number, number, number]
): number {
  const dx = tail[0] - head[0];
  const dy = tail[1] - head[1];
  const dz = tail[2] - head[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export const useBoneStore = create<BoneState>((set, get) => ({
  // Initial state
  isPoseMode: false,
  poseArmatureId: null,
  selectedBoneIds: new Set(),
  activeBoneId: null,

  // Weight paint mode initial state
  isWeightPaintMode: false,
  weightPaintMeshId: null,
  weightPaintBoneId: null,
  weightPaintBrushSize: 0.5,
  weightPaintBrushStrength: 0.5,
  weightPaintMode: 'add',

  // Pose mode operations
  enterPoseMode: (armatureId: string) => {
    console.log('[BoneStore] Entering pose mode for armature:', armatureId);
    set({
      isPoseMode: true,
      poseArmatureId: armatureId,
      selectedBoneIds: new Set(),
      activeBoneId: null,
    });
  },

  exitPoseMode: () => {
    console.log('[BoneStore] Exiting pose mode');
    set({
      isPoseMode: false,
      poseArmatureId: null,
      selectedBoneIds: new Set(),
      activeBoneId: null,
    });
  },

  selectBone: (boneId: string, multiSelect = false) => {
    const { selectedBoneIds } = get();

    if (multiSelect) {
      const newSelection = new Set(selectedBoneIds);
      newSelection.add(boneId);
      set({ selectedBoneIds: newSelection, activeBoneId: boneId });
    } else {
      set({ selectedBoneIds: new Set([boneId]), activeBoneId: boneId });
    }
  },

  deselectBone: (boneId: string) => {
    const { selectedBoneIds, activeBoneId } = get();
    const newSelection = new Set(selectedBoneIds);
    newSelection.delete(boneId);

    set({
      selectedBoneIds: newSelection,
      activeBoneId: activeBoneId === boneId ? null : activeBoneId,
    });
  },

  clearBoneSelection: () => {
    set({ selectedBoneIds: new Set(), activeBoneId: null });
  },

  setActiveBone: (boneId: string | null) => {
    set({ activeBoneId: boneId });
  },

  // Weight paint mode operations
  enterWeightPaintMode: (meshId: string) => {
    console.log('[BoneStore] Entering weight paint mode for mesh:', meshId);

    const objectsStore = useObjectsStore.getState();
    const mesh = objectsStore.objects.get(meshId);

    if (!mesh || !mesh.skinData) {
      console.error('[BoneStore] Cannot enter weight paint mode: mesh not skinned');
      return;
    }

    set({
      isWeightPaintMode: true,
      weightPaintMeshId: meshId,
      weightPaintBoneId: null,
      // Exit pose mode if active
      isPoseMode: false,
      poseArmatureId: null,
    });
  },

  exitWeightPaintMode: () => {
    console.log('[BoneStore] Exiting weight paint mode');
    set({
      isWeightPaintMode: false,
      weightPaintMeshId: null,
      weightPaintBoneId: null,
    });
  },

  setWeightPaintBone: (boneId: string | null) => {
    set({ weightPaintBoneId: boneId });
  },

  setWeightPaintBrushSize: (size: number) => {
    set({ weightPaintBrushSize: Math.max(0.1, Math.min(size, 10)) });
  },

  setWeightPaintBrushStrength: (strength: number) => {
    set({ weightPaintBrushStrength: Math.max(0, Math.min(strength, 1)) });
  },

  setWeightPaintMode: (mode: 'add' | 'subtract' | 'smooth' | 'average') => {
    set({ weightPaintMode: mode });
  },

  paintVertexWeight: (vertexIndex: number, weight: number) => {
    const state = get();
    const { weightPaintMeshId, weightPaintBoneId, weightPaintMode, weightPaintBrushStrength } = state;

    if (!weightPaintMeshId || !weightPaintBoneId) {
      console.warn('[BoneStore] Cannot paint: no mesh or bone selected');
      return;
    }

    const objectsStore = useObjectsStore.getState();
    const mesh = objectsStore.objects.get(weightPaintMeshId);

    if (!mesh || !mesh.skinData) return;

    // Get current weights for this vertex
    const currentWeights = mesh.skinData.weights.get(vertexIndex) || [];
    const boneInfluences = new Map<string, number>();

    // Build map of current influences
    currentWeights.forEach(influence => {
      boneInfluences.set(influence.boneId, influence.weight);
    });

    // Apply paint based on mode
    const currentWeight = boneInfluences.get(weightPaintBoneId) || 0;
    let newWeight = currentWeight;

    switch (weightPaintMode) {
      case 'add':
        newWeight = Math.min(1, currentWeight + weight * weightPaintBrushStrength);
        break;
      case 'subtract':
        newWeight = Math.max(0, currentWeight - weight * weightPaintBrushStrength);
        break;
      case 'smooth':
        // Smooth will be handled separately with neighbor averaging
        newWeight = currentWeight;
        break;
      case 'average':
        // Average towards target weight
        newWeight = currentWeight + (weight - currentWeight) * weightPaintBrushStrength;
        break;
    }

    // Update the bone's weight
    boneInfluences.set(weightPaintBoneId, newWeight);

    // Convert back to array and normalize
    const newInfluences: BoneInfluence[] = Array.from(boneInfluences.entries())
      .filter(([_, w]) => w > 0.001)  // Remove negligible weights
      .map(([boneId, w]) => ({ boneId, weight: w }));

    // Normalize weights to sum to 1.0
    const totalWeight = newInfluences.reduce((sum, inf) => sum + inf.weight, 0);
    if (totalWeight > 0) {
      newInfluences.forEach(inf => {
        inf.weight /= totalWeight;
      });
    }

    // Update vertex weights
    state.setVertexWeights(weightPaintMeshId, vertexIndex, newInfluences);
  },

  // Bone creation
  createBone: (parentId: string | null, position: [number, number, number]) => {
    const objectsStore = useObjectsStore.getState();
    const boneId = generateId();

    // Default tail position is 1 unit above head
    const tailPosition: [number, number, number] = [
      position[0],
      position[1] + 1,
      position[2],
    ];

    const bone: SceneObject = {
      id: boneId,
      name: objectsStore.generateName('bone'),
      type: 'bone',
      visible: true,
      locked: false,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId,
      children: [],
      boneProps: {
        headPosition: position,
        tailPosition,
        roll: 0,
        length: calculateBoneLength(position, tailPosition),
        connected: false,
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    objectsStore.addObject(bone);

    // Set parent if provided
    if (parentId) {
      objectsStore.setParent(boneId, parentId);

      // If parent is an armature without a root bone, set this as root
      const parent = objectsStore.objects.get(parentId);
      if (parent?.type === 'armature' && parent.armatureProps?.rootBoneId === null) {
        objectsStore.updateObject(parentId, {
          armatureProps: {
            ...parent.armatureProps,
            rootBoneId: boneId,
          },
        });
      }
    }

    console.log('[BoneStore] Created bone:', bone.name, boneId);
    return boneId;
  },

  createBoneWithHeadTail: (
    parentId: string | null,
    headPosition: [number, number, number],
    tailPosition: [number, number, number]
  ) => {
    const objectsStore = useObjectsStore.getState();
    const boneId = generateId();

    const bone: SceneObject = {
      id: boneId,
      name: objectsStore.generateName('bone'),
      type: 'bone',
      visible: true,
      locked: false,
      position: headPosition,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId,
      children: [],
      boneProps: {
        headPosition,
        tailPosition,
        roll: 0,
        length: calculateBoneLength(headPosition, tailPosition),
        connected: false,
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    objectsStore.addObject(bone);

    if (parentId) {
      objectsStore.setParent(boneId, parentId);

      // If parent is an armature without a root bone, set this as root
      const parent = objectsStore.objects.get(parentId);
      if (parent?.type === 'armature' && parent.armatureProps?.rootBoneId === null) {
        objectsStore.updateObject(parentId, {
          armatureProps: {
            ...parent.armatureProps,
            rootBoneId: boneId,
          },
        });
      }
    }

    console.log('[BoneStore] Created bone with head/tail:', bone.name, boneId);
    return boneId;
  },

  subdivideBone: (boneId: string, segments: number) => {
    const objectsStore = useObjectsStore.getState();
    const bone = objectsStore.objects.get(boneId);

    if (!bone || bone.type !== 'bone' || !bone.boneProps) {
      console.warn('[BoneStore] Cannot subdivide non-bone object:', boneId);
      return [];
    }

    const { headPosition, tailPosition } = bone.boneProps;
    const newBoneIds: string[] = [];

    // Calculate segment positions
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;

      const segmentHead: [number, number, number] = [
        headPosition[0] + (tailPosition[0] - headPosition[0]) * t0,
        headPosition[1] + (tailPosition[1] - headPosition[1]) * t0,
        headPosition[2] + (tailPosition[2] - headPosition[2]) * t0,
      ];

      const segmentTail: [number, number, number] = [
        headPosition[0] + (tailPosition[0] - headPosition[0]) * t1,
        headPosition[1] + (tailPosition[1] - headPosition[1]) * t1,
        headPosition[2] + (tailPosition[2] - headPosition[2]) * t1,
      ];

      const newBoneId = get().createBoneWithHeadTail(
        i === 0 ? bone.parentId : newBoneIds[i - 1],
        segmentHead,
        segmentTail
      );

      newBoneIds.push(newBoneId);
    }

    // Delete original bone
    objectsStore.removeObject(boneId);

    console.log('[BoneStore] Subdivided bone into', segments, 'segments');
    return newBoneIds;
  },

  deleteBone: (boneId: string, deleteChildren: boolean) => {
    const objectsStore = useObjectsStore.getState();
    const bone = objectsStore.objects.get(boneId);

    if (!bone) return;

    if (deleteChildren) {
      // Recursively delete all children
      const deleteRecursive = (id: string) => {
        const obj = objectsStore.objects.get(id);
        if (!obj) return;

        obj.children.forEach(childId => deleteRecursive(childId));
        objectsStore.removeObject(id);
      };

      deleteRecursive(boneId);
    } else {
      // Reparent children to this bone's parent
      bone.children.forEach(childId => {
        objectsStore.setParent(childId, bone.parentId);
      });

      objectsStore.removeObject(boneId);
    }

    console.log('[BoneStore] Deleted bone:', boneId, 'with children:', deleteChildren);
  },

  updateBoneTail: (boneId: string, tailPosition: [number, number, number]) => {
    const objectsStore = useObjectsStore.getState();
    const bone = objectsStore.objects.get(boneId);

    if (!bone || bone.type !== 'bone' || !bone.boneProps) return;

    const length = calculateBoneLength(bone.boneProps.headPosition, tailPosition);

    objectsStore.updateObject(boneId, {
      boneProps: {
        ...bone.boneProps,
        tailPosition,
        length,
      },
      modifiedAt: Date.now(),
    });
  },

  updateBoneRoll: (boneId: string, roll: number) => {
    const objectsStore = useObjectsStore.getState();
    const bone = objectsStore.objects.get(boneId);

    if (!bone || bone.type !== 'bone' || !bone.boneProps) return;

    objectsStore.updateObject(boneId, {
      boneProps: {
        ...bone.boneProps,
        roll,
      },
      modifiedAt: Date.now(),
    });
  },

  // Armature operations
  createArmature: (name: string, position: [number, number, number]) => {
    const objectsStore = useObjectsStore.getState();
    const armatureId = generateId();

    const armature: SceneObject = {
      id: armatureId,
      name: name || objectsStore.generateName('armature'),
      type: 'armature',
      visible: true,
      locked: false,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      armatureProps: {
        rootBoneId: null,
        displayType: 'octahedral',
        inFront: false,
        axesDisplay: 'none',
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    objectsStore.addObject(armature);

    console.log('[BoneStore] Created armature:', name, armatureId);
    return armatureId;
  },

  deleteArmature: (armatureId: string) => {
    const objectsStore = useObjectsStore.getState();
    const armature = objectsStore.objects.get(armatureId);

    if (!armature || armature.type !== 'armature') return;

    // Delete all bones in this armature
    const bones = get().getBonesByArmature(armatureId);
    bones.forEach(bone => objectsStore.removeObject(bone.id));

    // Delete the armature itself
    objectsStore.removeObject(armatureId);

    console.log('[BoneStore] Deleted armature:', armatureId);
  },

  setArmatureDisplayType: (armatureId: string, displayType) => {
    const objectsStore = useObjectsStore.getState();
    const armature = objectsStore.objects.get(armatureId);

    if (!armature || armature.type !== 'armature' || !armature.armatureProps) return;

    objectsStore.updateObject(armatureId, {
      armatureProps: {
        ...armature.armatureProps,
        displayType,
      },
      modifiedAt: Date.now(),
    });
  },

  toggleArmatureXRay: (armatureId: string) => {
    const objectsStore = useObjectsStore.getState();
    const armature = objectsStore.objects.get(armatureId);

    if (!armature || armature.type !== 'armature' || !armature.armatureProps) return;

    objectsStore.updateObject(armatureId, {
      armatureProps: {
        ...armature.armatureProps,
        inFront: !armature.armatureProps.inFront,
      },
      modifiedAt: Date.now(),
    });
  },

  // Pose operations
  setPoseTransform: (boneId: string, transform: Partial<BonePose>) => {
    const objectsStore = useObjectsStore.getState();
    const bone = objectsStore.objects.get(boneId);

    if (!bone || bone.type !== 'bone') return;

    // Update bone transform
    const updates: Partial<SceneObject> = {
      modifiedAt: Date.now(),
    };

    if (transform.position) {
      updates.position = transform.position;
    }

    if (transform.rotation) {
      // Convert quaternion to euler (simplified for now)
      // TODO: Proper quaternion to euler conversion
      const euler = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion(...transform.rotation)
      );
      updates.rotation = [euler.x, euler.y, euler.z];
    }

    if (transform.scale) {
      updates.scale = transform.scale;
    }

    objectsStore.updateObject(boneId, updates);
  },

  resetPose: (boneId?: string) => {
    const objectsStore = useObjectsStore.getState();
    const { poseArmatureId, selectedBoneIds } = get();

    if (!poseArmatureId) return;

    const bonesToReset = boneId
      ? [boneId]
      : Array.from(selectedBoneIds.size > 0 ? selectedBoneIds : get().getBonesByArmature(poseArmatureId).map(b => b.id));

    bonesToReset.forEach(id => {
      const bone = objectsStore.objects.get(id);
      if (!bone || bone.type !== 'bone' || !bone.boneProps) return;

      // Reset to rest pose (head position)
      objectsStore.updateObject(id, {
        position: bone.boneProps.headPosition,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        modifiedAt: Date.now(),
      });
    });

    console.log('[BoneStore] Reset pose for', bonesToReset.length, 'bones');
  },

  applyPoseAsRest: () => {
    const { poseArmatureId } = get();
    if (!poseArmatureId) return;

    const objectsStore = useObjectsStore.getState();
    const bones = get().getBonesByArmature(poseArmatureId);

    bones.forEach(bone => {
      if (!bone.boneProps) return;

      // Update rest pose (head/tail positions) based on current pose
      objectsStore.updateObject(bone.id, {
        boneProps: {
          ...bone.boneProps,
          headPosition: bone.position,
        },
        modifiedAt: Date.now(),
      });
    });

    console.log('[BoneStore] Applied current pose as rest pose');
  },

  copyPose: () => {
    const { poseArmatureId } = get();
    if (!poseArmatureId) return new Map();

    const bones = get().getBonesByArmature(poseArmatureId);
    const pose = new Map<string, BonePose>();

    bones.forEach(bone => {
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...bone.rotation)
      );

      pose.set(bone.id, {
        position: bone.position,
        rotation: [quat.x, quat.y, quat.z, quat.w],
        scale: bone.scale,
      });
    });

    console.log('[BoneStore] Copied pose from', bones.length, 'bones');
    return pose;
  },

  pastePose: (pose: Map<string, BonePose>) => {
    const { setPoseTransform } = get();

    pose.forEach((bonePose, boneId) => {
      setPoseTransform(boneId, bonePose);
    });

    console.log('[BoneStore] Pasted pose to', pose.size, 'bones');
  },

  // Skinning operations
  bindMeshToArmature: (meshId: string, armatureId: string) => {
    const objectsStore = useObjectsStore.getState();
    const mesh = objectsStore.objects.get(meshId);
    const armature = objectsStore.objects.get(armatureId);

    if (!mesh || !armature || armature.type !== 'armature') {
      console.warn('[BoneStore] Invalid mesh or armature for binding');
      return;
    }

    // Create empty skin data
    const skinData: SkinData = {
      armatureId,
      weights: {},
      bindMatrix: new THREE.Matrix4().identity().elements as unknown as number[],
      bindPose: new Map(),
    };

    // Store rest pose for all bones
    const bones = get().getBonesByArmature(armatureId);
    bones.forEach(bone => {
      const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...bone.rotation));
      skinData.bindPose.set(bone.id, {
        position: bone.position,
        rotation: [quat.x, quat.y, quat.z, quat.w],
        scale: bone.scale,
      });
    });

    objectsStore.updateObject(meshId, {
      skinData,
      modifiedAt: Date.now(),
    });

    console.log('[BoneStore] Bound mesh', meshId, 'to armature', armatureId);
  },

  unbindMesh: (meshId: string) => {
    const objectsStore = useObjectsStore.getState();

    objectsStore.updateObject(meshId, {
      skinData: undefined,
      modifiedAt: Date.now(),
    });

    console.log('[BoneStore] Unbound mesh:', meshId);
  },

  setVertexWeights: (meshId: string, vertexIndex: number, influences: BoneInfluence[]) => {
    const objectsStore = useObjectsStore.getState();
    const mesh = objectsStore.objects.get(meshId);

    if (!mesh || !mesh.skinData) return;

    const newWeights = { ...mesh.skinData.weights };
    newWeights[vertexIndex] = influences;

    objectsStore.updateObject(meshId, {
      skinData: {
        ...mesh.skinData,
        weights: newWeights,
      },
      modifiedAt: Date.now(),
    });
  },

  autoWeight: (_meshId: string, method: AutoWeightMethod) => {
    console.log('[BoneStore] Auto-weight not yet implemented:', method);
    // TODO: Implement automatic weighting algorithms
    // - Heat diffusion method
    // - Envelope method
  },

  normalizeWeights: (meshId: string) => {
    const objectsStore = useObjectsStore.getState();
    const mesh = objectsStore.objects.get(meshId);

    if (!mesh || !mesh.skinData) return;

    const normalizedWeights: SkinWeights = {};

    Object.entries(mesh.skinData.weights).forEach(([vertexIdx, influences]) => {
      const totalWeight = influences.reduce((sum: number, inf: BoneInfluence) => sum + inf.weight, 0);

      if (totalWeight > 0) {
        normalizedWeights[parseInt(vertexIdx)] = influences.map((inf: BoneInfluence) => ({
          ...inf,
          weight: inf.weight / totalWeight,
        }));
      }
    });

    objectsStore.updateObject(meshId, {
      skinData: {
        ...mesh.skinData,
        weights: normalizedWeights,
      },
      modifiedAt: Date.now(),
    });

    console.log('[BoneStore] Normalized weights for mesh:', meshId);
  },

  smoothWeights: (_meshId: string, _vertexIndices: number[], _iterations = 1) => {
    console.log('[BoneStore] Smooth weights not yet implemented');
    // TODO: Implement weight smoothing
  },

  // Helper functions
  getBonesByArmature: (armatureId: string) => {
    const objectsStore = useObjectsStore.getState();
    const armature = objectsStore.objects.get(armatureId);

    if (!armature || armature.type !== 'armature') return [];

    // Get all bones that are children of this armature
    const bones: SceneObject[] = [];

    const collectBones = (parentId: string) => {
      objectsStore.objects.forEach(obj => {
        if (obj.parentId === parentId && obj.type === 'bone') {
          bones.push(obj);
          collectBones(obj.id); // Recursively collect child bones
        }
      });
    };

    collectBones(armatureId);
    return bones;
  },

  getRootBone: (armatureId: string) => {
    const objectsStore = useObjectsStore.getState();
    const armature = objectsStore.objects.get(armatureId);

    if (!armature || armature.type !== 'armature' || !armature.armatureProps) {
      return null;
    }

    if (armature.armatureProps.rootBoneId) {
      return objectsStore.objects.get(armature.armatureProps.rootBoneId) || null;
    }

    // Find root bone (bone whose parent is the armature)
    let rootBone: SceneObject | null = null;

    objectsStore.objects.forEach(obj => {
      if (obj.type === 'bone' && obj.parentId === armatureId) {
        rootBone = obj;
      }
    });

    return rootBone;
  },

  getBoneChain: (boneId: string) => {
    const objectsStore = useObjectsStore.getState();
    const chain: string[] = [];

    let current = objectsStore.objects.get(boneId);

    while (current && current.type === 'bone') {
      chain.unshift(current.id);
      current = current.parentId ? objectsStore.objects.get(current.parentId) : undefined;
    }

    return chain;
  },

  isBoneInArmature: (boneId: string, armatureId: string) => {
    const bones = get().getBonesByArmature(armatureId);
    return bones.some(b => b.id === boneId);
  },
}));
