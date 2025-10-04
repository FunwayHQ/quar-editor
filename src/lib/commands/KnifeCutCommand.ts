/**
 * Knife Cut Command
 *
 * Command for knife tool cuts with undo/redo support.
 * Mini-Sprint: Knife Tool Implementation
 */

import * as THREE from 'three';
import { Command } from './Command';
import { meshRegistry } from '../mesh/MeshRegistry';
import { MeshOperations } from '../mesh/MeshOperations';

export class KnifeCutCommand extends Command {
  private objectId: string;
  private intersectionPoints: Array<{ point: THREE.Vector3; faceIndex: number }>;
  private originalGeometry: THREE.BufferGeometry | null = null;
  private modifiedGeometry: THREE.BufferGeometry | null = null;

  constructor(
    objectId: string,
    intersectionPoints: Array<{ point: THREE.Vector3; faceIndex: number }>
  ) {
    super();
    this.objectId = objectId;
    this.intersectionPoints = intersectionPoints;
  }

  execute(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh || !mesh.geometry) {
      console.error('[KnifeCutCommand] Mesh not found');
      return;
    }

    // Store original geometry for undo
    this.originalGeometry = mesh.geometry.clone();

    console.log('[KnifeCutCommand] Before cut - vertices:', mesh.geometry.attributes.position.count);
    console.log('[KnifeCutCommand] Intersection points:', this.intersectionPoints.length);

    // Apply knife cut
    MeshOperations.knifeCut(mesh.geometry, this.intersectionPoints);

    console.log('[KnifeCutCommand] After cut - vertices:', mesh.geometry.attributes.position.count);

    // Force geometry update
    mesh.geometry.attributes.position.needsUpdate = true;
    if (mesh.geometry.index) mesh.geometry.index.needsUpdate = true;

    // Store modified geometry for redo
    this.modifiedGeometry = mesh.geometry.clone();

    console.log('[KnifeCutCommand] Knife cut executed successfully');
  }

  undo(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh || !this.originalGeometry) {
      console.error('[KnifeCutCommand] Cannot undo - mesh or original geometry not found');
      return;
    }

    // Restore original geometry
    mesh.geometry.dispose();
    mesh.geometry = this.originalGeometry.clone();

    console.log('[KnifeCutCommand] Knife cut undone');
  }

  redo(): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh || !this.modifiedGeometry) {
      console.error('[KnifeCutCommand] Cannot redo - mesh or modified geometry not found');
      return;
    }

    // Restore modified geometry
    mesh.geometry.dispose();
    mesh.geometry = this.modifiedGeometry.clone();

    console.log('[KnifeCutCommand] Knife cut redone');
  }
}
