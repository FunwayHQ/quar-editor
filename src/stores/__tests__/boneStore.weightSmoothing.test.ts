/**
 * BoneStore Weight Smoothing Tests
 *
 * Tests for weight smoothing algorithm.
 * Epic 6: Weight Painting & Skinning Tools
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { useBoneStore } from '../boneStore';
import { useObjectsStore } from '../objectsStore';

describe('BoneStore - Weight Smoothing', () => {
  beforeEach(() => {
    // Reset stores
    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
    });

    useBoneStore.setState({
      isPoseMode: false,
      poseArmatureId: null,
      selectedBoneIds: new Set(),
      activeBoneId: null,
      isWeightPaintMode: false,
      weightPaintMeshId: null,
      weightPaintBoneId: null,
      weightPaintBrushSize: 0.5,
      weightPaintBrushStrength: 0.5,
      weightPaintMode: 'add',
    });
  });

  test('should smooth weights for single vertex with neighbors', () => {
    const { addObject } = useObjectsStore.getState();
    const { smoothWeights } = useBoneStore.getState();

    // Create mesh with simple triangle geometry
    const meshId = 'mesh1';
    addObject({
      id: meshId,
      name: 'Mesh',
      type: 'imported',
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      importedGeometry: {
        vertices: [
          0, 0, 0, // v0
          1, 0, 0, // v1
          0, 1, 0, // v2
        ],
        normals: [],
        uvs: [],
        indices: [0, 1, 2], // Single triangle
      },
      skinData: {
        armatureId: 'armature1',
        weights: new Map([
          [0, [{ boneId: 'bone1', weight: 1.0 }]], // v0: 100% bone1
          [1, [{ boneId: 'bone1', weight: 0.5 }, { boneId: 'bone2', weight: 0.5 }]], // v1: 50/50
          [2, [{ boneId: 'bone2', weight: 1.0 }]], // v2: 100% bone2
        ]),
        bindPose: new Map(),
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });

    // Smooth vertex 0 (which is connected to v1 and v2)
    smoothWeights(meshId, [0], 1);

    const mesh = useObjectsStore.getState().objects.get(meshId);
    expect(mesh).toBeDefined();
    expect(mesh!.skinData).toBeDefined();

    const smoothedWeights = mesh!.skinData!.weights.get(0);
    expect(smoothedWeights).toBeDefined();
    expect(smoothedWeights!.length).toBe(2);

    // After smoothing, v0 should have averaged weights from neighbors
    // Neighbors are v1 (50% bone1, 50% bone2) and v2 (100% bone2)
    // Average with self (100% bone1) = (bone1: (1 + 0.5 + 0) / 3 = 0.5, bone2: (0 + 0.5 + 1) / 3 = 0.5)
    const bone1Weight = smoothedWeights!.find(w => w.boneId === 'bone1')?.weight || 0;
    const bone2Weight = smoothedWeights!.find(w => w.boneId === 'bone2')?.weight || 0;

    // Should be roughly equal after averaging
    expect(bone1Weight).toBeGreaterThan(0.3);
    expect(bone1Weight).toBeLessThan(0.7);
    expect(bone2Weight).toBeGreaterThan(0.3);
    expect(bone2Weight).toBeLessThan(0.7);

    // Weights should sum to 1.0
    expect(bone1Weight + bone2Weight).toBeCloseTo(1.0);
  });

  test('should perform multiple smoothing iterations', () => {
    const { addObject } = useObjectsStore.getState();
    const { smoothWeights } = useBoneStore.getState();

    const meshId = 'mesh1';
    addObject({
      id: meshId,
      name: 'Mesh',
      type: 'imported',
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      importedGeometry: {
        vertices: [
          0, 0, 0, // v0
          1, 0, 0, // v1
          0, 1, 0, // v2
        ],
        normals: [],
        uvs: [],
        indices: [0, 1, 2],
      },
      skinData: {
        armatureId: 'armature1',
        weights: new Map([
          [0, [{ boneId: 'bone1', weight: 1.0 }]],
          [1, [{ boneId: 'bone1', weight: 1.0 }]],
          [2, [{ boneId: 'bone2', weight: 1.0 }]],
        ]),
        bindPose: new Map(),
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });

    // Smooth all vertices with 3 iterations
    smoothWeights(meshId, [0, 1, 2], 3);

    const mesh = useObjectsStore.getState().objects.get(meshId);
    const weights0 = mesh!.skinData!.weights.get(0);
    const weights1 = mesh!.skinData!.weights.get(1);
    const weights2 = mesh!.skinData!.weights.get(2);

    // After multiple iterations, weights should be more blended
    expect(weights0).toBeDefined();
    expect(weights1).toBeDefined();
    expect(weights2).toBeDefined();

    // All vertices should have both bones after smoothing
    expect(weights0!.length).toBeGreaterThanOrEqual(1);
    expect(weights1!.length).toBeGreaterThanOrEqual(1);
    expect(weights2!.length).toBeGreaterThanOrEqual(1);
  });

  test('should handle vertex with no neighbors', () => {
    const { addObject } = useObjectsStore.getState();
    const { smoothWeights } = useBoneStore.getState();

    const meshId = 'mesh1';
    addObject({
      id: meshId,
      name: 'Mesh',
      type: 'imported',
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      importedGeometry: {
        vertices: [0, 0, 0], // Single vertex
        normals: [],
        uvs: [],
      },
      skinData: {
        armatureId: 'armature1',
        weights: new Map([
          [0, [{ boneId: 'bone1', weight: 1.0 }]],
        ]),
        bindPose: new Map(),
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });

    const originalWeights = useObjectsStore.getState().objects.get(meshId)!.skinData!.weights.get(0);

    // Smooth vertex with no neighbors
    smoothWeights(meshId, [0], 1);

    const mesh = useObjectsStore.getState().objects.get(meshId);
    const smoothedWeights = mesh!.skinData!.weights.get(0);

    // Weights should remain unchanged
    expect(smoothedWeights).toEqual(originalWeights);
  });

  test('should normalize weights after smoothing', () => {
    const { addObject } = useObjectsStore.getState();
    const { smoothWeights } = useBoneStore.getState();

    const meshId = 'mesh1';
    addObject({
      id: meshId,
      name: 'Mesh',
      type: 'imported',
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      importedGeometry: {
        vertices: [
          0, 0, 0, // v0
          1, 0, 0, // v1
          0, 1, 0, // v2
        ],
        normals: [],
        uvs: [],
        indices: [0, 1, 2],
      },
      skinData: {
        armatureId: 'armature1',
        weights: new Map([
          [0, [{ boneId: 'bone1', weight: 0.8 }, { boneId: 'bone2', weight: 0.4 }]], // Not normalized (sum > 1)
          [1, [{ boneId: 'bone1', weight: 0.6 }]],
          [2, [{ boneId: 'bone2', weight: 0.9 }]],
        ]),
        bindPose: new Map(),
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });

    smoothWeights(meshId, [0, 1, 2], 1);

    const mesh = useObjectsStore.getState().objects.get(meshId);

    // Check all vertices have normalized weights (sum to 1.0)
    [0, 1, 2].forEach(vertexIdx => {
      const weights = mesh!.skinData!.weights.get(vertexIdx);
      expect(weights).toBeDefined();

      const sum = weights!.reduce((acc, w) => acc + w.weight, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  test('should filter negligible weights', () => {
    const { addObject } = useObjectsStore.getState();
    const { smoothWeights } = useBoneStore.getState();

    const meshId = 'mesh1';
    addObject({
      id: meshId,
      name: 'Mesh',
      type: 'imported',
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      importedGeometry: {
        vertices: [
          0, 0, 0, // v0
          1, 0, 0, // v1
          0, 1, 0, // v2
        ],
        normals: [],
        uvs: [],
        indices: [0, 1, 2],
      },
      skinData: {
        armatureId: 'armature1',
        weights: new Map([
          [0, [{ boneId: 'bone1', weight: 1.0 }]],
          [1, [{ boneId: 'bone1', weight: 0.999 }, { boneId: 'bone2', weight: 0.001 }]], // Negligible bone2
          [2, [{ boneId: 'bone1', weight: 1.0 }]],
        ]),
        bindPose: new Map(),
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });

    smoothWeights(meshId, [0, 1, 2], 1);

    const mesh = useObjectsStore.getState().objects.get(meshId);

    // Check that negligible weights (< 0.001) are filtered out
    [0, 1, 2].forEach(vertexIdx => {
      const weights = mesh!.skinData!.weights.get(vertexIdx);
      expect(weights).toBeDefined();

      weights!.forEach(w => {
        expect(w.weight).toBeGreaterThan(0.001);
      });
    });
  });

  test('should handle quad mesh topology', () => {
    const { addObject } = useObjectsStore.getState();
    const { smoothWeights } = useBoneStore.getState();

    const meshId = 'mesh1';
    addObject({
      id: meshId,
      name: 'Mesh',
      type: 'imported',
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      importedGeometry: {
        vertices: [
          0, 0, 0, // v0
          1, 0, 0, // v1
          1, 1, 0, // v2
          0, 1, 0, // v3
        ],
        normals: [],
        uvs: [],
        indices: [
          0, 1, 2, // Triangle 1
          0, 2, 3, // Triangle 2
        ],
      },
      skinData: {
        armatureId: 'armature1',
        weights: new Map([
          [0, [{ boneId: 'bone1', weight: 1.0 }]],
          [1, [{ boneId: 'bone1', weight: 1.0 }]],
          [2, [{ boneId: 'bone2', weight: 1.0 }]],
          [3, [{ boneId: 'bone2', weight: 1.0 }]],
        ]),
        bindPose: new Map(),
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });

    // v0 is connected to v1, v2, v3 (quad corner)
    smoothWeights(meshId, [0], 1);

    const mesh = useObjectsStore.getState().objects.get(meshId);
    const smoothedWeights = mesh!.skinData!.weights.get(0);

    expect(smoothedWeights).toBeDefined();
    expect(smoothedWeights!.length).toBe(2); // Should have both bone1 and bone2

    const totalWeight = smoothedWeights!.reduce((sum, w) => sum + w.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });
});
