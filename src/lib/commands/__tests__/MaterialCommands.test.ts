/**
 * Material Commands Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMaterialsStore } from '../../../stores/materialsStore';
import {
  CreateMaterialCommand,
  DeleteMaterialCommand,
  UpdateMaterialCommand,
  AssignMaterialCommand,
} from '../MaterialCommands';

describe('MaterialCommands', () => {
  beforeEach(() => {
    // Reset store before each test
    useMaterialsStore.setState({
      materials: new Map(),
      textures: new Map(),
      selectedMaterialId: null,
      objectMaterials: new Map(),
    });
  });

  describe('CreateMaterialCommand', () => {
    it('should create a material when executed', () => {
      const material = useMaterialsStore.getState().createMaterial();
      useMaterialsStore.getState().removeMaterial(material.id); // Remove it first

      const command = new CreateMaterialCommand(material);
      command.execute();

      const retrieved = useMaterialsStore.getState().getMaterial(material.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(material.id);
    });

    it('should undo material creation', () => {
      const material = useMaterialsStore.getState().createMaterial();
      useMaterialsStore.getState().removeMaterial(material.id);

      const command = new CreateMaterialCommand(material);
      command.execute();
      command.undo();

      const retrieved = useMaterialsStore.getState().getMaterial(material.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return correct description', () => {
      const material = useMaterialsStore.getState().createMaterial('Test Material');
      const command = new CreateMaterialCommand(material);

      expect(command.getDescription()).toBe('Create Test Material');
    });
  });

  describe('DeleteMaterialCommand', () => {
    it('should delete a material when executed', () => {
      const material = useMaterialsStore.getState().createMaterial();

      const command = new DeleteMaterialCommand(material.id);
      command.execute();

      const retrieved = useMaterialsStore.getState().getMaterial(material.id);
      expect(retrieved).toBeUndefined();
    });

    it('should restore material when undone', () => {
      const material = useMaterialsStore.getState().createMaterial();

      const command = new DeleteMaterialCommand(material.id);
      command.execute();
      command.undo();

      const retrieved = useMaterialsStore.getState().getMaterial(material.id);
      expect(retrieved).toBeDefined();
    });

    it('should restore object assignments when undone', () => {
      const material = useMaterialsStore.getState().createMaterial();
      useMaterialsStore.getState().assignMaterialToObject('obj1', material.id);
      useMaterialsStore.getState().assignMaterialToObject('obj2', material.id);

      const command = new DeleteMaterialCommand(material.id);
      command.execute();
      command.undo();

      const objectMaterials = useMaterialsStore.getState().objectMaterials;
      expect(objectMaterials.get('obj1')).toBe(material.id);
      expect(objectMaterials.get('obj2')).toBe(material.id);
    });

    it('should return correct description', () => {
      const material = useMaterialsStore.getState().createMaterial('Test Material');
      const command = new DeleteMaterialCommand(material.id);

      expect(command.getDescription()).toBe('Delete Test Material');
    });
  });

  describe('UpdateMaterialCommand', () => {
    it('should update material properties when executed', () => {
      const material = useMaterialsStore.getState().createMaterial();

      const command = new UpdateMaterialCommand(
        material.id,
        { albedo: material.albedo, metallic: material.metallic },
        { albedo: '#FF0000', metallic: 0.9 }
      );
      command.execute();

      const updated = useMaterialsStore.getState().getMaterial(material.id);
      expect(updated?.albedo).toBe('#FF0000');
      expect(updated?.metallic).toBe(0.9);
    });

    it('should undo property updates', () => {
      const material = useMaterialsStore.getState().createMaterial();
      const originalAlbedo = material.albedo;

      const command = new UpdateMaterialCommand(
        material.id,
        { albedo: originalAlbedo },
        { albedo: '#FF0000' }
      );
      command.execute();
      command.undo();

      const updated = useMaterialsStore.getState().getMaterial(material.id);
      expect(updated?.albedo).toBe(originalAlbedo);
    });

    it('should return correct description', () => {
      const material = useMaterialsStore.getState().createMaterial('Test Material');
      const command = new UpdateMaterialCommand(
        material.id,
        { albedo: material.albedo },
        { albedo: '#FF0000' }
      );

      expect(command.getDescription()).toBe('Update Test Material');
    });
  });

  describe('AssignMaterialCommand', () => {
    it('should assign material to object when executed', () => {
      const material = useMaterialsStore.getState().createMaterial();

      const command = new AssignMaterialCommand('obj1', material.id);
      command.execute();

      const objectMaterials = useMaterialsStore.getState().objectMaterials;
      expect(objectMaterials.get('obj1')).toBe(material.id);
    });

    it('should restore previous material assignment when undone', () => {
      const mat1 = useMaterialsStore.getState().createMaterial();
      const mat2 = useMaterialsStore.getState().createMaterial();

      useMaterialsStore.getState().assignMaterialToObject('obj1', mat1.id);

      const command = new AssignMaterialCommand('obj1', mat2.id);
      command.execute();
      command.undo();

      const objectMaterials = useMaterialsStore.getState().objectMaterials;
      expect(objectMaterials.get('obj1')).toBe(mat1.id);
    });

    it('should remove assignment when undone and no previous material', () => {
      const material = useMaterialsStore.getState().createMaterial();

      const command = new AssignMaterialCommand('obj1', material.id);
      command.execute();
      command.undo();

      const objectMaterials = useMaterialsStore.getState().objectMaterials;
      expect(objectMaterials.get('obj1')).toBeUndefined();
    });

    it('should return correct description', () => {
      const material = useMaterialsStore.getState().createMaterial('Test Material');
      const command = new AssignMaterialCommand('obj1', material.id);

      expect(command.getDescription()).toBe('Assign Test Material');
    });
  });
});
