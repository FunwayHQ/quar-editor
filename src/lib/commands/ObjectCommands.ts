/**
 * Object Commands
 *
 * Specific command implementations for object operations.
 */

import { Command } from './Command';
import { SceneObject, useObjectsStore } from '../../stores/objectsStore';

/**
 * Command to create a new object
 */
export class CreateObjectCommand extends Command {
  private object: SceneObject;
  private store = useObjectsStore.getState();

  constructor(object: SceneObject) {
    super();
    this.object = object;
  }

  execute(): void {
    this.store.addObject(this.object);
    this.store.setSelectedIds([this.object.id]);
  }

  undo(): void {
    this.store.removeObject(this.object.id);
  }

  getDescription(): string {
    return `Create ${this.object.name}`;
  }
}

/**
 * Command to delete objects
 */
export class DeleteObjectsCommand extends Command {
  private objects: SceneObject[];
  private previousSelection: string[];
  private store = useObjectsStore.getState();

  constructor(objectIds: string[]) {
    super();
    this.store = useObjectsStore.getState();
    this.objects = objectIds
      .map(id => this.store.getObject(id))
      .filter((obj): obj is SceneObject => obj !== undefined);
    this.previousSelection = [...this.store.selectedIds];
  }

  execute(): void {
    this.objects.forEach(obj => {
      this.store.removeObject(obj.id);
    });
    this.store.clearSelection();
  }

  undo(): void {
    this.objects.forEach(obj => {
      this.store.addObject(obj);
    });
    this.store.setSelectedIds(this.previousSelection);
  }

  getDescription(): string {
    if (this.objects.length === 1) {
      return `Delete ${this.objects[0].name}`;
    }
    return `Delete ${this.objects.length} objects`;
  }
}

/**
 * Command to duplicate objects
 */
export class DuplicateObjectsCommand extends Command {
  private originalIds: string[];
  private duplicatedObjects: SceneObject[] = [];
  private store = useObjectsStore.getState();

  constructor(objectIds: string[]) {
    super();
    this.originalIds = objectIds;
  }

  execute(): void {
    this.store = useObjectsStore.getState();
    const objects = this.store.getAllObjects();
    const objectsToDuplicate = objects.filter(obj => this.originalIds.includes(obj.id));

    this.duplicatedObjects = [];

    objectsToDuplicate.forEach(obj => {
      const duplicated: SceneObject = {
        ...obj,
        id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: this.store.generateName(obj.type),
        position: [
          obj.position[0] + 0.5,
          obj.position[1],
          obj.position[2] + 0.5,
        ],
        parentId: null,
        children: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      this.store.addObject(duplicated);
      this.duplicatedObjects.push(duplicated);
    });

    this.store.setSelectedIds(this.duplicatedObjects.map(obj => obj.id));
  }

  undo(): void {
    this.duplicatedObjects.forEach(obj => {
      this.store.removeObject(obj.id);
    });
    this.store.setSelectedIds(this.originalIds);
  }

  getDescription(): string {
    if (this.originalIds.length === 1) {
      return `Duplicate object`;
    }
    return `Duplicate ${this.originalIds.length} objects`;
  }
}

/**
 * Command to transform (move/rotate/scale) objects
 */
export class TransformObjectCommand extends Command {
  private objectId: string;
  private property: 'position' | 'rotation' | 'scale';
  private oldValue: [number, number, number];
  private newValue: [number, number, number];
  private store = useObjectsStore.getState();

  constructor(
    objectId: string,
    property: 'position' | 'rotation' | 'scale',
    oldValue: [number, number, number],
    newValue: [number, number, number]
  ) {
    super();
    this.objectId = objectId;
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }

  execute(): void {
    this.store.updateObject(this.objectId, {
      [this.property]: this.newValue,
    });
  }

  undo(): void {
    this.store.updateObject(this.objectId, {
      [this.property]: this.oldValue,
    });
  }

  getDescription(): string {
    const object = this.store.getObject(this.objectId);
    const propertyName = this.property.charAt(0).toUpperCase() + this.property.slice(1);
    return `${propertyName} ${object?.name || 'object'}`;
  }
}

/**
 * Command to update object properties
 */
export class UpdateObjectCommand extends Command {
  private objectId: string;
  private oldValues: Partial<SceneObject>;
  private newValues: Partial<SceneObject>;
  private store = useObjectsStore.getState();

  constructor(
    objectId: string,
    oldValues: Partial<SceneObject>,
    newValues: Partial<SceneObject>
  ) {
    super();
    this.objectId = objectId;
    this.oldValues = oldValues;
    this.newValues = newValues;
  }

  execute(): void {
    this.store.updateObject(this.objectId, this.newValues);
  }

  undo(): void {
    this.store.updateObject(this.objectId, this.oldValues);
  }

  getDescription(): string {
    const object = this.store.getObject(this.objectId);
    return `Update ${object?.name || 'object'}`;
  }
}

/**
 * Command to rename an object
 */
export class RenameObjectCommand extends Command {
  private objectId: string;
  private oldName: string;
  private newName: string;
  private store = useObjectsStore.getState();

  constructor(objectId: string, oldName: string, newName: string) {
    super();
    this.objectId = objectId;
    this.oldName = oldName;
    this.newName = newName;
  }

  execute(): void {
    this.store.updateObject(this.objectId, { name: this.newName });
  }

  undo(): void {
    this.store.updateObject(this.objectId, { name: this.oldName });
  }

  getDescription(): string {
    return `Rename ${this.oldName} to ${this.newName}`;
  }
}
