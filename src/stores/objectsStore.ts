/**
 * Objects Store
 *
 * Manages 3D objects in the scene, including creation, modification, and hierarchy.
 */

import { create } from 'zustand';
import * as THREE from 'three';

export type ObjectType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'group' | 'camera' | 'imported' | 'pointLight' | 'spotLight' | 'directionalLight' | 'ambientLight';

export interface SceneObject {
  id: string;
  name: string;
  type: ObjectType;
  visible: boolean;
  locked: boolean;

  // Transform
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];

  // Hierarchy
  parentId: string | null;
  children: string[];

  // Geometry data (for primitives)
  geometryParams?: Record<string, any>;

  // Imported geometry data (for imported meshes)
  importedGeometry?: {
    vertices: number[];
    normals: number[];
    uvs: number[];
    indices?: number[];
  };

  // Material data
  materialId?: string;

  // Light properties (for light objects)
  lightProps?: {
    color: string;        // Hex color
    intensity: number;    // Light intensity
    distance: number;     // Point/Spot light range (0 = infinite)
    decay: number;        // Light falloff
    castShadow: boolean;  // Enable shadow casting

    // Spot light specific
    angle?: number;       // Cone angle in radians
    penumbra?: number;    // Soft edge (0-1)

    // Directional light specific
    target?: [number, number, number];  // Look-at target

    // Shadow settings
    shadowMapSize?: number;      // 512, 1024, 2048
    shadowBias?: number;
    shadowRadius?: number;
  };

  // Metadata
  createdAt: number;
  modifiedAt: number;
}

export interface ObjectsState {
  // Objects collection
  objects: Map<string, SceneObject>;

  // Object management
  addObject: (object: SceneObject) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  getObject: (id: string) => SceneObject | undefined;
  getAllObjects: () => SceneObject[];

  // Object creation helpers
  createPrimitive: (type: ObjectType, position?: [number, number, number]) => SceneObject;

  // Hierarchy
  setParent: (childId: string, parentId: string | null) => void;
  getChildren: (id: string) => SceneObject[];

  // Naming
  generateName: (type: ObjectType) => string;

  // Selection (integrated with sceneStore)
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  toggleSelection: (id: string, multiSelect?: boolean) => void;

  // Transform mode
  transformMode: 'translate' | 'rotate' | 'scale';
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;

  // Bulk operations
  duplicateObjects: (ids: string[]) => void;
  deleteObjects: (ids: string[]) => void;
}

// Counter for auto-naming
const nameCounters: Record<string, number> = {
  box: 0,
  sphere: 0,
  cylinder: 0,
  cone: 0,
  torus: 0,
  plane: 0,
  group: 0,
  camera: 0,
  imported: 0,
  pointLight: 0,
  spotLight: 0,
  directionalLight: 0,
  ambientLight: 0,
};

// Helper to generate unique IDs
function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Default geometry parameters for each primitive type
const defaultGeometryParams: Record<ObjectType, Record<string, any>> = {
  box: { width: 1, height: 1, depth: 1 },
  sphere: { radius: 0.5, widthSegments: 32, heightSegments: 16 },
  cylinder: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 32 },
  cone: { radius: 0.5, height: 1, radialSegments: 32 },
  torus: { radius: 0.5, tube: 0.2, radialSegments: 16, tubularSegments: 100 },
  plane: { width: 1, height: 1 },
  group: {},
  camera: {},
  imported: {},
  pointLight: {},
  spotLight: {},
  directionalLight: {},
  ambientLight: {},
};

// Default light properties for each light type
const defaultLightProps: Record<'pointLight' | 'spotLight' | 'directionalLight' | 'ambientLight', any> = {
  pointLight: {
    color: '#FFFFFF',
    intensity: 1,
    distance: 0,
    decay: 2,
    castShadow: true,
    shadowMapSize: 1024,
    shadowBias: -0.0001,
    shadowRadius: 1,
  },
  spotLight: {
    color: '#FFFFFF',
    intensity: 1,
    distance: 0,
    decay: 2,
    angle: Math.PI / 6,  // 30 degrees
    penumbra: 0.1,
    castShadow: true,
    target: [0, 0, 0],
    shadowMapSize: 1024,
    shadowBias: -0.0001,
    shadowRadius: 1,
  },
  directionalLight: {
    color: '#FFFFFF',
    intensity: 1,
    distance: 0,
    decay: 0,
    castShadow: true,
    target: [0, 0, 0],
    shadowMapSize: 2048,
    shadowBias: -0.0001,
    shadowRadius: 1,
  },
  ambientLight: {
    color: '#FFFFFF',
    intensity: 0.5,
    distance: 0,
    decay: 0,
    castShadow: false,
  },
};

export const useObjectsStore = create<ObjectsState>((set, get) => ({
  // Initial state
  objects: new Map(),
  selectedIds: [],
  transformMode: 'translate',

  // Object management
  addObject: (object) => set((state) => {
    const newObjects = new Map(state.objects);
    newObjects.set(object.id, object);
    return { objects: newObjects };
  }),

  removeObject: (id) => {
    const state = get();
    const object = state.objects.get(id);

    if (!object) return;

    // Recursively remove children first
    const childrenToRemove = [...object.children];
    childrenToRemove.forEach(childId => {
      state.removeObject(childId);
    });

    set((state) => {
      const newObjects = new Map(state.objects);
      const object = newObjects.get(id);

      if (object) {
        // Remove from parent's children list
        if (object.parentId) {
          const parent = newObjects.get(object.parentId);
          if (parent) {
            parent.children = parent.children.filter(childId => childId !== id);
          }
        }

        newObjects.delete(id);
      }

      return {
        objects: newObjects,
        selectedIds: state.selectedIds.filter(selectedId => selectedId !== id)
      };
    });
  },

  updateObject: (id, updates) => set((state) => {
    const newObjects = new Map(state.objects);
    const object = newObjects.get(id);

    if (object) {
      newObjects.set(id, {
        ...object,
        ...updates,
        modifiedAt: Date.now(),
      });
    }

    return { objects: newObjects };
  }),

  getObject: (id) => {
    return get().objects.get(id);
  },

  getAllObjects: () => {
    return Array.from(get().objects.values());
  },

  // Object creation
  createPrimitive: (type, position = [0, 0, 0]) => {
    const name = get().generateName(type);
    const now = Date.now();

    const isLight = type === 'pointLight' || type === 'spotLight' || type === 'directionalLight' || type === 'ambientLight';

    const object: SceneObject = {
      id: generateId(),
      name,
      type,
      visible: true,
      locked: false,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      geometryParams: defaultGeometryParams[type],
      lightProps: isLight ? defaultLightProps[type as keyof typeof defaultLightProps] : undefined,
      createdAt: now,
      modifiedAt: now,
    };

    get().addObject(object);
    return object;
  },

  // Hierarchy
  setParent: (childId, parentId) => set((state) => {
    const newObjects = new Map(state.objects);
    const child = newObjects.get(childId);

    if (!child) return state;

    // Remove from old parent
    if (child.parentId) {
      const oldParent = newObjects.get(child.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter(id => id !== childId);
      }
    }

    // Add to new parent
    if (parentId) {
      const newParent = newObjects.get(parentId);
      if (newParent && !newParent.children.includes(childId)) {
        newParent.children.push(childId);
      }
    }

    // Update child
    child.parentId = parentId;
    child.modifiedAt = Date.now();

    return { objects: newObjects };
  }),

  getChildren: (id) => {
    const object = get().objects.get(id);
    if (!object) return [];

    return object.children
      .map(childId => get().objects.get(childId))
      .filter((child): child is SceneObject => child !== undefined);
  },

  // Naming
  generateName: (type) => {
    nameCounters[type] = (nameCounters[type] || 0) + 1;
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    return `${typeName}${nameCounters[type].toString().padStart(3, '0')}`;
  },

  // Selection
  setSelectedIds: (ids) => set({ selectedIds: ids }),

  addToSelection: (id) => set((state) => {
    if (state.selectedIds.includes(id)) return state;
    return { selectedIds: [...state.selectedIds, id] };
  }),

  removeFromSelection: (id) => set((state) => ({
    selectedIds: state.selectedIds.filter(selectedId => selectedId !== id)
  })),

  clearSelection: () => set({ selectedIds: [] }),

  toggleSelection: (id, multiSelect = false) => set((state) => {
    const isSelected = state.selectedIds.includes(id);

    if (multiSelect) {
      // Add or remove from selection
      if (isSelected) {
        return { selectedIds: state.selectedIds.filter(selectedId => selectedId !== id) };
      } else {
        return { selectedIds: [...state.selectedIds, id] };
      }
    } else {
      // Single selection
      if (isSelected && state.selectedIds.length === 1) {
        return { selectedIds: [] };
      } else {
        return { selectedIds: [id] };
      }
    }
  }),

  // Transform mode
  setTransformMode: (mode) => set({ transformMode: mode }),

  // Bulk operations
  duplicateObjects: (ids) => {
    const objects = get().getAllObjects();
    const objectsToDuplicate = objects.filter(obj => ids.includes(obj.id));

    const newIds: string[] = [];

    objectsToDuplicate.forEach(obj => {
      const duplicated: SceneObject = {
        ...obj,
        id: generateId(),
        name: get().generateName(obj.type),
        position: [
          obj.position[0] + 0.5,
          obj.position[1],
          obj.position[2] + 0.5,
        ],
        parentId: null, // Don't copy parent relationship
        children: [], // Don't copy children
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      get().addObject(duplicated);
      newIds.push(duplicated.id);
    });

    // Select the duplicated objects
    get().setSelectedIds(newIds);
  },

  deleteObjects: (ids) => {
    ids.forEach(id => {
      get().removeObject(id);
    });
  },
}));
