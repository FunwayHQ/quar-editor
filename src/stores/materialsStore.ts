/**
 * Materials Store
 *
 * Manages materials, textures, and material assignment to objects.
 * Supports PBR (Physically Based Rendering) workflow.
 */

import { create } from 'zustand';

export type MaterialType = 'standard' | 'basic' | 'physical' | 'custom';

export interface Texture {
  id: string;
  name: string;
  type: 'albedo' | 'normal' | 'roughness' | 'metallic' | 'emission' | 'ao' | 'displacement';
  url: string;  // Data URL or blob URL
  width: number;
  height: number;
  size: number;  // File size in bytes
  format: string;  // 'png', 'jpg', 'hdr', etc.
  createdAt: number;
}

export interface Material {
  id: string;
  name: string;
  type: MaterialType;

  // PBR properties
  albedo: string;  // Hex color
  metallic: number;  // 0-1
  roughness: number;  // 0-1
  emission: string;  // Hex color
  emissionIntensity: number;  // 0-10

  // Textures
  albedoMap: string | null;  // Texture ID
  normalMap: string | null;
  roughnessMap: string | null;
  metallicMap: string | null;
  emissionMap: string | null;
  aoMap: string | null;
  displacementMap: string | null;

  // Additional properties
  opacity: number;  // 0-1
  transparent: boolean;
  doubleSided: boolean;

  // Metadata
  createdAt: number;
  modifiedAt: number;
}

export interface MaterialsState {
  // Materials collection
  materials: Map<string, Material>;
  textures: Map<string, Texture>;

  // Selected material (for editing)
  selectedMaterialId: string | null;

  // Material management
  addMaterial: (material: Material) => void;
  removeMaterial: (id: string) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  getMaterial: (id: string) => Material | undefined;
  getAllMaterials: () => Material[];

  // Texture management
  addTexture: (texture: Texture) => void;
  removeTexture: (id: string) => void;
  getTexture: (id: string) => Texture | undefined;
  getAllTextures: () => Texture[];

  // Material creation helpers
  createMaterial: (name?: string) => Material;
  createMaterialFromPreset: (presetName: string) => Material;

  // Selection
  selectMaterial: (id: string | null) => void;

  // Material presets
  getPresets: () => Material[];

  // Material assignment (link with objects)
  assignMaterialToObject: (objectId: string, materialId: string) => void;
  objectMaterials: Map<string, string>;  // objectId -> materialId
}

// Default material presets
const DEFAULT_PRESETS: Omit<Material, 'id' | 'createdAt' | 'modifiedAt'>[] = [
  {
    name: 'Default',
    type: 'standard',
    albedo: '#888888',
    metallic: 0.3,
    roughness: 0.7,
    emission: '#000000',
    emissionIntensity: 0,
    albedoMap: null,
    normalMap: null,
    roughnessMap: null,
    metallicMap: null,
    emissionMap: null,
    aoMap: null,
    displacementMap: null,
    opacity: 1,
    transparent: false,
    doubleSided: false,
  },
  {
    name: 'Metal',
    type: 'standard',
    albedo: '#C0C0C0',
    metallic: 1.0,
    roughness: 0.2,
    emission: '#000000',
    emissionIntensity: 0,
    albedoMap: null,
    normalMap: null,
    roughnessMap: null,
    metallicMap: null,
    emissionMap: null,
    aoMap: null,
    displacementMap: null,
    opacity: 1,
    transparent: false,
    doubleSided: false,
  },
  {
    name: 'Plastic',
    type: 'standard',
    albedo: '#FF5722',
    metallic: 0.0,
    roughness: 0.5,
    emission: '#000000',
    emissionIntensity: 0,
    albedoMap: null,
    normalMap: null,
    roughnessMap: null,
    metallicMap: null,
    emissionMap: null,
    aoMap: null,
    displacementMap: null,
    opacity: 1,
    transparent: false,
    doubleSided: false,
  },
  {
    name: 'Glass',
    type: 'physical',
    albedo: '#FFFFFF',
    metallic: 0.0,
    roughness: 0.1,
    emission: '#000000',
    emissionIntensity: 0,
    albedoMap: null,
    normalMap: null,
    roughnessMap: null,
    metallicMap: null,
    emissionMap: null,
    aoMap: null,
    displacementMap: null,
    opacity: 0.3,
    transparent: true,
    doubleSided: false,
  },
  {
    name: 'Emissive',
    type: 'standard',
    albedo: '#7C3AED',
    metallic: 0.0,
    roughness: 0.8,
    emission: '#7C3AED',
    emissionIntensity: 2,
    albedoMap: null,
    normalMap: null,
    roughnessMap: null,
    metallicMap: null,
    emissionMap: null,
    aoMap: null,
    displacementMap: null,
    opacity: 1,
    transparent: false,
    doubleSided: false,
  },
];

// Counter for auto-naming
let materialCounter = 0;

// Helper to generate unique IDs
function generateId(): string {
  return `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTextureId(): string {
  return `tex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useMaterialsStore = create<MaterialsState>((set, get) => ({
  // Initial state
  materials: new Map(),
  textures: new Map(),
  selectedMaterialId: null,
  objectMaterials: new Map(),

  // Material management
  addMaterial: (material) => set((state) => {
    const newMaterials = new Map(state.materials);
    newMaterials.set(material.id, material);
    return { materials: newMaterials };
  }),

  removeMaterial: (id) => set((state) => {
    const newMaterials = new Map(state.materials);
    newMaterials.delete(id);

    // Remove material assignments
    const newObjectMaterials = new Map(state.objectMaterials);
    for (const [objId, matId] of newObjectMaterials.entries()) {
      if (matId === id) {
        newObjectMaterials.delete(objId);
      }
    }

    return {
      materials: newMaterials,
      objectMaterials: newObjectMaterials,
      selectedMaterialId: state.selectedMaterialId === id ? null : state.selectedMaterialId,
    };
  }),

  updateMaterial: (id, updates) => set((state) => {
    const newMaterials = new Map(state.materials);
    const material = newMaterials.get(id);

    if (material) {
      newMaterials.set(id, {
        ...material,
        ...updates,
        modifiedAt: Date.now(),
      });
    }

    return { materials: newMaterials };
  }),

  getMaterial: (id) => {
    return get().materials.get(id);
  },

  getAllMaterials: () => {
    return Array.from(get().materials.values());
  },

  // Texture management
  addTexture: (texture) => set((state) => {
    const newTextures = new Map(state.textures);
    newTextures.set(texture.id, texture);
    return { textures: newTextures };
  }),

  removeTexture: (id) => set((state) => {
    const newTextures = new Map(state.textures);
    newTextures.delete(id);

    // Remove texture references from materials
    const newMaterials = new Map(state.materials);
    for (const [matId, material] of newMaterials.entries()) {
      const updates: Partial<Material> = {};

      if (material.albedoMap === id) updates.albedoMap = null;
      if (material.normalMap === id) updates.normalMap = null;
      if (material.roughnessMap === id) updates.roughnessMap = null;
      if (material.metallicMap === id) updates.metallicMap = null;
      if (material.emissionMap === id) updates.emissionMap = null;
      if (material.aoMap === id) updates.aoMap = null;
      if (material.displacementMap === id) updates.displacementMap = null;

      if (Object.keys(updates).length > 0) {
        newMaterials.set(matId, { ...material, ...updates, modifiedAt: Date.now() });
      }
    }

    return { textures: newTextures, materials: newMaterials };
  }),

  getTexture: (id) => {
    return get().textures.get(id);
  },

  getAllTextures: () => {
    return Array.from(get().textures.values());
  },

  // Material creation
  createMaterial: (name) => {
    materialCounter++;
    const now = Date.now();

    const material: Material = {
      id: generateId(),
      name: name || `Material${materialCounter.toString().padStart(3, '0')}`,
      type: 'standard',
      albedo: '#888888',
      metallic: 0.3,
      roughness: 0.7,
      emission: '#000000',
      emissionIntensity: 0,
      albedoMap: null,
      normalMap: null,
      roughnessMap: null,
      metallicMap: null,
      emissionMap: null,
      aoMap: null,
      displacementMap: null,
      opacity: 1,
      transparent: false,
      doubleSided: false,
      createdAt: now,
      modifiedAt: now,
    };

    get().addMaterial(material);
    return material;
  },

  createMaterialFromPreset: (presetName) => {
    const preset = DEFAULT_PRESETS.find(p => p.name === presetName);
    if (!preset) {
      return get().createMaterial();
    }

    materialCounter++;
    const now = Date.now();

    const material: Material = {
      ...preset,
      id: generateId(),
      name: `${preset.name}${materialCounter.toString().padStart(3, '0')}`,
      createdAt: now,
      modifiedAt: now,
    };

    get().addMaterial(material);
    return material;
  },

  // Selection
  selectMaterial: (id) => set({ selectedMaterialId: id }),

  // Presets
  getPresets: () => {
    return DEFAULT_PRESETS.map((preset, index) => ({
      ...preset,
      id: `preset_${index}`,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    }));
  },

  // Material assignment
  assignMaterialToObject: (objectId, materialId) => set((state) => {
    const newObjectMaterials = new Map(state.objectMaterials);
    newObjectMaterials.set(objectId, materialId);
    return { objectMaterials: newObjectMaterials };
  }),
}));

// Helper to generate texture ID
export { generateTextureId };
