/**
 * SkinningSolver Tests
 *
 * Tests for skeletal mesh deformation algorithms.
 * Epic 7: Skeletal Mesh Deformation
 */

import { describe, test, expect } from 'vitest';
import * as THREE from 'three';
import {
  computeBoneMatrices,
  computeSkinningMatrices,
  applyVertexSkinning,
  computeSkinnedMesh,
} from '../SkinningSolver';
import { SceneObject, BonePose } from '../../../stores/objectsStore';

describe('SkinningSolver', () => {
  describe('computeBoneMatrices', () => {
    test('should compute world matrix for single bone with rest pose', () => {
      const bone: SceneObject = {
        id: 'bone1',
        name: 'Bone1',
        type: 'bone',
        visible: true,
        locked: false,
        position: [1, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'armature1',
        children: [],
        boneProps: {
          headPosition: [1, 0, 0],
          tailPosition: [1, 1, 0],
          roll: 0,
          length: 1,
          connected: false,
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const bones = [bone];
      const boneMap = new Map([['bone1', bone]]);
      const poses = new Map();

      const matrices = computeBoneMatrices(bones, boneMap, poses);

      expect(matrices.size).toBe(1);
      expect(matrices.has('bone1')).toBe(true);

      const boneMatrix = matrices.get('bone1')!;
      expect(boneMatrix.boneId).toBe('bone1');

      // Check that world matrix has correct position
      const position = new THREE.Vector3();
      boneMatrix.worldMatrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
      expect(position.x).toBeCloseTo(1);
      expect(position.y).toBeCloseTo(0);
      expect(position.z).toBeCloseTo(0);
    });

    test('should compute world matrix with pose transform', () => {
      const bone: SceneObject = {
        id: 'bone1',
        name: 'Bone1',
        type: 'bone',
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'armature1',
        children: [],
        boneProps: {
          headPosition: [0, 0, 0],
          tailPosition: [0, 1, 0],
          roll: 0,
          length: 1,
          connected: false,
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const bones = [bone];
      const boneMap = new Map([['bone1', bone]]);

      // Create pose with translation
      const pose: BonePose = {
        position: [2, 3, 4],
        rotation: [0, 0, 0, 1], // Identity quaternion
        scale: [1, 1, 1],
      };
      const poses = new Map([['bone1', pose]]);

      const matrices = computeBoneMatrices(bones, boneMap, poses);
      const boneMatrix = matrices.get('bone1')!;

      const position = new THREE.Vector3();
      boneMatrix.worldMatrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());

      expect(position.x).toBeCloseTo(2);
      expect(position.y).toBeCloseTo(3);
      expect(position.z).toBeCloseTo(4);
    });

    test('should compute hierarchical bone matrices', () => {
      const parent: SceneObject = {
        id: 'parent',
        name: 'Parent',
        type: 'bone',
        visible: true,
        locked: false,
        position: [1, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'armature1',
        children: ['child'],
        boneProps: {
          headPosition: [1, 0, 0],
          tailPosition: [1, 1, 0],
          roll: 0,
          length: 1,
          connected: false,
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const child: SceneObject = {
        id: 'child',
        name: 'Child',
        type: 'bone',
        visible: true,
        locked: false,
        position: [0, 2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'parent',
        children: [],
        boneProps: {
          headPosition: [0, 2, 0],
          tailPosition: [0, 3, 0],
          roll: 0,
          length: 1,
          connected: false,
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const bones = [parent, child];
      const boneMap = new Map([
        ['parent', parent],
        ['child', child],
      ]);
      const poses = new Map();

      const matrices = computeBoneMatrices(bones, boneMap, poses);

      expect(matrices.size).toBe(2);

      // Parent should be at (1, 0, 0)
      const parentPos = new THREE.Vector3();
      matrices.get('parent')!.worldMatrix.decompose(parentPos, new THREE.Quaternion(), new THREE.Vector3());
      expect(parentPos.x).toBeCloseTo(1);
      expect(parentPos.y).toBeCloseTo(0);
      expect(parentPos.z).toBeCloseTo(0);

      // Child should be at parent + child local = (1, 0, 0) + (0, 2, 0) = (1, 2, 0)
      const childPos = new THREE.Vector3();
      matrices.get('child')!.worldMatrix.decompose(childPos, new THREE.Quaternion(), new THREE.Vector3());
      expect(childPos.x).toBeCloseTo(1);
      expect(childPos.y).toBeCloseTo(2);
      expect(childPos.z).toBeCloseTo(0);
    });

    test('should handle rotation in pose', () => {
      const bone: SceneObject = {
        id: 'bone1',
        name: 'Bone1',
        type: 'bone',
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'armature1',
        children: [],
        boneProps: {
          headPosition: [0, 0, 0],
          tailPosition: [0, 1, 0],
          roll: 0,
          length: 1,
          connected: false,
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const bones = [bone];
      const boneMap = new Map([['bone1', bone]]);

      // 90 degree rotation around Z axis
      const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      const pose: BonePose = {
        position: [0, 0, 0],
        rotation: [quat.x, quat.y, quat.z, quat.w],
        scale: [1, 1, 1],
      };
      const poses = new Map([['bone1', pose]]);

      const matrices = computeBoneMatrices(bones, boneMap, poses);
      const boneMatrix = matrices.get('bone1')!;

      const rotation = new THREE.Quaternion();
      boneMatrix.worldMatrix.decompose(new THREE.Vector3(), rotation, new THREE.Vector3());

      expect(rotation.x).toBeCloseTo(quat.x);
      expect(rotation.y).toBeCloseTo(quat.y);
      expect(rotation.z).toBeCloseTo(quat.z);
      expect(rotation.w).toBeCloseTo(quat.w);
    });
  });

  describe('computeSkinningMatrices', () => {
    test('should compute skinning matrix with bind pose', () => {
      const boneMatrix = {
        boneId: 'bone1',
        worldMatrix: new THREE.Matrix4().makeTranslation(1, 2, 3),
        skinningMatrix: new THREE.Matrix4(),
      };
      const boneMatrices = new Map([['bone1', boneMatrix]]);

      const bindPose: BonePose = {
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      };
      const skinData = {
        armatureId: 'armature1',
        weights: new Map(),
        bindPose: new Map([['bone1', bindPose]]),
      };

      const skinningMatrices = computeSkinningMatrices(boneMatrices, skinData);

      expect(skinningMatrices.size).toBe(1);
      expect(skinningMatrices.has('bone1')).toBe(true);

      const matrix = skinningMatrices.get('bone1')!;
      // Skinning matrix = world matrix * inverse bind matrix
      // Since bind pose is at origin, inverse is identity
      // So skinning matrix should equal world matrix
      const position = new THREE.Vector3();
      matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
      expect(position.x).toBeCloseTo(1);
      expect(position.y).toBeCloseTo(2);
      expect(position.z).toBeCloseTo(3);
    });

    test('should handle missing bind pose with identity', () => {
      const boneMatrix = {
        boneId: 'bone1',
        worldMatrix: new THREE.Matrix4().makeTranslation(1, 0, 0),
        skinningMatrix: new THREE.Matrix4(),
      };
      const boneMatrices = new Map([['bone1', boneMatrix]]);

      const skinData = {
        armatureId: 'armature1',
        weights: new Map(),
        bindPose: new Map(), // No bind pose
      };

      const skinningMatrices = computeSkinningMatrices(boneMatrices, skinData);

      expect(skinningMatrices.size).toBe(1);
      const matrix = skinningMatrices.get('bone1')!;

      // Should be identity matrix
      expect(matrix.equals(new THREE.Matrix4())).toBe(true);
    });
  });

  describe('applyVertexSkinning', () => {
    test('should deform vertex with single bone influence', () => {
      const originalVertices = new Float32Array([
        0, 0, 0, // Vertex at origin
      ]);

      const skinData = {
        armatureId: 'armature1',
        weights: new Map([
          [0, [{ boneId: 'bone1', weight: 1.0 }]], // Vertex 0 fully influenced by bone1
        ]),
        bindPose: new Map(),
      };

      // Skinning matrix translates by (1, 2, 3)
      const skinningMatrices = new Map([
        ['bone1', new THREE.Matrix4().makeTranslation(1, 2, 3)],
      ]);

      const deformedVertices = applyVertexSkinning(originalVertices, skinData, skinningMatrices);

      expect(deformedVertices[0]).toBeCloseTo(1);
      expect(deformedVertices[1]).toBeCloseTo(2);
      expect(deformedVertices[2]).toBeCloseTo(3);
    });

    test('should blend multiple bone influences', () => {
      const originalVertices = new Float32Array([
        0, 0, 0, // Vertex at origin
      ]);

      const skinData = {
        armatureId: 'armature1',
        weights: new Map([
          [
            0,
            [
              { boneId: 'bone1', weight: 0.5 },
              { boneId: 'bone2', weight: 0.5 },
            ],
          ],
        ]),
        bindPose: new Map(),
      };

      const skinningMatrices = new Map([
        ['bone1', new THREE.Matrix4().makeTranslation(0, 0, 0)], // No translation
        ['bone2', new THREE.Matrix4().makeTranslation(4, 6, 8)], // Translate by (4, 6, 8)
      ]);

      const deformedVertices = applyVertexSkinning(originalVertices, skinData, skinningMatrices);

      // Average of (0,0,0) and (4,6,8) = (2,3,4)
      expect(deformedVertices[0]).toBeCloseTo(2);
      expect(deformedVertices[1]).toBeCloseTo(3);
      expect(deformedVertices[2]).toBeCloseTo(4);
    });

    test('should handle vertices with no influences', () => {
      const originalVertices = new Float32Array([
        1, 2, 3, // Vertex with position
      ]);

      const skinData = {
        armatureId: 'armature1',
        weights: new Map(), // No weights
        bindPose: new Map(),
      };

      const skinningMatrices = new Map();

      const deformedVertices = applyVertexSkinning(originalVertices, skinData, skinningMatrices);

      // Should keep original position
      expect(deformedVertices[0]).toBeCloseTo(1);
      expect(deformedVertices[1]).toBeCloseTo(2);
      expect(deformedVertices[2]).toBeCloseTo(3);
    });

    test('should handle multiple vertices', () => {
      const originalVertices = new Float32Array([
        0, 0, 0, // Vertex 0
        1, 0, 0, // Vertex 1
        0, 1, 0, // Vertex 2
      ]);

      const skinData = {
        armatureId: 'armature1',
        weights: new Map([
          [0, [{ boneId: 'bone1', weight: 1.0 }]],
          [1, [{ boneId: 'bone1', weight: 1.0 }]],
          [2, [{ boneId: 'bone1', weight: 1.0 }]],
        ]),
        bindPose: new Map(),
      };

      const skinningMatrices = new Map([
        ['bone1', new THREE.Matrix4().makeTranslation(5, 5, 5)],
      ]);

      const deformedVertices = applyVertexSkinning(originalVertices, skinData, skinningMatrices);

      // Vertex 0: (0,0,0) + (5,5,5) = (5,5,5)
      expect(deformedVertices[0]).toBeCloseTo(5);
      expect(deformedVertices[1]).toBeCloseTo(5);
      expect(deformedVertices[2]).toBeCloseTo(5);

      // Vertex 1: (1,0,0) + (5,5,5) = (6,5,5)
      expect(deformedVertices[3]).toBeCloseTo(6);
      expect(deformedVertices[4]).toBeCloseTo(5);
      expect(deformedVertices[5]).toBeCloseTo(5);

      // Vertex 2: (0,1,0) + (5,5,5) = (5,6,5)
      expect(deformedVertices[6]).toBeCloseTo(5);
      expect(deformedVertices[7]).toBeCloseTo(6);
      expect(deformedVertices[8]).toBeCloseTo(5);
    });

    test('should apply rotation transform', () => {
      const originalVertices = new Float32Array([
        1, 0, 0, // Vertex on X axis
      ]);

      const skinData = {
        armatureId: 'armature1',
        weights: new Map([
          [0, [{ boneId: 'bone1', weight: 1.0 }]],
        ]),
        bindPose: new Map(),
      };

      // 90 degree rotation around Z axis
      const rotationMatrix = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
      const skinningMatrices = new Map([['bone1', rotationMatrix]]);

      const deformedVertices = applyVertexSkinning(originalVertices, skinData, skinningMatrices);

      // After 90° rotation around Z, (1,0,0) becomes (0,1,0)
      expect(deformedVertices[0]).toBeCloseTo(0, 5);
      expect(deformedVertices[1]).toBeCloseTo(1, 5);
      expect(deformedVertices[2]).toBeCloseTo(0, 5);
    });
  });

  describe('computeSkinnedMesh', () => {
    test('should return null for mesh without skin data', () => {
      const mesh: SceneObject = {
        id: 'mesh1',
        name: 'Mesh1',
        type: 'imported',
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const bones: SceneObject[] = [];
      const boneMap = new Map();
      const poses = new Map();

      const result = computeSkinnedMesh(mesh, bones, boneMap, poses);

      expect(result).toBeNull();
    });

    test('should return null for mesh without geometry', () => {
      const mesh: SceneObject = {
        id: 'mesh1',
        name: 'Mesh1',
        type: 'imported',
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        skinData: {
          armatureId: 'armature1',
          weights: new Map(),
          bindPose: new Map(),
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const bones: SceneObject[] = [];
      const boneMap = new Map();
      const poses = new Map();

      const result = computeSkinnedMesh(mesh, bones, boneMap, poses);

      expect(result).toBeNull();
    });

    test('should compute full skinning pipeline', () => {
      const bone: SceneObject = {
        id: 'bone1',
        name: 'Bone1',
        type: 'bone',
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'armature1',
        children: [],
        boneProps: {
          headPosition: [0, 0, 0],
          tailPosition: [0, 1, 0],
          roll: 0,
          length: 1,
          connected: false,
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const mesh: SceneObject = {
        id: 'mesh1',
        name: 'Mesh1',
        type: 'imported',
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        importedGeometry: {
          vertices: [0, 0, 0, 1, 0, 0], // 2 vertices
          normals: [],
          uvs: [],
        },
        skinData: {
          armatureId: 'armature1',
          weights: new Map([
            [0, [{ boneId: 'bone1', weight: 1.0 }]],
            [1, [{ boneId: 'bone1', weight: 1.0 }]],
          ]),
          bindPose: new Map([
            ['bone1', { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }],
          ]),
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const bones = [bone];
      const boneMap = new Map([['bone1', bone]]);

      // Pose with translation
      const pose: BonePose = {
        position: [2, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      };
      const poses = new Map([['bone1', pose]]);

      const result = computeSkinnedMesh(mesh, bones, boneMap, poses);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(6); // 2 vertices * 3 components

      // Both vertices should be translated by (2, 0, 0)
      expect(result![0]).toBeCloseTo(2);
      expect(result![1]).toBeCloseTo(0);
      expect(result![2]).toBeCloseTo(0);

      expect(result![3]).toBeCloseTo(3);
      expect(result![4]).toBeCloseTo(0);
      expect(result![5]).toBeCloseTo(0);
    });
  });
});
