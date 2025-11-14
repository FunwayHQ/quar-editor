/**
 * Objects Store
 *
 * Manages 3D objects in the scene, including creation, modification, and hierarchy.
 */

import { create } from 'zustand';
import * as THREE from 'three';
import { calculateGroupCenter, wouldCreateCircularDependency } from '../lib/hierarchy/TransformUtils';
import { QMesh } from '../lib/qmesh/QMesh';
import { meshRegistry } from '../lib/mesh/MeshRegistry';

export type ObjectType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'group' | 'camera' | 'imported' | 'pointLight' | 'spotLight' | 'directionalLight' | 'ambientLight' | 'bone' | 'armature';

// Bone influence: how much a bone affects a vertex
export interface BoneInfluence {
  boneId: string;
  weight: number;  // 0-1, typically sums to 1.0 per vertex
}

// Skin weights: vertex index -> bone influences
export interface SkinWeights {
  [vertexIndex: number]: BoneInfluence[];
}

// Bone pose: position, rotation (quaternion), scale
export interface BonePose {
  position: [number, number, number];
  rotation: [number, number, number, number];  // Quaternion [x, y, z, w]
  scale: [number, number, number];
}

// Skin data: binding between mesh and armature
export interface SkinData {
  armatureId: string;                          // Which armature this mesh is bound to
  weights: SkinWeights;                        // Vertex weights for skinning
  bindMatrix: number[];                        // Inverse bind matrix (16 floats)
  bindPose: Map<string, BonePose>;             // Rest pose for each bone
}

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

  // NEW: Half-Edge Mesh (Source of Truth for editing)
  qMesh?: QMesh;

  // NEW: Render Geometry (Compiled from qMesh for rendering)
  renderGeometry?: THREE.BufferGeometry;

  // DEPRECATED: Old imported geometry data (kept for backward compatibility during migration)
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

  // Bone properties (for type: 'bone')
  boneProps?: {
    headPosition: [number, number, number];  // Bone head (start point)
    tailPosition: [number, number, number];  // Bone tail (end point)
    roll: number;                            // Bone roll angle (twist around bone axis, in radians)
    length: number;                          // Computed bone length
    connected: boolean;                      // Whether bone is connected to parent (head = parent tail)
  };

  // Armature properties (for type: 'armature')
  armatureProps?: {
    rootBoneId: string | null;               // Root bone of this armature
    displayType: 'octahedral' | 'stick' | 'bbone' | 'envelope';  // Bone display style
    inFront: boolean;                        // X-ray display (show through objects)
    axesDisplay: 'none' | 'wire' | 'solid';  // Show bone axes
  };

  // Skinning data (for meshes bound to armature)
  skinData?: SkinData;

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

  // Geometry management (NEW for QMesh architecture)
  updateObjectGeometry: (id: string, newQMesh: QMesh) => void;
  initializeGeometryFromBufferGeometry: (id: string, geometry: THREE.BufferGeometry) => void;

  // Object creation helpers
  createPrimitive: (type: ObjectType, position?: [number, number, number]) => SceneObject;

  // Hierarchy
  setParent: (childId: string, parentId: string | null) => void;
  getChildren: (id: string) => SceneObject[];

  // Grouping operations
  createGroup: (objectIds: string[]) => string; // Returns group ID
  ungroup: (groupId: string) => void;
  createEmptyGroup: () => SceneObject;

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

  // Serialization
  serialize: () => any[];
  deserialize: (data: any) => void;
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
  bone: 0,
  armature: 0,
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
  bone: {},
  armature: {},
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

  // NEW: Update object geometry (QMesh architecture)
  updateObjectGeometry: (id, newQMesh) => set((state) => {
    const newObjects = new Map(state.objects);
    const object = newObjects.get(id);

    if (object) {
      // Dispose old render geometry if it exists
      if (object.renderGeometry) {
        object.renderGeometry.dispose();
      }

      // Compile the new QMesh to BufferGeometry
      const renderGeometry = newQMesh.toBufferGeometry();

      newObjects.set(id, {
        ...object,
        qMesh: newQMesh,
        renderGeometry,
        modifiedAt: Date.now(),
      });
    }

    return { objects: newObjects };
  }),

  // NEW: Initialize geometry from BufferGeometry (for primitives and imported meshes)
  initializeGeometryFromBufferGeometry: (id, geometry) => {
    const state = get();
    const object = state.objects.get(id);

    if (!object) return;

    // Decompile the BufferGeometry to QMesh
    const qMesh = QMesh.fromBufferGeometry(geometry);

    // Re-compile to ensure clean render geometry with triangleFaceMap
    const renderGeometry = qMesh.toBufferGeometry();

    state.updateObject(id, {
      qMesh,
      renderGeometry,
    });
  },

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

  // Grouping operations
  createGroup: (objectIds) => {
    if (objectIds.length === 0) {
      throw new Error('Cannot create group with no objects');
    }

    const state = get();

    // Validate all objects exist and get them
    const objectsToGroup = objectIds
      .map(id => state.objects.get(id))
      .filter((obj): obj is SceneObject => obj !== undefined);

    if (objectsToGroup.length === 0) {
      throw new Error('No valid objects to group');
    }

    // Calculate center position of all objects (in world space)
    const centerPosition = calculateGroupCenter(objectIds);

    // Create the group object
    const groupName = state.generateName('group');
    const now = Date.now();
    const groupId = generateId();

    // Do everything in a single atomic state update to prevent duplication
    set((state) => {
      const newObjects = new Map(state.objects);

      // Create the group
      const group: SceneObject = {
        id: groupId,
        name: groupName,
        type: 'group',
        visible: true,
        locked: false,
        position: centerPosition,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [...objectIds], // Will contain all child IDs
        createdAt: now,
        modifiedAt: now,
      };

      // Add group to map
      newObjects.set(groupId, group);

      // Update each child to point to this group as parent
      // IMPORTANT: Convert world positions to local positions relative to group
      objectIds.forEach(childId => {
        const child = newObjects.get(childId);
        if (child) {
          // Remove from old parent if it had one
          if (child.parentId) {
            const oldParent = newObjects.get(child.parentId);
            if (oldParent) {
              oldParent.children = oldParent.children.filter(id => id !== childId);
            }
          }

          // Convert child's current position to local space relative to group
          // Since the group has no rotation/scale yet, this is simple subtraction
          child.position = [
            child.position[0] - centerPosition[0],
            child.position[1] - centerPosition[1],
            child.position[2] - centerPosition[2],
          ];

          // Set new parent
          child.parentId = groupId;
          child.modifiedAt = now;
        }
      });

      return { objects: newObjects };
    });

    return groupId;
  },

  ungroup: (groupId) => {
    const state = get();
    const group = state.objects.get(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    if (group.type !== 'group') {
      throw new Error(`Object ${groupId} is not a group`);
    }

    // Get all children
    const childIds = [...group.children];

    // Do everything in a single atomic state update
    set((state) => {
      const newObjects = new Map(state.objects);
      const group = newObjects.get(groupId);

      if (!group) return state;

      // Convert children's local positions back to world positions
      childIds.forEach(childId => {
        const child = newObjects.get(childId);
        if (child) {
          // Convert local position to world position
          // child.world = group.position + child.local
          child.position = [
            group.position[0] + child.position[0],
            group.position[1] + child.position[1],
            group.position[2] + child.position[2],
          ];

          // Set parent to group's parent (or null)
          child.parentId = group.parentId;

          // If moving to a new parent, add to that parent's children
          if (group.parentId) {
            const newParent = newObjects.get(group.parentId);
            if (newParent && !newParent.children.includes(childId)) {
              newParent.children.push(childId);
            }
          }

          child.modifiedAt = Date.now();
        }
      });

      // Delete the group
      newObjects.delete(groupId);

      // Remove group from its parent's children if it had a parent
      if (group.parentId) {
        const parent = newObjects.get(group.parentId);
        if (parent) {
          parent.children = parent.children.filter(id => id !== groupId);
        }
      }

      return { objects: newObjects };
    });
  },

  createEmptyGroup: () => {
    const state = get();
    const groupName = state.generateName('group');
    const now = Date.now();

    const group: SceneObject = {
      id: generateId(),
      name: groupName,
      type: 'group',
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      createdAt: now,
      modifiedAt: now,
    };

    state.addObject(group);
    return group;
  },

  // Serialization
  serialize: () => {
    const state = get();

    // Serialize objects with current geometry from mesh registry
    const objects = Array.from(state.objects.values()).map(obj => {
      const mesh = meshRegistry.getMesh(obj.id);

      // If mesh exists in registry with modified geometry, serialize it
      if (mesh && mesh.geometry) {
        const geometry = mesh.geometry;
        const geometryData = {
          attributes: {} as any,
          index: null as any,
        };

        // Serialize position attribute
        if (geometry.attributes.position) {
          const pos = geometry.attributes.position;
          geometryData.attributes.position = {
            array: Array.from(pos.array),
            itemSize: pos.itemSize,
          };
        }

        // Serialize normal attribute
        if (geometry.attributes.normal) {
          const norm = geometry.attributes.normal;
          geometryData.attributes.normal = {
            array: Array.from(norm.array),
            itemSize: norm.itemSize,
          };
        }

        // Serialize UV attribute
        if (geometry.attributes.uv) {
          const uv = geometry.attributes.uv;
          geometryData.attributes.uv = {
            array: Array.from(uv.array),
            itemSize: uv.itemSize,
          };
        }

        // Serialize index
        if (geometry.index) {
          geometryData.index = {
            array: Array.from(geometry.index.array),
          };
        }

        // Log that we're saving modified geometry
        console.log(`[objectsStore] Saving modified geometry for ${obj.name}, vertices: ${geometryData.attributes.position?.array.length / 3}`);

        // Return object with updated geometry data
        return {
          ...obj,
          importedGeometry: {
            ...obj.importedGeometry,
            data: geometryData,
          }
        };
      }

      // Return object as-is if no mesh in registry
      return obj;
    });

    console.log(`[objectsStore] Serializing ${objects.length} objects`);
    return objects;
  },

  deserialize: (data: any) => {
    if (!data || !Array.isArray(data)) {
      console.warn('[objectsStore] Invalid data for deserialization');
      return;
    }

    console.log(`[objectsStore] Loading ${data.length} objects from saved data`);

    set((state) => {
      const newObjects = new Map<string, SceneObject>();

      data.forEach((obj: any) => {
        // Log if object has saved geometry data
        if (obj.geometry?.data) {
          console.log(`[objectsStore] Object ${obj.name} has saved geometry data (${obj.geometry.data.attributes?.position?.array.length / 3} vertices)`);
        }
        newObjects.set(obj.id, obj);
      });

      return { objects: newObjects };
    });
  },
}));
