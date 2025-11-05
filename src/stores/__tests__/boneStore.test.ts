/**
 * Bone Store Tests
 *
 * Tests for skeletal rigging and pose management.
 * Tests Epic 1: Data Structures & Core Architecture
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { useBoneStore } from '../boneStore';
import { useObjectsStore } from '../objectsStore';

describe('BoneStore - Epic 1: Data Structures', () => {
  beforeEach(() => {
    // Reset stores
    useBoneStore.setState({
      isPoseMode: false,
      poseArmatureId: null,
      selectedBoneIds: new Set(),
      activeBoneId: null,
    });

    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
      hoveredId: null,
      hoveredFaceId: null,
      modifiedAt: Date.now(),
    });
  });

  describe('Armature Management', () => {
    test('should create armature', () => {
      const armatureId = useBoneStore.getState().createArmature('Test Armature', [0, 0, 0]);

      const objectsStore = useObjectsStore.getState();
      const armature = objectsStore.objects.get(armatureId);

      expect(armature).toBeDefined();
      expect(armature?.type).toBe('armature');
      expect(armature?.name).toBe('Test Armature');
      expect(armature?.armatureProps).toBeDefined();
      expect(armature?.armatureProps?.rootBoneId).toBeNull();
    });

    test('should create armature with default name', () => {
      const armatureId = useBoneStore.getState().createArmature();

      const objectsStore = useObjectsStore.getState();
      const armature = objectsStore.objects.get(armatureId);

      expect(armature?.name).toMatch(/^Armature\d+$/);
    });

    test('should delete armature', () => {
      const armatureId = useBoneStore.getState().createArmature('Test Armature', [0, 0, 0]);
      useBoneStore.getState().deleteArmature(armatureId);

      const objectsStore = useObjectsStore.getState();
      expect(objectsStore.objects.get(armatureId)).toBeUndefined();
    });
  });

  describe('Bone Creation', () => {
    test('should create bone with head/tail positions', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const boneId = useBoneStore.getState().createBoneWithHeadTail(
        armatureId,
        [0, 0, 0],
        [0, 1, 0]
      );

      const objectsStore = useObjectsStore.getState();
      const bone = objectsStore.objects.get(boneId);

      expect(bone).toBeDefined();
      expect(bone?.type).toBe('bone');
      expect(bone?.boneProps).toBeDefined();
      expect(bone?.boneProps?.headPosition).toEqual([0, 0, 0]);
      expect(bone?.boneProps?.tailPosition).toEqual([0, 1, 0]);
      expect(bone?.boneProps?.length).toBeCloseTo(1.0);
    });

    test('should create bone with simple position', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const boneId = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);

      const objectsStore = useObjectsStore.getState();
      const bone = objectsStore.objects.get(boneId);

      expect(bone).toBeDefined();
      expect(bone?.type).toBe('bone');
      expect(bone?.position).toEqual([0, 0, 0]);
    });

    test('should create bone hierarchy', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const rootBoneId = useBoneStore.getState().createBoneWithHeadTail(
        armatureId,
        [0, 0, 0],
        [0, 1, 0]
      );
      const childBoneId = useBoneStore.getState().createBoneWithHeadTail(
        rootBoneId,
        [0, 1, 0],
        [0, 2, 0]
      );

      const objectsStore = useObjectsStore.getState();
      const rootBone = objectsStore.objects.get(rootBoneId);
      const childBone = objectsStore.objects.get(childBoneId);

      expect(rootBone?.parentId).toBe(armatureId);
      expect(childBone?.parentId).toBe(rootBoneId);
      expect(rootBone?.children).toContain(childBoneId);
    });

    test('should set root bone on armature', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const rootBoneId = useBoneStore.getState().createBoneWithHeadTail(
        armatureId,
        [0, 0, 0],
        [0, 1, 0]
      );

      const objectsStore = useObjectsStore.getState();
      const armature = objectsStore.objects.get(armatureId);

      expect(armature?.armatureProps?.rootBoneId).toBe(rootBoneId);
    });
  });

  describe('Pose Mode', () => {
    test('should enter pose mode', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      useBoneStore.getState().enterPoseMode(armatureId);

      const state = useBoneStore.getState();
      expect(state.isPoseMode).toBe(true);
      expect(state.poseArmatureId).toBe(armatureId);
    });

    test('should exit pose mode', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      useBoneStore.getState().enterPoseMode(armatureId);
      useBoneStore.getState().exitPoseMode();

      const state = useBoneStore.getState();
      expect(state.isPoseMode).toBe(false);
      expect(state.poseArmatureId).toBeNull();
    });

    test('should clear selection on exit pose mode', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const boneId = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);

      useBoneStore.getState().enterPoseMode(armatureId);
      useBoneStore.getState().selectBone(boneId, false);
      useBoneStore.getState().exitPoseMode();

      expect(useBoneStore.getState().selectedBoneIds.size).toBe(0);
    });
  });

  describe('Bone Selection', () => {
    test('should select bone', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const boneId = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);

      useBoneStore.getState().selectBone(boneId, false);

      expect(useBoneStore.getState().selectedBoneIds.has(boneId)).toBe(true);
      expect(useBoneStore.getState().activeBoneId).toBe(boneId);
    });

    test('should multi-select bones', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const bone1Id = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);
      const bone2Id = useBoneStore.getState().createBone(armatureId, [1, 0, 0]);

      useBoneStore.getState().selectBone(bone1Id, false);
      useBoneStore.getState().selectBone(bone2Id, true);

      const selected = useBoneStore.getState().selectedBoneIds;
      expect(selected.size).toBe(2);
      expect(selected.has(bone1Id)).toBe(true);
      expect(selected.has(bone2Id)).toBe(true);
    });

    test('should replace selection when not multi-select', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const bone1Id = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);
      const bone2Id = useBoneStore.getState().createBone(armatureId, [1, 0, 0]);

      useBoneStore.getState().selectBone(bone1Id, false);
      useBoneStore.getState().selectBone(bone2Id, false);

      const selected = useBoneStore.getState().selectedBoneIds;
      expect(selected.size).toBe(1);
      expect(selected.has(bone2Id)).toBe(true);
      expect(selected.has(bone1Id)).toBe(false);
    });

    test('should deselect bone', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const boneId = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);

      useBoneStore.getState().selectBone(boneId, false);
      useBoneStore.getState().deselectBone(boneId);

      expect(useBoneStore.getState().selectedBoneIds.has(boneId)).toBe(false);
    });

    test('should clear all bone selections', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const bone1Id = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);
      const bone2Id = useBoneStore.getState().createBone(armatureId, [1, 0, 0]);

      useBoneStore.getState().selectBone(bone1Id, false);
      useBoneStore.getState().selectBone(bone2Id, true);
      useBoneStore.getState().clearBoneSelection();

      expect(useBoneStore.getState().selectedBoneIds.size).toBe(0);
      expect(useBoneStore.getState().activeBoneId).toBeNull();
    });
  });

  describe('Bone Queries', () => {
    test('should get bones by armature', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const bone1Id = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);
      const bone2Id = useBoneStore.getState().createBone(armatureId, [1, 0, 0]);

      const bones = useBoneStore.getState().getBonesByArmature(armatureId);

      expect(bones.length).toBe(2);
      expect(bones.some(b => b.id === bone1Id)).toBe(true);
      expect(bones.some(b => b.id === bone2Id)).toBe(true);
    });

    test('should get root bone', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const rootBoneId = useBoneStore.getState().createBoneWithHeadTail(
        armatureId,
        [0, 0, 0],
        [0, 1, 0]
      );
      useBoneStore.getState().createBoneWithHeadTail(
        rootBoneId,
        [0, 1, 0],
        [0, 2, 0]
      );

      const rootBone = useBoneStore.getState().getRootBone(armatureId);

      expect(rootBone?.id).toBe(rootBoneId);
    });

    test('should get bone chain', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const rootBoneId = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);
      const midBoneId = useBoneStore.getState().createBone(rootBoneId, [0, 1, 0]);
      const endBoneId = useBoneStore.getState().createBone(midBoneId, [0, 2, 0]);

      const chain = useBoneStore.getState().getBoneChain(endBoneId);

      expect(chain).toEqual([rootBoneId, midBoneId, endBoneId]);
    });

    test('should check if bone is in armature', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const boneId = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);

      expect(useBoneStore.getState().isBoneInArmature(boneId, armatureId)).toBe(true);
      expect(useBoneStore.getState().isBoneInArmature('invalid-id', armatureId)).toBe(false);
    });
  });

  describe('Skinning', () => {
    test('should bind mesh to armature', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);

      // Create a simple mesh
      const meshId = 'mesh-1';
      useObjectsStore.getState().addObject({
        id: meshId,
        name: 'Test Mesh',
        type: 'box',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        locked: false,
        parentId: null,
        children: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });

      useBoneStore.getState().bindMeshToArmature(meshId, armatureId);

      const mesh = useObjectsStore.getState().objects.get(meshId);
      expect(mesh?.skinData).toBeDefined();
      expect(mesh?.skinData?.armatureId).toBe(armatureId);
    });

    test('should set vertex weights', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const boneId = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);

      const meshId = 'mesh-1';
      useObjectsStore.getState().addObject({
        id: meshId,
        name: 'Test Mesh',
        type: 'box',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        locked: false,
        parentId: null,
        children: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });

      useBoneStore.getState().bindMeshToArmature(meshId, armatureId);
      useBoneStore.getState().setVertexWeights(meshId, 0, [
        { boneId, weight: 1.0 }
      ]);

      const mesh = useObjectsStore.getState().objects.get(meshId);
      expect(mesh?.skinData?.weights[0]).toBeDefined();
      expect(mesh?.skinData?.weights[0][0].boneId).toBe(boneId);
      expect(mesh?.skinData?.weights[0][0].weight).toBe(1.0);
    });

    test('should normalize weights', () => {
      const armatureId = useBoneStore.getState().createArmature('Test', [0, 0, 0]);
      const bone1Id = useBoneStore.getState().createBone(armatureId, [0, 0, 0]);
      const bone2Id = useBoneStore.getState().createBone(armatureId, [1, 0, 0]);

      const meshId = 'mesh-1';
      useObjectsStore.getState().addObject({
        id: meshId,
        name: 'Test Mesh',
        type: 'box',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        locked: false,
        parentId: null,
        children: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });

      useBoneStore.getState().bindMeshToArmature(meshId, armatureId);
      useBoneStore.getState().setVertexWeights(meshId, 0, [
        { boneId: bone1Id, weight: 0.6 },
        { boneId: bone2Id, weight: 0.6 }
      ]);

      useBoneStore.getState().normalizeWeights(meshId);

      const mesh = useObjectsStore.getState().objects.get(meshId);
      const weights = mesh?.skinData?.weights[0];

      expect(weights).toBeDefined();
      const totalWeight = weights!.reduce((sum, inf) => sum + inf.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0);
    });
  });
});
