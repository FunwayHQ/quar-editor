/**
 * Materials Store Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMaterialsStore } from '../materialsStore';

describe('materialsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useMaterialsStore.setState({
      materials: new Map(),
      textures: new Map(),
      selectedMaterialId: null,
      objectMaterials: new Map(),
    });
  });

  describe('Material Creation', () => {
    it('should create a default material', () => {
      const material = useMaterialsStore.getState().createMaterial();

      expect(material.type).toBe('standard');
      expect(material.name).toMatch(/^Material\d{3}$/);
      expect(material.albedo).toBe('#888888');
      expect(material.metallic).toBe(0.3);
      expect(material.roughness).toBe(0.7);
      expect(material.opacity).toBe(1);
      expect(material.transparent).toBe(false);
    });

    it('should create material with custom name', () => {
      const material = useMaterialsStore.getState().createMaterial('Custom Mat');

      expect(material.name).toBe('Custom Mat');
    });

    it('should create material from preset', () => {
      const material = useMaterialsStore.getState().createMaterialFromPreset('Metal');

      expect(material.name).toMatch(/^Metal\d{3}$/);
      expect(material.metallic).toBe(1.0);
      expect(material.roughness).toBe(0.2);
    });

    it('should create glass material from preset', () => {
      const material = useMaterialsStore.getState().createMaterialFromPreset('Glass');

      expect(material.transparent).toBe(true);
      expect(material.opacity).toBe(0.3);
    });

    it('should create emissive material from preset', () => {
      const material = useMaterialsStore.getState().createMaterialFromPreset('Emissive');

      expect(material.emissionIntensity).toBe(2);
    });

    it('should return all presets', () => {
      const presets = useMaterialsStore.getState().getPresets();

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.find(p => p.name === 'Default')).toBeDefined();
      expect(presets.find(p => p.name === 'Metal')).toBeDefined();
      expect(presets.find(p => p.name === 'Plastic')).toBeDefined();
      expect(presets.find(p => p.name === 'Glass')).toBeDefined();
      expect(presets.find(p => p.name === 'Emissive')).toBeDefined();
    });
  });

  describe('Material Management', () => {
    it('should add material to store', () => {
      const material = useMaterialsStore.getState().createMaterial();

      const retrieved = useMaterialsStore.getState().getMaterial(material.id);
      expect(retrieved).toEqual(material);
    });

    it('should get all materials', () => {
      useMaterialsStore.getState().createMaterial();
      useMaterialsStore.getState().createMaterial();

      const allMaterials = useMaterialsStore.getState().getAllMaterials();
      expect(allMaterials).toHaveLength(2);
    });

    it('should update material properties', () => {
      const material = useMaterialsStore.getState().createMaterial();

      useMaterialsStore.getState().updateMaterial(material.id, {
        albedo: '#FF0000',
        metallic: 0.8,
        roughness: 0.2,
      });

      const updated = useMaterialsStore.getState().getMaterial(material.id);
      expect(updated?.albedo).toBe('#FF0000');
      expect(updated?.metallic).toBe(0.8);
      expect(updated?.roughness).toBe(0.2);
    });

    it('should remove material from store', () => {
      const material = useMaterialsStore.getState().createMaterial();

      useMaterialsStore.getState().removeMaterial(material.id);

      const retrieved = useMaterialsStore.getState().getMaterial(material.id);
      expect(retrieved).toBeUndefined();
    });

    it('should remove material assignments when deleting material', () => {
      const material = useMaterialsStore.getState().createMaterial();
      useMaterialsStore.getState().assignMaterialToObject('obj1', material.id);
      useMaterialsStore.getState().assignMaterialToObject('obj2', material.id);

      useMaterialsStore.getState().removeMaterial(material.id);

      const objectMaterials = useMaterialsStore.getState().objectMaterials;
      expect(objectMaterials.get('obj1')).toBeUndefined();
      expect(objectMaterials.get('obj2')).toBeUndefined();
    });
  });

  describe('Texture Management', () => {
    it('should add texture to store', () => {
      const texture = {
        id: 'tex_001',
        name: 'test.png',
        type: 'albedo' as const,
        url: 'data:image/png;base64,test',
        width: 512,
        height: 512,
        size: 1024,
        format: 'png',
        createdAt: Date.now(),
      };

      useMaterialsStore.getState().addTexture(texture);

      const retrieved = useMaterialsStore.getState().getTexture(texture.id);
      expect(retrieved).toEqual(texture);
    });

    it('should get all textures', () => {
      const tex1 = {
        id: 'tex_001',
        name: 'test1.png',
        type: 'albedo' as const,
        url: 'data:image/png;base64,test1',
        width: 512,
        height: 512,
        size: 1024,
        format: 'png',
        createdAt: Date.now(),
      };

      const tex2 = {
        id: 'tex_002',
        name: 'test2.png',
        type: 'normal' as const,
        url: 'data:image/png;base64,test2',
        width: 512,
        height: 512,
        size: 1024,
        format: 'png',
        createdAt: Date.now(),
      };

      useMaterialsStore.getState().addTexture(tex1);
      useMaterialsStore.getState().addTexture(tex2);

      const allTextures = useMaterialsStore.getState().getAllTextures();
      expect(allTextures).toHaveLength(2);
    });

    it('should remove texture from store', () => {
      const texture = {
        id: 'tex_001',
        name: 'test.png',
        type: 'albedo' as const,
        url: 'data:image/png;base64,test',
        width: 512,
        height: 512,
        size: 1024,
        format: 'png',
        createdAt: Date.now(),
      };

      useMaterialsStore.getState().addTexture(texture);
      useMaterialsStore.getState().removeTexture(texture.id);

      const retrieved = useMaterialsStore.getState().getTexture(texture.id);
      expect(retrieved).toBeUndefined();
    });

    it('should remove texture references from materials when deleting texture', () => {
      const texture = {
        id: 'tex_001',
        name: 'test.png',
        type: 'albedo' as const,
        url: 'data:image/png;base64,test',
        width: 512,
        height: 512,
        size: 1024,
        format: 'png',
        createdAt: Date.now(),
      };

      useMaterialsStore.getState().addTexture(texture);

      const material = useMaterialsStore.getState().createMaterial();
      useMaterialsStore.getState().updateMaterial(material.id, {
        albedoMap: texture.id,
        normalMap: texture.id,
      });

      useMaterialsStore.getState().removeTexture(texture.id);

      const updated = useMaterialsStore.getState().getMaterial(material.id);
      expect(updated?.albedoMap).toBeNull();
      expect(updated?.normalMap).toBeNull();
    });
  });

  describe('Material Assignment', () => {
    it('should assign material to object', () => {
      const material = useMaterialsStore.getState().createMaterial();

      useMaterialsStore.getState().assignMaterialToObject('obj1', material.id);

      const objectMaterials = useMaterialsStore.getState().objectMaterials;
      expect(objectMaterials.get('obj1')).toBe(material.id);
    });

    it('should reassign material to object', () => {
      const mat1 = useMaterialsStore.getState().createMaterial();
      const mat2 = useMaterialsStore.getState().createMaterial();

      useMaterialsStore.getState().assignMaterialToObject('obj1', mat1.id);
      useMaterialsStore.getState().assignMaterialToObject('obj1', mat2.id);

      const objectMaterials = useMaterialsStore.getState().objectMaterials;
      expect(objectMaterials.get('obj1')).toBe(mat2.id);
    });
  });

  describe('Material Selection', () => {
    it('should select material', () => {
      const material = useMaterialsStore.getState().createMaterial();

      useMaterialsStore.getState().selectMaterial(material.id);

      expect(useMaterialsStore.getState().selectedMaterialId).toBe(material.id);
    });

    it('should deselect material', () => {
      const material = useMaterialsStore.getState().createMaterial();

      useMaterialsStore.getState().selectMaterial(material.id);
      useMaterialsStore.getState().selectMaterial(null);

      expect(useMaterialsStore.getState().selectedMaterialId).toBeNull();
    });

    it('should clear selection when deleting selected material', () => {
      const material = useMaterialsStore.getState().createMaterial();

      useMaterialsStore.getState().selectMaterial(material.id);
      useMaterialsStore.getState().removeMaterial(material.id);

      expect(useMaterialsStore.getState().selectedMaterialId).toBeNull();
    });
  });
});
