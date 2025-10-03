/**
 * Material Commands
 *
 * Command implementations for material operations with undo/redo support.
 */

import { Command } from './Command';
import { Material, useMaterialsStore } from '../../stores/materialsStore';

/**
 * Command to create a new material
 */
export class CreateMaterialCommand extends Command {
  private material: Material;
  private store = useMaterialsStore.getState();

  constructor(material: Material) {
    super();
    this.material = material;
  }

  execute(): void {
    this.store.addMaterial(this.material);
  }

  undo(): void {
    this.store.removeMaterial(this.material.id);
  }

  getDescription(): string {
    return `Create ${this.material.name}`;
  }
}

/**
 * Command to delete a material
 */
export class DeleteMaterialCommand extends Command {
  private material: Material;
  private objectAssignments: Map<string, string> = new Map();
  private store = useMaterialsStore.getState();

  constructor(materialId: string) {
    super();
    this.store = useMaterialsStore.getState();
    const mat = this.store.getMaterial(materialId);
    if (!mat) {
      throw new Error(`Material ${materialId} not found`);
    }
    this.material = mat;

    // Store object assignments that will be removed
    for (const [objId, matId] of this.store.objectMaterials.entries()) {
      if (matId === materialId) {
        this.objectAssignments.set(objId, matId);
      }
    }
  }

  execute(): void {
    this.store.removeMaterial(this.material.id);
  }

  undo(): void {
    this.store.addMaterial(this.material);

    // Restore object assignments
    for (const [objId, matId] of this.objectAssignments.entries()) {
      this.store.assignMaterialToObject(objId, matId);
    }
  }

  getDescription(): string {
    return `Delete ${this.material.name}`;
  }
}

/**
 * Command to update material properties
 */
export class UpdateMaterialCommand extends Command {
  private materialId: string;
  private oldValues: Partial<Material>;
  private newValues: Partial<Material>;
  private store = useMaterialsStore.getState();

  constructor(
    materialId: string,
    oldValues: Partial<Material>,
    newValues: Partial<Material>
  ) {
    super();
    this.materialId = materialId;
    this.oldValues = oldValues;
    this.newValues = newValues;
  }

  execute(): void {
    this.store.updateMaterial(this.materialId, this.newValues);
  }

  undo(): void {
    this.store.updateMaterial(this.materialId, this.oldValues);
  }

  getDescription(): string {
    const material = this.store.getMaterial(this.materialId);
    return `Update ${material?.name || 'material'}`;
  }
}

/**
 * Command to assign material to object
 */
export class AssignMaterialCommand extends Command {
  private objectId: string;
  private newMaterialId: string;
  private oldMaterialId: string | null;
  private store = useMaterialsStore.getState();

  constructor(objectId: string, newMaterialId: string) {
    super();
    this.objectId = objectId;
    this.newMaterialId = newMaterialId;

    // Store the old material assignment
    this.oldMaterialId = this.store.objectMaterials.get(objectId) || null;
  }

  execute(): void {
    this.store.assignMaterialToObject(this.objectId, this.newMaterialId);
  }

  undo(): void {
    if (this.oldMaterialId) {
      this.store.assignMaterialToObject(this.objectId, this.oldMaterialId);
    } else {
      // Remove material assignment
      const newObjectMaterials = new Map(this.store.objectMaterials);
      newObjectMaterials.delete(this.objectId);
      useMaterialsStore.setState({ objectMaterials: newObjectMaterials });
    }
  }

  getDescription(): string {
    const material = this.store.getMaterial(this.newMaterialId);
    return `Assign ${material?.name || 'material'}`;
  }
}
