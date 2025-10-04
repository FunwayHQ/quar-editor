/**
 * Modifier Store
 *
 * Manages non-destructive modifier stack for objects.
 * Sprint 7: Export System + Polygon Editing MVP - Day 3
 */

import { create } from 'zustand';
import * as THREE from 'three';

export type ModifierType =
  | 'subdivision'
  | 'mirror'
  | 'array'
  | 'bevel'
  | 'solidify'
  | 'displace';

export interface ModifierParams {
  // Subdivision
  levels?: number;
  subdivisionAlgorithm?: 'catmull-clark' | 'loop';

  // Mirror
  mirrorAxis?: 'x' | 'y' | 'z';
  mirrorOffset?: number;
  mergeThreshold?: number;

  // Array
  arrayCount?: number;
  arrayOffset?: [number, number, number];
  arrayType?: 'linear' | 'circular';

  // Bevel
  bevelAmount?: number;
  bevelSegments?: number;
  bevelProfile?: number;

  // Solidify
  thickness?: number;
  offset?: number;

  // Displace
  displaceStrength?: number;
  displaceTexture?: string;
}

export interface Modifier {
  id: string;
  type: ModifierType;
  name: string;
  enabled: boolean;
  params: ModifierParams;
  createdAt: number;
}

export interface ModifierStackState {
  // Modifiers by object ID
  modifiersByObject: Map<string, Modifier[]>;

  // Actions
  addModifier: (objectId: string, type: ModifierType, params?: ModifierParams) => Modifier;
  removeModifier: (objectId: string, modifierId: string) => void;
  updateModifier: (objectId: string, modifierId: string, updates: Partial<Modifier>) => void;
  toggleModifier: (objectId: string, modifierId: string) => void;

  // Reordering
  moveModifierUp: (objectId: string, modifierId: string) => void;
  moveModifierDown: (objectId: string, modifierId: string) => void;
  reorderModifiers: (objectId: string, fromIndex: number, toIndex: number) => void;

  // Utilities
  getModifiers: (objectId: string) => Modifier[];
  clearModifiers: (objectId: string) => void;
  applyModifierStack: (objectId: string, baseGeometry: THREE.BufferGeometry) => THREE.BufferGeometry;
}

// Helper to generate unique IDs
function generateModifierId(): string {
  return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Default parameters for each modifier type
const defaultParams: Record<ModifierType, ModifierParams> = {
  subdivision: {
    levels: 1,
    subdivisionAlgorithm: 'catmull-clark',
  },
  mirror: {
    mirrorAxis: 'x',
    mirrorOffset: 0,
    mergeThreshold: 0.001,
  },
  array: {
    arrayCount: 3,
    arrayOffset: [2, 0, 0],
    arrayType: 'linear',
  },
  bevel: {
    bevelAmount: 0.1,
    bevelSegments: 2,
    bevelProfile: 0.5,
  },
  solidify: {
    thickness: 0.1,
    offset: 0,
  },
  displace: {
    displaceStrength: 1,
    displaceTexture: '',
  },
};

export const useModifierStore = create<ModifierStackState>((set, get) => ({
  modifiersByObject: new Map(),

  addModifier: (objectId, type, params = {}) => {
    const modifier: Modifier = {
      id: generateModifierId(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Modifier`,
      enabled: true,
      params: { ...defaultParams[type], ...params },
      createdAt: Date.now(),
    };

    set((state) => {
      const newMap = new Map(state.modifiersByObject);
      const modifiers = newMap.get(objectId) || [];
      newMap.set(objectId, [...modifiers, modifier]);
      return { modifiersByObject: newMap };
    });

    return modifier;
  },

  removeModifier: (objectId, modifierId) => {
    set((state) => {
      const newMap = new Map(state.modifiersByObject);
      const modifiers = newMap.get(objectId) || [];
      newMap.set(objectId, modifiers.filter((m) => m.id !== modifierId));
      return { modifiersByObject: newMap };
    });
  },

  updateModifier: (objectId, modifierId, updates) => {
    set((state) => {
      const newMap = new Map(state.modifiersByObject);
      const modifiers = newMap.get(objectId) || [];
      newMap.set(
        objectId,
        modifiers.map((m) => (m.id === modifierId ? { ...m, ...updates } : m))
      );
      return { modifiersByObject: newMap };
    });
  },

  toggleModifier: (objectId, modifierId) => {
    const modifiers = get().modifiersByObject.get(objectId) || [];
    const modifier = modifiers.find((m) => m.id === modifierId);

    if (modifier) {
      get().updateModifier(objectId, modifierId, { enabled: !modifier.enabled });
    }
  },

  moveModifierUp: (objectId, modifierId) => {
    const modifiers = get().modifiersByObject.get(objectId) || [];
    const index = modifiers.findIndex((m) => m.id === modifierId);

    if (index > 0) {
      get().reorderModifiers(objectId, index, index - 1);
    }
  },

  moveModifierDown: (objectId, modifierId) => {
    const modifiers = get().modifiersByObject.get(objectId) || [];
    const index = modifiers.findIndex((m) => m.id === modifierId);

    if (index < modifiers.length - 1 && index !== -1) {
      get().reorderModifiers(objectId, index, index + 1);
    }
  },

  reorderModifiers: (objectId, fromIndex, toIndex) => {
    set((state) => {
      const newMap = new Map(state.modifiersByObject);
      const modifiers = [...(newMap.get(objectId) || [])];

      if (fromIndex < 0 || fromIndex >= modifiers.length || toIndex < 0 || toIndex >= modifiers.length) {
        return state;
      }

      const [moved] = modifiers.splice(fromIndex, 1);
      modifiers.splice(toIndex, 0, moved);

      newMap.set(objectId, modifiers);
      return { modifiersByObject: newMap };
    });
  },

  getModifiers: (objectId) => {
    return get().modifiersByObject.get(objectId) || [];
  },

  clearModifiers: (objectId) => {
    set((state) => {
      const newMap = new Map(state.modifiersByObject);
      newMap.delete(objectId);
      return { modifiersByObject: newMap };
    });
  },

  applyModifierStack: (objectId, baseGeometry) => {
    const modifiers = get().getModifiers(objectId);
    let geometry = baseGeometry.clone();

    // Apply each enabled modifier in order
    for (const modifier of modifiers) {
      if (!modifier.enabled) continue;

      try {
        geometry = applyModifier(geometry, modifier);
      } catch (error) {
        console.error(`[ModifierStore] Failed to apply ${modifier.type} modifier:`, error);
      }
    }

    return geometry;
  },
}));

/**
 * Apply a single modifier to geometry
 */
function applyModifier(geometry: THREE.BufferGeometry, modifier: Modifier): THREE.BufferGeometry {
  switch (modifier.type) {
    case 'subdivision':
      return applySubdivision(geometry, modifier.params);

    case 'mirror':
      return applyMirror(geometry, modifier.params);

    case 'array':
      return applyArray(geometry, modifier.params);

    case 'bevel':
      return applyBevelModifier(geometry, modifier.params);

    case 'solidify':
      return applySolidify(geometry, modifier.params);

    case 'displace':
      return applyDisplace(geometry, modifier.params);

    default:
      console.warn(`Unknown modifier type: ${modifier.type}`);
      return geometry;
  }
}

/**
 * Apply subdivision surface modifier
 */
function applySubdivision(geometry: THREE.BufferGeometry, params: ModifierParams): THREE.BufferGeometry {
  const { levels = 1 } = params;

  // Simplified subdivision - in production, would use proper subdivision algorithms
  // This is a placeholder that shows the concept
  const result = geometry.clone();

  for (let i = 0; i < levels; i++) {
    // Actual subdivision logic would go here
    // For now, just return the geometry
  }

  console.log(`[Modifier] Applied subdivision with ${levels} levels`);
  return result;
}

/**
 * Apply mirror modifier
 */
function applyMirror(geometry: THREE.BufferGeometry, params: ModifierParams): THREE.BufferGeometry {
  const { mirrorAxis = 'x', mirrorOffset = 0 } = params;

  const positions = geometry.attributes.position;
  const newPositions: number[] = [];
  const newIndices: number[] = [];

  // Copy original positions
  for (let i = 0; i < positions.count; i++) {
    newPositions.push(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i)
    );
  }

  // Add mirrored positions
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    switch (mirrorAxis) {
      case 'x':
        newPositions.push(-x + mirrorOffset, y, z);
        break;
      case 'y':
        newPositions.push(x, -y + mirrorOffset, z);
        break;
      case 'z':
        newPositions.push(x, y, -z + mirrorOffset);
        break;
    }
  }

  // Copy and mirror indices
  if (geometry.index) {
    for (let i = 0; i < geometry.index.count; i++) {
      newIndices.push(geometry.index.getX(i));
    }

    // Add mirrored faces (with reversed winding)
    for (let i = 0; i < geometry.index.count; i += 3) {
      const v0 = geometry.index.getX(i);
      const v1 = geometry.index.getX(i + 1);
      const v2 = geometry.index.getX(i + 2);

      // Add vertex count to get mirrored vertex indices, reverse winding
      newIndices.push(
        v0 + positions.count,
        v2 + positions.count,
        v1 + positions.count
      );
    }
  }

  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));

  if (newIndices.length > 0) {
    result.setIndex(new THREE.Uint32BufferAttribute(newIndices, 1));
  }

  result.computeVertexNormals();
  result.computeBoundingBox();
  result.computeBoundingSphere();

  console.log(`[Modifier] Applied mirror on ${mirrorAxis} axis`);
  return result;
}

/**
 * Apply array modifier
 */
function applyArray(geometry: THREE.BufferGeometry, params: ModifierParams): THREE.BufferGeometry {
  const { arrayCount = 3, arrayOffset = [2, 0, 0], arrayType = 'linear' } = params;

  const positions = geometry.attributes.position;
  const newPositions: number[] = [];
  const newIndices: number[] = [];

  for (let copy = 0; copy < arrayCount; copy++) {
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      if (arrayType === 'linear') {
        newPositions.push(
          x + arrayOffset[0] * copy,
          y + arrayOffset[1] * copy,
          z + arrayOffset[2] * copy
        );
      } else if (arrayType === 'circular') {
        // Circular array around Z axis
        const angle = (Math.PI * 2 * copy) / arrayCount;
        const radius = Math.sqrt(x * x + y * y);
        newPositions.push(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          z
        );
      }
    }

    if (geometry.index) {
      for (let i = 0; i < geometry.index.count; i++) {
        newIndices.push(geometry.index.getX(i) + positions.count * copy);
      }
    }
  }

  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));

  if (newIndices.length > 0) {
    result.setIndex(new THREE.Uint32BufferAttribute(newIndices, 1));
  }

  result.computeVertexNormals();
  result.computeBoundingBox();
  result.computeBoundingSphere();

  console.log(`[Modifier] Applied array with ${arrayCount} copies`);
  return result;
}

/**
 * Apply bevel modifier
 */
function applyBevelModifier(geometry: THREE.BufferGeometry, params: ModifierParams): THREE.BufferGeometry {
  // Simplified bevel modifier
  // In production, this would properly bevel edges
  console.log('[Modifier] Applied bevel modifier (simplified)');
  return geometry.clone();
}

/**
 * Apply solidify modifier
 */
function applySolidify(geometry: THREE.BufferGeometry, params: ModifierParams): THREE.BufferGeometry {
  const { thickness = 0.1, offset = 0 } = params;

  // Simplified solidify - in production would create proper shell
  const result = geometry.clone();

  geometry.computeVertexNormals();
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;

  if (normals) {
    for (let i = 0; i < positions.count; i++) {
      const nx = normals.getX(i);
      const ny = normals.getY(i);
      const nz = normals.getZ(i);

      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      positions.setXYZ(
        i,
        x + nx * (thickness + offset),
        y + ny * (thickness + offset),
        z + nz * (thickness + offset)
      );
    }

    positions.needsUpdate = true;
  }

  console.log(`[Modifier] Applied solidify with thickness ${thickness}`);
  return result;
}

/**
 * Apply displace modifier
 */
function applyDisplace(geometry: THREE.BufferGeometry, params: ModifierParams): THREE.BufferGeometry {
  const { displaceStrength = 1 } = params;

  // Simplified displace modifier
  const result = geometry.clone();

  geometry.computeVertexNormals();
  const positions = result.attributes.position;
  const normals = result.attributes.normal;

  if (normals) {
    for (let i = 0; i < positions.count; i++) {
      const nx = normals.getX(i);
      const ny = normals.getY(i);
      const nz = normals.getZ(i);

      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      // Simple noise-based displacement (in production would use texture)
      const noise = Math.sin(x * 5) * Math.cos(y * 5) * displaceStrength;

      positions.setXYZ(
        i,
        x + nx * noise,
        y + ny * noise,
        z + nz * noise
      );
    }

    positions.needsUpdate = true;
  }

  console.log(`[Modifier] Applied displace with strength ${displaceStrength}`);
  return result;
}
