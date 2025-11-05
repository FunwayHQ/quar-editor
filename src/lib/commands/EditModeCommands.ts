/**
 * Edit Mode Commands
 *
 * Undo/redo commands for polygon editing operations.
 * REFACTORED: Now uses QMesh string IDs
 */

import { Command } from './Command';
import { meshRegistry } from '../mesh/MeshRegistry';
import { useObjectsStore } from '../../stores/objectsStore';
import * as THREE from 'three';

/**
 * Move Vertices Command
 * Stores old and new positions for selected vertices
 * REFACTORED: Now uses QMesh and string vertex IDs
 */
export class MoveVerticesCommand implements Command {
  private oldPositions: Map<string, THREE.Vector3>;
  private newPositions: Map<string, THREE.Vector3>;

  constructor(
    private objectId: string,
    private vertexIds: string[],
    oldPositions: Map<string, THREE.Vector3>,
    newPositions: Map<string, THREE.Vector3>
  ) {
    this.oldPositions = new Map(oldPositions);
    this.newPositions = new Map(newPositions);
  }

  execute(): void {
    const sceneObject = useObjectsStore.getState().getObject(this.objectId);
    if (!sceneObject || !sceneObject.qMesh) return;

    const qMesh = sceneObject.qMesh;

    // Update QMesh vertices
    this.newPositions.forEach((pos, vertexId) => {
      const vertex = qMesh.vertices.get(vertexId);
      if (vertex) {
        vertex.position.copy(pos);
      }
    });

    // Recompile and update geometry
    useObjectsStore.getState().updateObjectGeometry(this.objectId, qMesh);

    console.log('[MoveVerticesCommand] Moved', this.vertexIds.length, 'vertices');
  }

  undo(): void {
    const sceneObject = useObjectsStore.getState().getObject(this.objectId);
    if (!sceneObject || !sceneObject.qMesh) return;

    const qMesh = sceneObject.qMesh;

    // Restore QMesh vertices
    this.oldPositions.forEach((pos, vertexId) => {
      const vertex = qMesh.vertices.get(vertexId);
      if (vertex) {
        vertex.position.copy(pos);
      }
    });

    // Recompile and update geometry
    useObjectsStore.getState().updateObjectGeometry(this.objectId, qMesh);

    console.log('[MoveVerticesCommand] Undone - restored', this.oldPositions.size, 'vertices');
  }
}

/**
 * Knife Cut Command
 * Stores entire geometry state before/after cut
 */
export class KnifeCutCommand implements Command {
  private oldGeometryData: {
    positions: Float32Array;
    normals: Float32Array | null;
    uvs: Float32Array | null;
    indices: Uint16Array | Uint32Array | null;
  };
  private newGeometryData: {
    positions: Float32Array;
    normals: Float32Array | null;
    uvs: Float32Array | null;
    indices: Uint16Array | Uint32Array | null;
  };

  constructor(
    private objectId: string,
    oldGeometry: THREE.BufferGeometry,
    newGeometry: THREE.BufferGeometry
  ) {
    // Store old geometry data
    this.oldGeometryData = {
      positions: new Float32Array(oldGeometry.attributes.position.array),
      normals: oldGeometry.attributes.normal ? new Float32Array(oldGeometry.attributes.normal.array) : null,
      uvs: oldGeometry.attributes.uv ? new Float32Array(oldGeometry.attributes.uv.array) : null,
      indices: oldGeometry.index ? new (oldGeometry.index.array.constructor as any)(oldGeometry.index.array) : null
    };

    // Store new geometry data
    this.newGeometryData = {
      positions: new Float32Array(newGeometry.attributes.position.array),
      normals: newGeometry.attributes.normal ? new Float32Array(newGeometry.attributes.normal.array) : null,
      uvs: newGeometry.attributes.uv ? new Float32Array(newGeometry.attributes.uv.array) : null,
      indices: newGeometry.index ? new (newGeometry.index.array.constructor as any)(newGeometry.index.array) : null
    };
  }

  execute(): void {
    this.applyGeometry(this.newGeometryData);
    console.log('[KnifeCutCommand] Applied knife cut');
  }

  undo(): void {
    this.applyGeometry(this.oldGeometryData);
    console.log('[KnifeCutCommand] Undone knife cut');
  }

  private applyGeometry(data: typeof this.oldGeometryData): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh) return;

    const geometry = mesh.geometry as THREE.BufferGeometry;

    // Update positions
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));

    // Update normals
    if (data.normals) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    }

    // Update UVs
    if (data.uvs) {
      geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    }

    // Update indices
    if (data.indices) {
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();
  }
}

/**
 * Delete Vertices Command
 * Stores geometry before deletion for restoration
 */
export class DeleteVerticesCommand implements Command {
  private oldGeometry: {
    positions: Float32Array;
    normals: Float32Array | null;
    uvs: Float32Array | null;
    indices: Uint16Array | Uint32Array | null;
  };
  private newGeometry: {
    positions: Float32Array;
    normals: Float32Array | null;
    uvs: Float32Array | null;
    indices: Uint16Array | Uint32Array | null;
  };

  constructor(
    private objectId: string,
    oldGeometry: THREE.BufferGeometry,
    newGeometry: THREE.BufferGeometry
  ) {
    // Store old geometry
    this.oldGeometry = {
      positions: new Float32Array(oldGeometry.attributes.position.array),
      normals: oldGeometry.attributes.normal ? new Float32Array(oldGeometry.attributes.normal.array) : null,
      uvs: oldGeometry.attributes.uv ? new Float32Array(oldGeometry.attributes.uv.array) : null,
      indices: oldGeometry.index ? new (oldGeometry.index.array.constructor as any)(oldGeometry.index.array) : null
    };

    // Store new geometry
    this.newGeometry = {
      positions: new Float32Array(newGeometry.attributes.position.array),
      normals: newGeometry.attributes.normal ? new Float32Array(newGeometry.attributes.normal.array) : null,
      uvs: newGeometry.attributes.uv ? new Float32Array(newGeometry.attributes.uv.array) : null,
      indices: newGeometry.index ? new (newGeometry.index.array.constructor as any)(newGeometry.index.array) : null
    };
  }

  execute(): void {
    this.applyGeometry(this.newGeometry);
    console.log('[DeleteVerticesCommand] Deleted vertices');
  }

  undo(): void {
    this.applyGeometry(this.oldGeometry);
    console.log('[DeleteVerticesCommand] Restored deleted vertices');
  }

  private applyGeometry(data: typeof this.oldGeometry): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh) return;

    const geometry = mesh.geometry as THREE.BufferGeometry;

    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));

    if (data.normals) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    }

    if (data.uvs) {
      geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    }

    if (data.indices) {
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();
  }
}

/**
 * Extrude Face Command
 * Stores geometry before/after face extrusion
 */
export class ExtrudeFaceCommand implements Command {
  private oldGeometry: {
    positions: Float32Array;
    normals: Float32Array | null;
    uvs: Float32Array | null;
    indices: Uint16Array | Uint32Array | null;
  };
  private newGeometry: {
    positions: Float32Array;
    normals: Float32Array | null;
    uvs: Float32Array | null;
    indices: Uint16Array | Uint32Array | null;
  };

  constructor(
    private objectId: string,
    private selectedFaces: Set<number>,
    private distance: number,
    oldGeometry: THREE.BufferGeometry,
    newGeometry: THREE.BufferGeometry
  ) {
    this.oldGeometry = {
      positions: new Float32Array(oldGeometry.attributes.position.array),
      normals: oldGeometry.attributes.normal ? new Float32Array(oldGeometry.attributes.normal.array) : null,
      uvs: oldGeometry.attributes.uv ? new Float32Array(oldGeometry.attributes.uv.array) : null,
      indices: oldGeometry.index ? new (oldGeometry.index.array.constructor as any)(oldGeometry.index.array) : null
    };

    this.newGeometry = {
      positions: new Float32Array(newGeometry.attributes.position.array),
      normals: newGeometry.attributes.normal ? new Float32Array(newGeometry.attributes.normal.array) : null,
      uvs: newGeometry.attributes.uv ? new Float32Array(newGeometry.attributes.uv.array) : null,
      indices: newGeometry.index ? new (newGeometry.index.array.constructor as any)(newGeometry.index.array) : null
    };
  }

  execute(): void {
    this.applyGeometry(this.newGeometry);
    console.log('[ExtrudeFaceCommand] Extruded', this.selectedFaces.size, 'faces by', this.distance);
  }

  undo(): void {
    this.applyGeometry(this.oldGeometry);
    console.log('[ExtrudeFaceCommand] Undone face extrusion');
  }

  private applyGeometry(data: typeof this.oldGeometry): void {
    const mesh = meshRegistry.getMesh(this.objectId);
    if (!mesh) return;

    const geometry = mesh.geometry as THREE.BufferGeometry;

    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));

    if (data.normals) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    }

    if (data.uvs) {
      geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    }

    if (data.indices) {
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();
  }
}
