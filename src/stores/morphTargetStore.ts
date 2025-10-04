/**
 * Morph Target Store
 *
 * Manages shape keys/morph targets for vertex animation.
 * Allows storing multiple shape states and blending between them.
 */

import { create } from 'zustand';
import * as THREE from 'three';

export interface ShapeKey {
  id: string;
  name: string;
  objectId: string;
  positions: Float32Array;
  normals?: Float32Array;
  value: number; // 0-1, current influence/weight
  createdAt: number;
}

export interface MorphTargetState {
  // Shape keys by object ID
  shapeKeysByObject: Map<string, ShapeKey[]>;

  // Currently active shape key for editing
  activeShapeKeyId: string | null;

  // Base/rest pose geometries
  basePoses: Map<string, THREE.BufferGeometry>;

  // Actions
  createShapeKey: (objectId: string, name?: string) => ShapeKey | null;
  updateShapeKey: (id: string, updates: Partial<ShapeKey>) => void;
  deleteShapeKey: (id: string) => void;

  setShapeKeyValue: (id: string, value: number) => void;
  setActiveShapeKey: (id: string | null) => void;

  storeBasePose: (objectId: string, geometry: THREE.BufferGeometry) => void;
  getBasePose: (objectId: string) => THREE.BufferGeometry | undefined;

  captureCurrentAsShapeKey: (objectId: string, geometry: THREE.BufferGeometry, name?: string) => ShapeKey | null;
  applyShapeKey: (objectId: string, shapeKeyId: string, value?: number) => void;

  blendShapeKeys: (objectId: string) => Float32Array | null;

  getShapeKeysForObject: (objectId: string) => ShapeKey[];
  clearShapeKeysForObject: (objectId: string) => void;
}

export const useMorphTargetStore = create<MorphTargetState>((set, get) => ({
  shapeKeysByObject: new Map(),
  activeShapeKeyId: null,
  basePoses: new Map(),

  createShapeKey: (objectId, name) => {
    const state = get();
    const basePose = state.basePoses.get(objectId);

    if (!basePose) {
      console.warn('No base pose stored for object', objectId);
      return null;
    }

    const positions = basePose.attributes.position;
    if (!positions) return null;

    const shapeKey: ShapeKey = {
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Shape Key ${(state.shapeKeysByObject.get(objectId)?.length || 0) + 1}`,
      objectId,
      positions: new Float32Array(positions.array),
      normals: basePose.attributes.normal ? new Float32Array(basePose.attributes.normal.array) : undefined,
      value: 0,
      createdAt: Date.now(),
    };

    set(state => {
      const newMap = new Map(state.shapeKeysByObject);
      const objectKeys = newMap.get(objectId) || [];
      newMap.set(objectId, [...objectKeys, shapeKey]);
      return { shapeKeysByObject: newMap };
    });

    return shapeKey;
  },

  updateShapeKey: (id, updates) => {
    set(state => {
      const newMap = new Map(state.shapeKeysByObject);

      for (const [objectId, keys] of newMap) {
        const keyIndex = keys.findIndex(k => k.id === id);
        if (keyIndex !== -1) {
          const updatedKeys = [...keys];
          updatedKeys[keyIndex] = { ...keys[keyIndex], ...updates };
          newMap.set(objectId, updatedKeys);
          break;
        }
      }

      return { shapeKeysByObject: newMap };
    });
  },

  deleteShapeKey: (id) => {
    set(state => {
      const newMap = new Map(state.shapeKeysByObject);

      for (const [objectId, keys] of newMap) {
        const filteredKeys = keys.filter(k => k.id !== id);
        if (filteredKeys.length !== keys.length) {
          newMap.set(objectId, filteredKeys);
          break;
        }
      }

      return {
        shapeKeysByObject: newMap,
        activeShapeKeyId: state.activeShapeKeyId === id ? null : state.activeShapeKeyId,
      };
    });
  },

  setShapeKeyValue: (id, value) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    get().updateShapeKey(id, { value: clampedValue });
  },

  setActiveShapeKey: (id) => {
    set({ activeShapeKeyId: id });
  },

  storeBasePose: (objectId, geometry) => {
    set(state => {
      const newBasePoses = new Map(state.basePoses);
      newBasePoses.set(objectId, geometry.clone());
      return { basePoses: newBasePoses };
    });
  },

  getBasePose: (objectId) => {
    return get().basePoses.get(objectId);
  },

  captureCurrentAsShapeKey: (objectId, geometry, name) => {
    const state = get();

    // Store base pose if not already stored
    if (!state.basePoses.has(objectId)) {
      state.storeBasePose(objectId, geometry);
    }

    const positions = geometry.attributes.position;
    if (!positions) return null;

    const shapeKey: ShapeKey = {
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Shape Key ${(state.shapeKeysByObject.get(objectId)?.length || 0) + 1}`,
      objectId,
      positions: new Float32Array(positions.array),
      normals: geometry.attributes.normal ? new Float32Array(geometry.attributes.normal.array) : undefined,
      value: 0,
      createdAt: Date.now(),
    };

    set(state => {
      const newMap = new Map(state.shapeKeysByObject);
      const objectKeys = newMap.get(objectId) || [];
      newMap.set(objectId, [...objectKeys, shapeKey]);
      return { shapeKeysByObject: newMap };
    });

    return shapeKey;
  },

  applyShapeKey: (objectId, shapeKeyId, value = 1) => {
    const state = get();
    const shapeKeys = state.shapeKeysByObject.get(objectId);
    const shapeKey = shapeKeys?.find(k => k.id === shapeKeyId);

    if (!shapeKey) return;

    // This would be called by the component that has access to the mesh
    // The actual application happens in the component
    state.setShapeKeyValue(shapeKeyId, value);
  },

  blendShapeKeys: (objectId) => {
    const state = get();
    const basePose = state.basePoses.get(objectId);
    const shapeKeys = state.shapeKeysByObject.get(objectId) || [];

    if (!basePose || shapeKeys.length === 0) return null;

    const basePositions = basePose.attributes.position.array as Float32Array;
    const blendedPositions = new Float32Array(basePositions.length);

    // Start with base pose
    blendedPositions.set(basePositions);

    // Apply each shape key based on its value
    for (const shapeKey of shapeKeys) {
      if (shapeKey.value > 0) {
        for (let i = 0; i < blendedPositions.length; i++) {
          // Linear interpolation between base and shape key
          const delta = shapeKey.positions[i] - basePositions[i];
          blendedPositions[i] += delta * shapeKey.value;
        }
      }
    }

    return blendedPositions;
  },

  getShapeKeysForObject: (objectId) => {
    return get().shapeKeysByObject.get(objectId) || [];
  },

  clearShapeKeysForObject: (objectId) => {
    set(state => {
      const newMap = new Map(state.shapeKeysByObject);
      newMap.delete(objectId);

      const newBasePoses = new Map(state.basePoses);
      newBasePoses.delete(objectId);

      return {
        shapeKeysByObject: newMap,
        basePoses: newBasePoses,
      };
    });
  },
}));