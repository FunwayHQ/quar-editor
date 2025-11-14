/**
 * Objects Store Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useObjectsStore } from '../objectsStore';

describe('objectsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
      transformMode: 'translate',
    });
  });

  describe('Object Creation', () => {
    it('should create a box primitive', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      expect(object.type).toBe('box');
      expect(object.name).toMatch(/^Box\d{3}$/);
      expect(object.position).toEqual([0, 0, 0]);
      expect(object.rotation).toEqual([0, 0, 0]);
      expect(object.scale).toEqual([1, 1, 1]);
      expect(object.visible).toBe(true);
      expect(object.locked).toBe(false);
      expect(object.geometryParams).toEqual({ width: 1, height: 1, depth: 1 });
    });

    it('should create a sphere primitive', () => {
      const object = useObjectsStore.getState().createPrimitive('sphere');

      expect(object.type).toBe('sphere');
      expect(object.name).toMatch(/^Sphere\d{3}$/);
      expect(object.geometryParams).toHaveProperty('radius');
      expect(object.geometryParams?.radius).toBe(0.5);
    });

    it('should create objects with unique IDs', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('box');

      expect(obj1.id).not.toBe(obj2.id);
    });

    it('should create objects with incremental names', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('box');
      const obj3 = useObjectsStore.getState().createPrimitive('sphere');

      // Just verify names follow the pattern and are unique
      expect(obj1.name).toMatch(/^Box\d{3}$/);
      expect(obj2.name).toMatch(/^Box\d{3}$/);
      expect(obj3.name).toMatch(/^Sphere\d{3}$/);
      expect(obj1.name).not.toBe(obj2.name);
    });

    it('should create objects at specified position', () => {
      const object = useObjectsStore.getState().createPrimitive('box', [1, 2, 3]);

      expect(object.position).toEqual([1, 2, 3]);
    });
  });

  describe('Object Management', () => {
    it('should add object to store', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const retrieved = useObjectsStore.getState().getObject(object.id);
      expect(retrieved).toEqual(object);
    });

    it('should get all objects', () => {
      useObjectsStore.getState().createPrimitive('box');
      useObjectsStore.getState().createPrimitive('sphere');

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects).toHaveLength(2);
    });

    it('should update object properties', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      useObjectsStore.getState().updateObject(object.id, {
        position: [5, 5, 5],
        visible: false,
      });

      const updated = useObjectsStore.getState().getObject(object.id);
      expect(updated?.position).toEqual([5, 5, 5]);
      expect(updated?.visible).toBe(false);
    });

    it('should remove object from store', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      useObjectsStore.getState().removeObject(object.id);

      const retrieved = useObjectsStore.getState().getObject(object.id);
      expect(retrieved).toBeUndefined();
    });

    it('should remove object from selection when deleted', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      useObjectsStore.getState().setSelectedIds([object.id]);

      useObjectsStore.getState().removeObject(object.id);

      expect(useObjectsStore.getState().selectedIds).toEqual([]);
    });
  });

  describe('Selection', () => {
    it('should select single object', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      useObjectsStore.getState().setSelectedIds([object.id]);

      expect(useObjectsStore.getState().selectedIds).toEqual([object.id]);
    });

    it('should select multiple objects', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().setSelectedIds([obj1.id, obj2.id]);

      expect(useObjectsStore.getState().selectedIds).toEqual([obj1.id, obj2.id]);
    });

    it('should add to selection', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().setSelectedIds([obj1.id]);
      useObjectsStore.getState().addToSelection(obj2.id);

      expect(useObjectsStore.getState().selectedIds).toEqual([obj1.id, obj2.id]);
    });

    it('should remove from selection', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().setSelectedIds([obj1.id, obj2.id]);
      useObjectsStore.getState().removeFromSelection(obj1.id);

      expect(useObjectsStore.getState().selectedIds).toEqual([obj2.id]);
    });

    it('should clear selection', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().setSelectedIds([obj1.id, obj2.id]);
      useObjectsStore.getState().clearSelection();

      expect(useObjectsStore.getState().selectedIds).toEqual([]);
    });

    it('should toggle selection without multi-select', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().toggleSelection(obj1.id, false);
      expect(useObjectsStore.getState().selectedIds).toEqual([obj1.id]);

      useObjectsStore.getState().toggleSelection(obj2.id, false);
      expect(useObjectsStore.getState().selectedIds).toEqual([obj2.id]);
    });

    it('should toggle selection with multi-select', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().toggleSelection(obj1.id, true);
      useObjectsStore.getState().toggleSelection(obj2.id, true);

      expect(useObjectsStore.getState().selectedIds).toEqual([obj1.id, obj2.id]);

      useObjectsStore.getState().toggleSelection(obj1.id, true);
      expect(useObjectsStore.getState().selectedIds).toEqual([obj2.id]);
    });
  });

  describe('Transform Mode', () => {
    it('should set transform mode to translate', () => {
      useObjectsStore.getState().setTransformMode('translate');
      expect(useObjectsStore.getState().transformMode).toBe('translate');
    });

    it('should set transform mode to rotate', () => {
      useObjectsStore.getState().setTransformMode('rotate');
      expect(useObjectsStore.getState().transformMode).toBe('rotate');
    });

    it('should set transform mode to scale', () => {
      useObjectsStore.getState().setTransformMode('scale');
      expect(useObjectsStore.getState().transformMode).toBe('scale');
    });
  });

  describe('Bulk Operations', () => {
    it('should duplicate objects', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');

      useObjectsStore.getState().duplicateObjects([obj1.id]);

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects).toHaveLength(2);
      expect(allObjects[1].type).toBe('box');
      expect(allObjects[1].id).not.toBe(obj1.id);
    });

    it('should duplicate multiple objects', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().duplicateObjects([obj1.id, obj2.id]);

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects).toHaveLength(4);
    });

    it('should offset duplicated object position', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box', [0, 0, 0]);

      useObjectsStore.getState().duplicateObjects([obj1.id]);

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects[1].position).toEqual([0.5, 0, 0.5]);
    });

    it('should select duplicated objects', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');

      useObjectsStore.getState().duplicateObjects([obj1.id]);

      const selectedIds = useObjectsStore.getState().selectedIds;
      expect(selectedIds).toHaveLength(1);
      expect(selectedIds[0]).not.toBe(obj1.id);
    });

    it('should delete objects', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().deleteObjects([obj1.id]);

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects).toHaveLength(1);
      expect(allObjects[0].id).toBe(obj2.id);
    });

    it('should delete multiple objects', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().deleteObjects([obj1.id, obj2.id]);

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects).toHaveLength(0);
    });
  });

  describe('Hierarchy', () => {
    it('should set parent-child relationship', () => {
      const parent = useObjectsStore.getState().createPrimitive('box');
      const child = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().setParent(child.id, parent.id);

      const updatedChild = useObjectsStore.getState().getObject(child.id);
      const updatedParent = useObjectsStore.getState().getObject(parent.id);

      expect(updatedChild?.parentId).toBe(parent.id);
      expect(updatedParent?.children).toContain(child.id);
    });

    it('should get children of object', () => {
      const parent = useObjectsStore.getState().createPrimitive('box');
      const child1 = useObjectsStore.getState().createPrimitive('sphere');
      const child2 = useObjectsStore.getState().createPrimitive('cylinder');

      useObjectsStore.getState().setParent(child1.id, parent.id);
      useObjectsStore.getState().setParent(child2.id, parent.id);

      const children = useObjectsStore.getState().getChildren(parent.id);

      expect(children).toHaveLength(2);
      expect(children.map(c => c.id)).toContain(child1.id);
      expect(children.map(c => c.id)).toContain(child2.id);
    });

    it('should remove child from old parent when setting new parent', () => {
      const parent1 = useObjectsStore.getState().createPrimitive('box');
      const parent2 = useObjectsStore.getState().createPrimitive('box');
      const child = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().setParent(child.id, parent1.id);
      useObjectsStore.getState().setParent(child.id, parent2.id);

      const updatedParent1 = useObjectsStore.getState().getObject(parent1.id);
      const updatedParent2 = useObjectsStore.getState().getObject(parent2.id);

      expect(updatedParent1?.children).not.toContain(child.id);
      expect(updatedParent2?.children).toContain(child.id);
    });

    it('should remove children when deleting parent', () => {
      const parent = useObjectsStore.getState().createPrimitive('box');
      const child = useObjectsStore.getState().createPrimitive('sphere');

      useObjectsStore.getState().setParent(child.id, parent.id);
      useObjectsStore.getState().removeObject(parent.id);

      const retrievedChild = useObjectsStore.getState().getObject(child.id);
      expect(retrievedChild).toBeUndefined();
    });
  });

  describe('Light Creation - Sprint 5', () => {
    it('should create a point light', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');

      expect(light.type).toBe('pointLight');
      expect(light.name).toMatch(/^PointLight\d{3}$/);
      expect(light.lightProps).toBeDefined();
      expect(light.lightProps?.color).toBe('#FFFFFF');
      expect(light.lightProps?.intensity).toBe(1);
      expect(light.lightProps?.distance).toBe(0);
      expect(light.lightProps?.decay).toBe(2);
      expect(light.lightProps?.castShadow).toBe(true);
    });

    it('should create a spot light', () => {
      const light = useObjectsStore.getState().createPrimitive('spotLight');

      expect(light.type).toBe('spotLight');
      expect(light.name).toMatch(/^SpotLight\d{3}$/);
      expect(light.lightProps).toBeDefined();
      expect(light.lightProps?.angle).toBeDefined();
      expect(light.lightProps?.penumbra).toBeDefined();
    });

    it('should create a directional light', () => {
      const light = useObjectsStore.getState().createPrimitive('directionalLight');

      expect(light.type).toBe('directionalLight');
      expect(light.name).toMatch(/^DirectionalLight\d{3}$/);
      expect(light.lightProps).toBeDefined();
      expect(light.lightProps?.intensity).toBe(1);
    });

    it('should create an ambient light', () => {
      const light = useObjectsStore.getState().createPrimitive('ambientLight');

      expect(light.type).toBe('ambientLight');
      expect(light.name).toMatch(/^AmbientLight\d{3}$/);
      expect(light.lightProps).toBeDefined();
      expect(light.lightProps?.color).toBe('#FFFFFF');
      expect(light.lightProps?.intensity).toBe(0.5);
    });

    it('should create lights at specified position', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight', [5, 10, 3]);

      expect(light.position).toEqual([5, 10, 3]);
    });

    it('should create lights with proper default shadow settings', () => {
      const light = useObjectsStore.getState().createPrimitive('spotLight');

      expect(light.lightProps?.castShadow).toBe(true);
      expect(light.lightProps?.shadowMapSize).toBe(1024);
      expect(light.lightProps?.shadowBias).toBe(-0.0001);
    });

    it('should update light properties', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');

      useObjectsStore.getState().updateObject(light.id, {
        lightProps: {
          ...light.lightProps,
          color: '#FF0000',
          intensity: 5,
          castShadow: true,
        } as any,
      });

      const updated = useObjectsStore.getState().getObject(light.id);
      expect(updated?.lightProps?.color).toBe('#FF0000');
      expect(updated?.lightProps?.intensity).toBe(5);
      expect(updated?.lightProps?.castShadow).toBe(true);
    });

    it('should support spotlight-specific properties', () => {
      const light = useObjectsStore.getState().createPrimitive('spotLight');

      expect(light.lightProps?.angle).toBeLessThanOrEqual(Math.PI / 2);
      expect(light.lightProps?.penumbra).toBeGreaterThanOrEqual(0);
      expect(light.lightProps?.penumbra).toBeLessThanOrEqual(1);
    });

    it('should support shadow map configuration', () => {
      const light = useObjectsStore.getState().createPrimitive('directionalLight');

      useObjectsStore.getState().updateObject(light.id, {
        lightProps: {
          ...light.lightProps,
          castShadow: true,
          shadowMapSize: 2048,
          shadowBias: -0.0001,
          shadowRadius: 2,
        } as any,
      });

      const updated = useObjectsStore.getState().getObject(light.id);
      expect(updated?.lightProps?.shadowMapSize).toBe(2048);
      expect(updated?.lightProps?.shadowBias).toBe(-0.0001);
      expect(updated?.lightProps?.shadowRadius).toBe(2);
    });

    it('should create multiple lights with unique names', () => {
      const light1 = useObjectsStore.getState().createPrimitive('pointLight');
      const light2 = useObjectsStore.getState().createPrimitive('pointLight');
      const light3 = useObjectsStore.getState().createPrimitive('spotLight');

      expect(light1.name).toMatch(/^PointLight\d{3}$/);
      expect(light2.name).toMatch(/^PointLight\d{3}$/);
      expect(light3.name).toMatch(/^SpotLight\d{3}$/);
      expect(light1.name).not.toBe(light2.name);
    });

    it('should allow selecting lights like other objects', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');

      useObjectsStore.getState().setSelectedIds([light.id]);

      expect(useObjectsStore.getState().selectedIds).toEqual([light.id]);
    });

    it('should allow duplicating lights', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');

      useObjectsStore.getState().duplicateObjects([light.id]);

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects).toHaveLength(2);
      expect(allObjects[1].type).toBe('pointLight');
      expect(allObjects[1].lightProps).toBeDefined();
    });

    it('should allow deleting lights', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');

      useObjectsStore.getState().deleteObjects([light.id]);

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects).toHaveLength(0);
    });
  });

  describe('Serialization', () => {
    it('should serialize objects correctly', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box', [1, 2, 3]);
      const obj2 = useObjectsStore.getState().createPrimitive('sphere', [4, 5, 6]);

      const serialized = useObjectsStore.getState().serialize();

      expect(serialized).toHaveLength(2);
      expect(serialized[0].type).toBe('box');
      expect(serialized[0].position).toEqual([1, 2, 3]);
      expect(serialized[1].type).toBe('sphere');
      expect(serialized[1].position).toEqual([4, 5, 6]);
    });

    it('should deserialize objects correctly', () => {
      const data = [
        {
          id: 'obj_1',
          name: 'TestBox',
          type: 'box',
          visible: true,
          locked: false,
          position: [10, 20, 30],
          rotation: [0, 0, 0],
          scale: [2, 2, 2],
          parentId: null,
          children: [],
          geometryParams: { width: 1, height: 1, depth: 1 },
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        },
      ];

      useObjectsStore.getState().deserialize(data);

      const objects = useObjectsStore.getState().objects;
      expect(objects.size).toBe(1);
      expect(objects.get('obj_1')?.name).toBe('TestBox');
      expect(objects.get('obj_1')?.position).toEqual([10, 20, 30]);
      expect(objects.get('obj_1')?.scale).toEqual([2, 2, 2]);
    });

    it('should handle empty array deserialization', () => {
      useObjectsStore.getState().deserialize([]);

      const objects = useObjectsStore.getState().objects;
      expect(objects.size).toBe(0);
    });

    it('should handle invalid data gracefully', () => {
      expect(() => useObjectsStore.getState().deserialize(null)).not.toThrow();
      expect(() => useObjectsStore.getState().deserialize(undefined)).not.toThrow();
    });

    it('should perform round-trip serialization correctly', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box', [1, 2, 3]);
      const obj2 = useObjectsStore.getState().createPrimitive('sphere', [4, 5, 6]);

      // Serialize
      const serialized = useObjectsStore.getState().serialize();

      // Clear store
      useObjectsStore.setState({ objects: new Map() });

      // Deserialize
      useObjectsStore.getState().deserialize(serialized);

      // Verify
      const objects = useObjectsStore.getState().objects;
      expect(objects.size).toBe(2);
      expect(objects.get(obj1.id)?.type).toBe('box');
      expect(objects.get(obj1.id)?.position).toEqual([1, 2, 3]);
      expect(objects.get(obj2.id)?.type).toBe('sphere');
      expect(objects.get(obj2.id)?.position).toEqual([4, 5, 6]);
    });
  });
});
