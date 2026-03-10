/**
 * Knife Cut Command
 *
 * Command for knife tool cuts with undo/redo support.
 * Uses QMesh-based knife cut API with geometry snapshot for undo.
 */

import * as THREE from 'three';
import { Command } from './Command';
import { MeshOperations } from '../mesh/MeshOperations';
import { QMesh } from '../qmesh/QMesh';
import { useObjectsStore } from '../../stores/objectsStore';

export class KnifeCutCommand extends Command {
  private objectId: string;
  private faceId: string;
  private cutPoint1: THREE.Vector3;
  private cutPoint2: THREE.Vector3;
  private snapshotBefore: THREE.BufferGeometry | null = null;
  private snapshotAfter: THREE.BufferGeometry | null = null;
  private newFaceIds: string[] = [];

  constructor(
    objectId: string,
    faceId: string,
    cutPoint1: THREE.Vector3,
    cutPoint2: THREE.Vector3
  ) {
    super();
    this.objectId = objectId;
    this.faceId = faceId;
    this.cutPoint1 = cutPoint1.clone();
    this.cutPoint2 = cutPoint2.clone();
  }

  execute(): void {
    const objectsStore = useObjectsStore.getState();
    const sceneObject = objectsStore.getObject(this.objectId);
    if (!sceneObject || !sceneObject.qMesh) {
      console.error('[KnifeCutCommand] Object or qMesh not found');
      return;
    }

    // Snapshot current geometry for undo
    if (!this.snapshotBefore) {
      this.snapshotBefore = sceneObject.qMesh.toBufferGeometry();
    }

    // Perform the cut
    const result = MeshOperations.knifeCutQMesh(
      this.objectId,
      this.faceId,
      this.cutPoint1,
      this.cutPoint2
    );

    this.newFaceIds = result.newFaceIds;

    // Snapshot result for redo
    if (result.newFaceIds.length > 0) {
      const updatedObject = objectsStore.getObject(this.objectId);
      if (updatedObject?.qMesh) {
        this.snapshotAfter = updatedObject.qMesh.toBufferGeometry();
      }
    }
  }

  undo(): void {
    if (!this.snapshotBefore) {
      console.error('[KnifeCutCommand] No snapshot to restore');
      return;
    }

    // Reconstruct QMesh from the pre-cut geometry
    const qMesh = QMesh.fromBufferGeometry(this.snapshotBefore);
    const objectsStore = useObjectsStore.getState();
    objectsStore.updateObjectGeometry(this.objectId, qMesh);
  }

  getDescription(): string {
    return `Knife cut on face ${this.faceId}`;
  }
}
