/**
 * Edit Commands
 *
 * Command pattern implementation for edit mode operations (extrude, inset, etc.)
 * with full undo/redo support.
 */

import { Command } from './Command';
import * as THREE from 'three';
import { meshRegistry } from '../mesh/MeshRegistry';
import { MeshOperations } from '../mesh/MeshOperations';

/**
 * Command for extruding faces
 */
export class ExtrudeFacesCommand extends Command {
  private objectId: string;
  private selectedFaces: Set<number>;
  private distance: number;
  private originalGeometry: THREE.BufferGeometry | null = null;
  private extrudedGeometry: THREE.BufferGeometry | null = null;

  constructor(objectId: string, selectedFaces: Set<number>, distance: number) {
    super();
    this.objectId = objectId;
    this.selectedFaces = new Set(selectedFaces);
    this.distance = distance;
  }

  execute(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh || !mesh.geometry) {
      throw new Error(`Mesh ${this.objectId} not found`);
    }

    // Store original geometry
    this.originalGeometry = mesh.geometry.clone();

    // Perform extrude operation
    MeshOperations.extrudeFaces(
      mesh.geometry,
      this.selectedFaces,
      { distance: this.distance }
    );

    // Store the result
    this.extrudedGeometry = mesh.geometry.clone();
  }

  undo(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh || !this.originalGeometry) return;

    // Restore original geometry
    mesh.geometry.dispose();
    mesh.geometry = this.originalGeometry.clone();
  }

  redo(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh || !this.extrudedGeometry) return;

    // Restore extruded geometry
    mesh.geometry.dispose();
    mesh.geometry = this.extrudedGeometry.clone();
  }

  getDescription(): string {
    return `Extrude ${this.selectedFaces.size} face${this.selectedFaces.size > 1 ? 's' : ''} by ${this.distance.toFixed(2)}`;
  }
}

/**
 * Command for insetting faces
 */
export class InsetFacesCommand extends Command {
  private objectId: string;
  private selectedFaces: Set<number>;
  private amount: number;
  private originalGeometry: THREE.BufferGeometry | null = null;
  private insetGeometry: THREE.BufferGeometry | null = null;

  constructor(objectId: string, selectedFaces: Set<number>, amount: number) {
    super();
    this.objectId = objectId;
    this.selectedFaces = new Set(selectedFaces);
    this.amount = amount;
  }

  execute(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh || !mesh.geometry) {
      throw new Error(`Mesh ${this.objectId} not found`);
    }

    // Store original geometry
    this.originalGeometry = mesh.geometry.clone();

    // Perform inset operation
    MeshOperations.insetFaces(
      mesh.geometry,
      this.selectedFaces,
      this.amount
    );

    // Store the result
    this.insetGeometry = mesh.geometry.clone();
  }

  undo(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh || !this.originalGeometry) return;

    // Restore original geometry
    mesh.geometry.dispose();
    mesh.geometry = this.originalGeometry.clone();
  }

  redo(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh || !this.insetGeometry) return;

    // Restore inset geometry
    mesh.geometry.dispose();
    mesh.geometry = this.insetGeometry.clone();
  }

  getDescription(): string {
    return `Inset ${this.selectedFaces.size} face${this.selectedFaces.size > 1 ? 's' : ''} by ${this.amount.toFixed(2)}`;
  }
}

/**
 * Command for modifying geometry (generic)
 */
export class ModifyGeometryCommand extends Command {
  private objectId: string;
  private originalGeometry: THREE.BufferGeometry;
  private modifiedGeometry: THREE.BufferGeometry;
  private description: string;

  constructor(
    objectId: string,
    originalGeometry: THREE.BufferGeometry,
    modifiedGeometry: THREE.BufferGeometry,
    description: string
  ) {
    super();
    this.objectId = objectId;
    this.originalGeometry = originalGeometry.clone();
    this.modifiedGeometry = modifiedGeometry.clone();
    this.description = description;
  }

  execute(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh) {
      throw new Error(`Mesh ${this.objectId} not found`);
    }

    mesh.geometry.dispose();
    mesh.geometry = this.modifiedGeometry.clone();
  }

  undo(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh) return;

    mesh.geometry.dispose();
    mesh.geometry = this.originalGeometry.clone();
  }

  redo(): void {
    this.execute();
  }

  getDescription(): string {
    return this.description;
  }
}