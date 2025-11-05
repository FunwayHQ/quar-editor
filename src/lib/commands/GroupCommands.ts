/**
 * Group Commands
 *
 * Commands for grouping/ungrouping objects and managing hierarchy.
 * All commands support undo/redo.
 */

import { Command } from './Command';
import { useObjectsStore } from '../../stores/objectsStore';
import { wouldCreateCircularDependency } from '../hierarchy/TransformUtils';

/**
 * GroupObjectsCommand
 * Groups multiple objects under a new parent group
 */
export class GroupObjectsCommand implements Command {
  private groupId: string | null = null;
  private childIds: string[];
  private oldParentIds: Map<string, string | null> = new Map();
  private oldPositions: Map<string, [number, number, number]> = new Map();

  constructor(childIds: string[]) {
    this.childIds = [...childIds];
  }

  execute(): void {
    const store = useObjectsStore.getState();

    // Store old parent relationships and positions BEFORE grouping
    this.childIds.forEach(id => {
      const obj = store.objects.get(id);
      if (obj) {
        this.oldParentIds.set(id, obj.parentId);
        this.oldPositions.set(id, [...obj.position]);
      }
    });

    // Create the group (this modifies positions to local space)
    this.groupId = store.createGroup(this.childIds);
  }

  undo(): void {
    if (!this.groupId) return;

    // Do everything in a single atomic state update
    useObjectsStore.setState((state) => {
      const newObjects = new Map(state.objects);

      // Restore old parent relationships and positions
      this.childIds.forEach(id => {
        const child = newObjects.get(id);
        const oldParentId = this.oldParentIds.get(id);
        const oldPosition = this.oldPositions.get(id);

        if (child) {
          // Restore original position
          if (oldPosition) {
            child.position = [...oldPosition];
          }

          // Remove from group's children
          const group = newObjects.get(this.groupId!);
          if (group) {
            group.children = group.children.filter(childId => childId !== id);
          }

          // Restore old parent
          if (oldParentId !== undefined) {
            child.parentId = oldParentId;

            // Add to old parent's children
            if (oldParentId) {
              const oldParent = newObjects.get(oldParentId);
              if (oldParent && !oldParent.children.includes(id)) {
                oldParent.children.push(id);
              }
            }
          }

          child.modifiedAt = Date.now();
        }
      });

      // Remove the group
      newObjects.delete(this.groupId!);

      return { objects: newObjects };
    });

    this.groupId = null;
  }

  getDescription(): string {
    return `Group ${this.childIds.length} objects`;
  }
}

/**
 * UngroupObjectsCommand
 * Ungroups a group, moving children to group's parent
 */
export class UngroupObjectsCommand implements Command {
  private groupId: string;
  private groupData: any = null;
  private childIds: string[] = [];
  private childData: Map<string, { parentId: string | null; position: [number, number, number] }> = new Map();

  constructor(groupId: string) {
    this.groupId = groupId;
  }

  execute(): void {
    const store = useObjectsStore.getState();
    const group = store.objects.get(this.groupId);

    if (!group) {
      throw new Error(`Group ${this.groupId} not found`);
    }

    // Store group data for undo
    this.groupData = { ...group };
    this.childIds = [...group.children];

    // Store child data (parent and position BEFORE ungroup)
    this.childIds.forEach(id => {
      const child = store.objects.get(id);
      if (child) {
        this.childData.set(id, {
          parentId: child.parentId,
          position: [...child.position],
        });
      }
    });

    // Ungroup (this converts local positions to world)
    store.ungroup(this.groupId);
  }

  undo(): void {
    if (!this.groupData) return;

    // Do everything in a single atomic state update
    useObjectsStore.setState((state) => {
      const newObjects = new Map(state.objects);

      // Recreate the group object
      newObjects.set(this.groupId, this.groupData);

      // Restore children's parent relationships and local positions
      this.childIds.forEach(id => {
        const child = newObjects.get(id);
        const oldData = this.childData.get(id);

        if (child && oldData) {
          // Restore local position (was converted to world during ungroup)
          child.position = [...oldData.position];

          // Restore parent relationship
          child.parentId = oldData.parentId;

          // Remove from any other parent if needed
          if (child.parentId !== this.groupId) {
            const currentParent = newObjects.get(child.parentId || '');
            if (currentParent) {
              currentParent.children = currentParent.children.filter(childId => childId !== id);
            }
          }

          child.modifiedAt = Date.now();
        }
      });

      return { objects: newObjects };
    });
  }

  getDescription(): string {
    return `Ungroup objects`;
  }
}

/**
 * ReparentObjectCommand
 * Changes the parent of an object
 */
export class ReparentObjectCommand implements Command {
  private childId: string;
  private newParentId: string | null;
  private oldParentId: string | null = null;
  private oldPosition: [number, number, number] | null = null;

  constructor(childId: string, newParentId: string | null) {
    this.childId = childId;
    this.newParentId = newParentId;
  }

  execute(): void {
    const store = useObjectsStore.getState();
    const child = store.objects.get(this.childId);

    if (!child) {
      throw new Error(`Object ${this.childId} not found`);
    }

    // Check for circular dependency
    if (this.newParentId && wouldCreateCircularDependency(this.childId, this.newParentId)) {
      throw new Error('Cannot create circular dependency');
    }

    // Store old values
    this.oldParentId = child.parentId;
    this.oldPosition = [...child.position];

    // Set new parent
    store.setParent(this.childId, this.newParentId);
  }

  undo(): void {
    const store = useObjectsStore.getState();

    if (this.oldPosition) {
      store.updateObject(this.childId, { position: this.oldPosition });
    }

    if (this.oldParentId !== undefined) {
      store.setParent(this.childId, this.oldParentId);
    }
  }

  getDescription(): string {
    return `Reparent object`;
  }
}

/**
 * CreateEmptyGroupCommand
 * Creates an empty group object
 */
export class CreateEmptyGroupCommand implements Command {
  private groupId: string | null = null;

  execute(): void {
    const store = useObjectsStore.getState();
    const group = store.createEmptyGroup();
    this.groupId = group.id;
  }

  undo(): void {
    if (!this.groupId) return;

    const store = useObjectsStore.getState();
    store.removeObject(this.groupId);
    this.groupId = null;
  }

  getDescription(): string {
    return `Create empty group`;
  }
}
