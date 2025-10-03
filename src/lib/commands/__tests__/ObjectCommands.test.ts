/**
 * Object Commands Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useObjectsStore, SceneObject } from '../../../stores/objectsStore';
import {
  CreateObjectCommand,
  DeleteObjectsCommand,
  DuplicateObjectsCommand,
  TransformObjectCommand,
  UpdateObjectCommand,
  RenameObjectCommand,
} from '../ObjectCommands';

describe('ObjectCommands', () => {
  beforeEach(() => {
    // Reset store before each test
    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
      transformMode: 'translate',
    });
  });

  describe('CreateObjectCommand', () => {
    it('should create an object when executed', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      useObjectsStore.getState().removeObject(object.id); // Remove it first

      const command = new CreateObjectCommand(object);
      command.execute();

      const retrieved = useObjectsStore.getState().getObject(object.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(object.id);
    });

    it('should select the created object', () => {
      const object: SceneObject = {
        id: 'test-id',
        name: 'Test Object',
        type: 'box',
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        geometryParams: { width: 1, height: 1, depth: 1 },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const command = new CreateObjectCommand(object);
      command.execute();

      expect(useObjectsStore.getState().selectedIds).toContain(object.id);
    });

    it('should undo object creation', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      useObjectsStore.getState().removeObject(object.id);

      const command = new CreateObjectCommand(object);
      command.execute();
      command.undo();

      const retrieved = useObjectsStore.getState().getObject(object.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return correct description', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      const command = new CreateObjectCommand(object);

      expect(command.getDescription()).toMatch(/Create Box\d{3}/);
    });
  });

  describe('DeleteObjectsCommand', () => {
    it('should delete a single object when executed', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new DeleteObjectsCommand([object.id]);
      command.execute();

      const retrieved = useObjectsStore.getState().getObject(object.id);
      expect(retrieved).toBeUndefined();
    });

    it('should delete multiple objects', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      const command = new DeleteObjectsCommand([obj1.id, obj2.id]);
      command.execute();

      expect(useObjectsStore.getState().getAllObjects()).toHaveLength(0);
    });

    it('should restore objects when undone', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new DeleteObjectsCommand([object.id]);
      command.execute();
      command.undo();

      const retrieved = useObjectsStore.getState().getObject(object.id);
      expect(retrieved).toBeDefined();
    });

    it('should restore selection when undone', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      useObjectsStore.getState().setSelectedIds([object.id]);

      const command = new DeleteObjectsCommand([object.id]);
      command.execute();
      command.undo();

      expect(useObjectsStore.getState().selectedIds).toContain(object.id);
    });

    it('should return correct description for single object', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      const command = new DeleteObjectsCommand([object.id]);

      expect(command.getDescription()).toMatch(/Delete Box\d{3}/);
    });

    it('should return correct description for multiple objects', () => {
      const obj1 = useObjectsStore.getState().createPrimitive('box');
      const obj2 = useObjectsStore.getState().createPrimitive('sphere');

      const command = new DeleteObjectsCommand([obj1.id, obj2.id]);

      expect(command.getDescription()).toBe('Delete 2 objects');
    });
  });

  describe('DuplicateObjectsCommand', () => {
    it('should duplicate an object when executed', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new DuplicateObjectsCommand([object.id]);
      command.execute();

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects).toHaveLength(2);
    });

    it('should create objects with offset position', () => {
      const object = useObjectsStore.getState().createPrimitive('box', [0, 0, 0]);

      const command = new DuplicateObjectsCommand([object.id]);
      command.execute();

      const allObjects = useObjectsStore.getState().getAllObjects();
      const duplicated = allObjects.find(obj => obj.id !== object.id);

      expect(duplicated?.position).toEqual([0.5, 0, 0.5]);
    });

    it('should select duplicated objects', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new DuplicateObjectsCommand([object.id]);
      command.execute();

      const selectedIds = useObjectsStore.getState().selectedIds;
      expect(selectedIds).toHaveLength(1);
      expect(selectedIds[0]).not.toBe(object.id);
    });

    it('should undo duplication', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new DuplicateObjectsCommand([object.id]);
      command.execute();
      command.undo();

      const allObjects = useObjectsStore.getState().getAllObjects();
      expect(allObjects).toHaveLength(1);
      expect(allObjects[0].id).toBe(object.id);
    });

    it('should return correct description', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      const command = new DuplicateObjectsCommand([object.id]);

      expect(command.getDescription()).toBe('Duplicate object');
    });
  });

  describe('TransformObjectCommand', () => {
    it('should transform object position when executed', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new TransformObjectCommand(
        object.id,
        'position',
        [0, 0, 0],
        [1, 2, 3]
      );
      command.execute();

      const updated = useObjectsStore.getState().getObject(object.id);
      expect(updated?.position).toEqual([1, 2, 3]);
    });

    it('should transform object rotation', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new TransformObjectCommand(
        object.id,
        'rotation',
        [0, 0, 0],
        [0.5, 1.0, 1.5]
      );
      command.execute();

      const updated = useObjectsStore.getState().getObject(object.id);
      expect(updated?.rotation).toEqual([0.5, 1.0, 1.5]);
    });

    it('should transform object scale', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new TransformObjectCommand(
        object.id,
        'scale',
        [1, 1, 1],
        [2, 3, 4]
      );
      command.execute();

      const updated = useObjectsStore.getState().getObject(object.id);
      expect(updated?.scale).toEqual([2, 3, 4]);
    });

    it('should undo transformation', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new TransformObjectCommand(
        object.id,
        'position',
        [0, 0, 0],
        [1, 2, 3]
      );
      command.execute();
      command.undo();

      const updated = useObjectsStore.getState().getObject(object.id);
      expect(updated?.position).toEqual([0, 0, 0]);
    });

    it('should return correct description', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      const command = new TransformObjectCommand(
        object.id,
        'position',
        [0, 0, 0],
        [1, 2, 3]
      );

      expect(command.getDescription()).toMatch(/Position Box\d{3}/);
    });
  });

  describe('UpdateObjectCommand', () => {
    it('should update object properties when executed', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new UpdateObjectCommand(
        object.id,
        { visible: true, locked: false },
        { visible: false, locked: true }
      );
      command.execute();

      const updated = useObjectsStore.getState().getObject(object.id);
      expect(updated?.visible).toBe(false);
      expect(updated?.locked).toBe(true);
    });

    it('should undo property updates', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new UpdateObjectCommand(
        object.id,
        { visible: true },
        { visible: false }
      );
      command.execute();
      command.undo();

      const updated = useObjectsStore.getState().getObject(object.id);
      expect(updated?.visible).toBe(true);
    });

    it('should return correct description', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      const command = new UpdateObjectCommand(
        object.id,
        { visible: true },
        { visible: false }
      );

      expect(command.getDescription()).toMatch(/Update Box\d{3}/);
    });
  });

  describe('RenameObjectCommand', () => {
    it('should rename object when executed', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new RenameObjectCommand(
        object.id,
        object.name,
        'My Custom Box'
      );
      command.execute();

      const updated = useObjectsStore.getState().getObject(object.id);
      expect(updated?.name).toBe('My Custom Box');
    });

    it('should undo rename', () => {
      const object = useObjectsStore.getState().createPrimitive('box');
      const originalName = object.name;

      const command = new RenameObjectCommand(
        object.id,
        originalName,
        'New Name'
      );
      command.execute();
      command.undo();

      const updated = useObjectsStore.getState().getObject(object.id);
      expect(updated?.name).toBe(originalName);
    });

    it('should return correct description', () => {
      const object = useObjectsStore.getState().createPrimitive('box');

      const command = new RenameObjectCommand(
        object.id,
        'Old Name',
        'New Name'
      );

      expect(command.getDescription()).toBe('Rename Old Name to New Name');
    });
  });
});
