import { describe, it, expect, beforeEach } from 'vitest';
import { useObjectsStore } from '../../../stores/objectsStore';
import {
  GroupObjectsCommand,
  UngroupObjectsCommand,
  ReparentObjectCommand,
  CreateEmptyGroupCommand,
} from '../GroupCommands';

describe('GroupCommands', () => {
  beforeEach(() => {
    // Reset store
    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
    });
  });

  describe('GroupObjectsCommand', () => {
    it('should group multiple objects', () => {
      let store = useObjectsStore.getState();

      // Create 3 objects
      const obj1 = store.createPrimitive('box', [1, 0, 0]);
      const obj2 = store.createPrimitive('sphere', [2, 0, 0]);
      const obj3 = store.createPrimitive('cylinder', [3, 0, 0]);

      // Group them
      const command = new GroupObjectsCommand([obj1.id, obj2.id, obj3.id]);
      command.execute();

      // Refetch state
      store = useObjectsStore.getState();

      // Check that a group was created
      const allObjects = store.getAllObjects();
      const groups = allObjects.filter(obj => obj.type === 'group');
      expect(groups.length).toBe(1);

      const group = groups[0];
      expect(group.children).toHaveLength(3);
      expect(group.children).toContain(obj1.id);
      expect(group.children).toContain(obj2.id);
      expect(group.children).toContain(obj3.id);

      // Check that all objects have the group as parent
      const updatedObj1 = store.objects.get(obj1.id);
      const updatedObj2 = store.objects.get(obj2.id);
      const updatedObj3 = store.objects.get(obj3.id);

      expect(updatedObj1?.parentId).toBe(group.id);
      expect(updatedObj2?.parentId).toBe(group.id);
      expect(updatedObj3?.parentId).toBe(group.id);
    });

    it('should undo grouping', () => {
      let store = useObjectsStore.getState();

      const obj1 = store.createPrimitive('box', [1, 0, 0]);
      const obj2 = store.createPrimitive('sphere', [2, 0, 0]);

      const command = new GroupObjectsCommand([obj1.id, obj2.id]);
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      // Verify group exists
      let groups = store.getAllObjects().filter(obj => obj.type === 'group');
      expect(groups.length).toBe(1);

      // Undo
      command.undo();

      // Refetch
      store = useObjectsStore.getState();

      // Group should be deleted
      groups = store.getAllObjects().filter(obj => obj.type === 'group');
      expect(groups.length).toBe(0);

      // Objects should have no parent
      const updatedObj1 = store.objects.get(obj1.id);
      const updatedObj2 = store.objects.get(obj2.id);

      expect(updatedObj1?.parentId).toBeNull();
      expect(updatedObj2?.parentId).toBeNull();
    });

    it('should calculate group center position', () => {
      let store = useObjectsStore.getState();

      // Create objects at known positions
      const obj1 = store.createPrimitive('box', [0, 0, 0]);
      const obj2 = store.createPrimitive('sphere', [10, 0, 0]);

      const command = new GroupObjectsCommand([obj1.id, obj2.id]);
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      const groups = store.getAllObjects().filter(obj => obj.type === 'group');
      const group = groups[0];

      // Center should be at (5, 0, 0)
      expect(group.position[0]).toBeCloseTo(5);
      expect(group.position[1]).toBeCloseTo(0);
      expect(group.position[2]).toBeCloseTo(0);
    });

    it('should throw error when grouping no objects', () => {
      const command = new GroupObjectsCommand([]);

      expect(() => command.execute()).toThrow('Cannot create group with no objects');
    });

    it('should handle grouping objects with existing parents', () => {
      let store = useObjectsStore.getState();

      // Create parent and child
      const parent = store.createPrimitive('box', [0, 0, 0]);
      const child = store.createPrimitive('sphere', [1, 0, 0]);
      store.setParent(child.id, parent.id);

      // Group the child
      const command = new GroupObjectsCommand([child.id]);
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      const groups = store.getAllObjects().filter(obj => obj.type === 'group');
      const group = groups[0];

      // Child should now be parented to group, not original parent
      const updatedChild = store.objects.get(child.id);
      expect(updatedChild?.parentId).toBe(group.id);

      // Parent should no longer have child
      const updatedParent = store.objects.get(parent.id);
      expect(updatedParent?.children).not.toContain(child.id);
    });
  });

  describe('UngroupObjectsCommand', () => {
    it('should ungroup objects', () => {
      let store = useObjectsStore.getState();

      // Create and group objects
      const obj1 = store.createPrimitive('box', [1, 0, 0]);
      const obj2 = store.createPrimitive('sphere', [2, 0, 0]);

      const groupId = store.createGroup([obj1.id, obj2.id]);

      // Ungroup
      const command = new UngroupObjectsCommand(groupId);
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      // Group should be deleted
      expect(store.objects.get(groupId)).toBeUndefined();

      // Objects should have no parent
      const updatedObj1 = store.objects.get(obj1.id);
      const updatedObj2 = store.objects.get(obj2.id);

      expect(updatedObj1?.parentId).toBeNull();
      expect(updatedObj2?.parentId).toBeNull();
    });

    it('should undo ungrouping', () => {
      let store = useObjectsStore.getState();

      const obj1 = store.createPrimitive('box', [1, 0, 0]);
      const obj2 = store.createPrimitive('sphere', [2, 0, 0]);

      const groupId = store.createGroup([obj1.id, obj2.id]);

      const command = new UngroupObjectsCommand(groupId);
      command.execute();

      // Undo
      command.undo();

      // Refetch
      store = useObjectsStore.getState();

      // Group should be restored
      const group = store.objects.get(groupId);
      expect(group).toBeDefined();
      expect(group?.type).toBe('group');
      expect(group?.children).toContain(obj1.id);
      expect(group?.children).toContain(obj2.id);

      // Objects should be parented to group again
      const updatedObj1 = store.objects.get(obj1.id);
      const updatedObj2 = store.objects.get(obj2.id);

      expect(updatedObj1?.parentId).toBe(groupId);
      expect(updatedObj2?.parentId).toBe(groupId);
    });

    it('should throw error for non-existent group', () => {
      const command = new UngroupObjectsCommand('nonexistent');

      expect(() => command.execute()).toThrow('Group nonexistent not found');
    });

    it('should throw error for non-group object', () => {
      const store = useObjectsStore.getState();
      const box = store.createPrimitive('box', [0, 0, 0]);

      const command = new UngroupObjectsCommand(box.id);

      expect(() => command.execute()).toThrow(`Object ${box.id} is not a group`);
    });

    it('should move children to group\'s parent when ungrouping nested groups', () => {
      let store = useObjectsStore.getState();

      // Create nested structure: grandparent -> parent (group) -> child
      const grandparent = store.createPrimitive('box', [0, 0, 0]);
      const child = store.createPrimitive('sphere', [1, 0, 0]);

      const parentGroupId = store.createGroup([child.id]);
      store.setParent(parentGroupId, grandparent.id);

      // Ungroup the parent group
      const command = new UngroupObjectsCommand(parentGroupId);
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      // Child should now be parented to grandparent
      const updatedChild = store.objects.get(child.id);
      expect(updatedChild?.parentId).toBe(grandparent.id);

      // Grandparent should have child
      const updatedGrandparent = store.objects.get(grandparent.id);
      expect(updatedGrandparent?.children).toContain(child.id);
    });
  });

  describe('ReparentObjectCommand', () => {
    it('should change object parent', () => {
      let store = useObjectsStore.getState();

      const parent1 = store.createPrimitive('box', [0, 0, 0]);
      const parent2 = store.createPrimitive('sphere', [5, 0, 0]);
      const child = store.createPrimitive('cylinder', [1, 0, 0]);

      // Set initial parent
      store.setParent(child.id, parent1.id);

      // Reparent to parent2
      const command = new ReparentObjectCommand(child.id, parent2.id);
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      const updatedChild = store.objects.get(child.id);
      expect(updatedChild?.parentId).toBe(parent2.id);

      // parent1 should no longer have child
      const updatedParent1 = store.objects.get(parent1.id);
      expect(updatedParent1?.children).not.toContain(child.id);

      // parent2 should have child
      const updatedParent2 = store.objects.get(parent2.id);
      expect(updatedParent2?.children).toContain(child.id);
    });

    it('should undo reparenting', () => {
      let store = useObjectsStore.getState();

      const parent1 = store.createPrimitive('box', [0, 0, 0]);
      const parent2 = store.createPrimitive('sphere', [5, 0, 0]);
      const child = store.createPrimitive('cylinder', [1, 0, 0]);

      store.setParent(child.id, parent1.id);

      const command = new ReparentObjectCommand(child.id, parent2.id);
      command.execute();

      // Undo
      command.undo();

      // Refetch
      store = useObjectsStore.getState();

      // Should be back to parent1
      const updatedChild = store.objects.get(child.id);
      expect(updatedChild?.parentId).toBe(parent1.id);

      const updatedParent1 = store.objects.get(parent1.id);
      expect(updatedParent1?.children).toContain(child.id);

      const updatedParent2 = store.objects.get(parent2.id);
      expect(updatedParent2?.children).not.toContain(child.id);
    });

    it('should allow setting parent to null', () => {
      let store = useObjectsStore.getState();

      const parent = store.createPrimitive('box', [0, 0, 0]);
      const child = store.createPrimitive('sphere', [1, 0, 0]);

      store.setParent(child.id, parent.id);

      // Remove parent
      const command = new ReparentObjectCommand(child.id, null);
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      const updatedChild = store.objects.get(child.id);
      expect(updatedChild?.parentId).toBeNull();

      const updatedParent = store.objects.get(parent.id);
      expect(updatedParent?.children).not.toContain(child.id);
    });

    it('should throw error for circular dependency', () => {
      const store = useObjectsStore.getState();

      const parent = store.createPrimitive('box', [0, 0, 0]);
      const child = store.createPrimitive('sphere', [1, 0, 0]);

      store.setParent(child.id, parent.id);

      // Try to make parent a child of child (circular!)
      const command = new ReparentObjectCommand(parent.id, child.id);

      expect(() => command.execute()).toThrow('Cannot create circular dependency');
    });

    it('should throw error for non-existent object', () => {
      const store = useObjectsStore.getState();
      const parent = store.createPrimitive('box', [0, 0, 0]);

      const command = new ReparentObjectCommand('nonexistent', parent.id);

      expect(() => command.execute()).toThrow('Object nonexistent not found');
    });

    it('should prevent object from being its own parent', () => {
      const store = useObjectsStore.getState();
      const obj = store.createPrimitive('box', [0, 0, 0]);

      const command = new ReparentObjectCommand(obj.id, obj.id);

      expect(() => command.execute()).toThrow('Cannot create circular dependency');
    });
  });

  describe('CreateEmptyGroupCommand', () => {
    it('should create empty group', () => {
      let store = useObjectsStore.getState();

      const command = new CreateEmptyGroupCommand();
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      const groups = store.getAllObjects().filter(obj => obj.type === 'group');
      expect(groups.length).toBe(1);

      const group = groups[0];
      expect(group.children).toHaveLength(0);
      expect(group.type).toBe('group');
    });

    it('should undo empty group creation', () => {
      let store = useObjectsStore.getState();

      const command = new CreateEmptyGroupCommand();
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      // Verify group exists
      let groups = store.getAllObjects().filter(obj => obj.type === 'group');
      expect(groups.length).toBe(1);

      // Undo
      command.undo();

      // Refetch
      store = useObjectsStore.getState();

      // Group should be deleted
      groups = store.getAllObjects().filter(obj => obj.type === 'group');
      expect(groups.length).toBe(0);
    });

    it('should generate unique names for multiple empty groups', () => {
      let store = useObjectsStore.getState();

      const command1 = new CreateEmptyGroupCommand();
      const command2 = new CreateEmptyGroupCommand();

      command1.execute();
      command2.execute();

      // Refetch
      store = useObjectsStore.getState();

      const groups = store.getAllObjects().filter(obj => obj.type === 'group');
      expect(groups.length).toBe(2);

      // Names should be different
      expect(groups[0].name).not.toBe(groups[1].name);
    });
  });

  describe('Integration tests', () => {
    it('should support redo after undo (GroupObjectsCommand)', () => {
      let store = useObjectsStore.getState();

      const obj1 = store.createPrimitive('box', [1, 0, 0]);
      const obj2 = store.createPrimitive('sphere', [2, 0, 0]);

      const command = new GroupObjectsCommand([obj1.id, obj2.id]);

      // Execute -> Undo -> Execute (redo)
      command.execute();
      command.undo();
      command.execute();

      // Refetch
      store = useObjectsStore.getState();

      // Should have group again
      const groups = store.getAllObjects().filter(obj => obj.type === 'group');
      expect(groups.length).toBe(1);

      const updatedObj1 = store.objects.get(obj1.id);
      expect(updatedObj1?.parentId).toBe(groups[0].id);
    });

    it('should handle complex hierarchy operations', () => {
      let store = useObjectsStore.getState();

      // Create structure: box1, box2, box3
      const box1 = store.createPrimitive('box', [0, 0, 0]);
      const box2 = store.createPrimitive('box', [1, 0, 0]);
      const box3 = store.createPrimitive('box', [2, 0, 0]);

      // Group box2 and box3
      const groupCmd = new GroupObjectsCommand([box2.id, box3.id]);
      groupCmd.execute();

      // Refetch
      store = useObjectsStore.getState();

      const groups = store.getAllObjects().filter(obj => obj.type === 'group');
      const groupId = groups[0].id;

      // Reparent group to box1
      const reparentCmd = new ReparentObjectCommand(groupId, box1.id);
      reparentCmd.execute();

      // Refetch
      store = useObjectsStore.getState();

      // Verify structure: box1 -> group -> box2, box3
      const updatedBox1 = store.objects.get(box1.id);
      expect(updatedBox1?.children).toContain(groupId);

      const group = store.objects.get(groupId);
      expect(group?.parentId).toBe(box1.id);
      expect(group?.children).toContain(box2.id);
      expect(group?.children).toContain(box3.id);

      // Undo reparent
      reparentCmd.undo();

      // Refetch
      store = useObjectsStore.getState();

      const updatedGroup = store.objects.get(groupId);
      expect(updatedGroup?.parentId).toBeNull();

      // Undo grouping
      groupCmd.undo();

      // Refetch
      store = useObjectsStore.getState();

      const updatedBox2 = store.objects.get(box2.id);
      const updatedBox3 = store.objects.get(box3.id);
      expect(updatedBox2?.parentId).toBeNull();
      expect(updatedBox3?.parentId).toBeNull();
    });
  });
});
