/**
 * Boolean Operation Commands
 *
 * Atomic commands for CSG boolean operations with undo/redo support.
 */

import { Command } from './Command';
import { useObjectsStore, SceneObject } from '../../stores/objectsStore';
import { performUnion, performSubtract, performIntersect, generateBooleanName, BooleanOperation } from '../mesh/BooleanOperations';
import { meshRegistry } from '../mesh/MeshRegistry';
import * as THREE from 'three';

/**
 * Boolean Operation Command
 * Atomic command that handles create result + optionally delete originals
 */
export class BooleanOperationCommand implements Command {
  private resultObject: SceneObject | null = null;
  private baseMeshData: SceneObject;
  private toolMeshData: SceneObject;
  private baseMeshDeleted: boolean = false;
  private toolMeshDeleted: boolean = false;

  constructor(
    private baseMeshId: string,
    private toolMeshId: string,
    private operation: BooleanOperation,
    private keepOriginals: boolean
  ) {
    // Store original mesh data for undo
    const base = useObjectsStore.getState().objects.get(baseMeshId);
    const tool = useObjectsStore.getState().objects.get(toolMeshId);

    if (!base || !tool) {
      throw new Error('Base or tool mesh not found');
    }

    this.baseMeshData = JSON.parse(JSON.stringify(base));
    this.toolMeshData = JSON.parse(JSON.stringify(tool));
  }

  execute(): void {
    // Get meshes from registry
    const baseMesh = meshRegistry.getMesh(this.baseMeshId);
    const toolMesh = meshRegistry.getMesh(this.toolMeshId);

    if (!baseMesh || !toolMesh) {
      throw new Error('Meshes not found in registry');
    }

    // Perform boolean operation
    let resultMesh: THREE.Mesh;

    switch (this.operation) {
      case 'union':
        resultMesh = performUnion(baseMesh, toolMesh);
        break;
      case 'subtract':
        resultMesh = performSubtract(baseMesh, toolMesh);
        break;
      case 'intersect':
        resultMesh = performIntersect(baseMesh, toolMesh);
        break;
      default:
        throw new Error(`Unknown operation: ${this.operation}`);
    }

    // Extract geometry data
    const geometry = resultMesh.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const uvAttr = geometry.getAttribute('uv');
    const indexAttr = geometry.getIndex();

    const importedGeometry = {
      vertices: Array.from(positionAttr.array),
      normals: normalAttr ? Array.from(normalAttr.array) : [],
      uvs: uvAttr ? Array.from(uvAttr.array) : [],
      indices: indexAttr ? Array.from(indexAttr.array) : undefined
    };

    // Create result object
    const now = Date.now();
    const resultName = generateBooleanName(
      this.operation,
      this.baseMeshData.name,
      this.toolMeshData.name
    );

    this.resultObject = {
      id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: resultName,
      type: 'imported',
      visible: true,
      locked: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parentId: null,
      children: [],
      importedGeometry,
      createdAt: now,
      modifiedAt: now
    };

    // Add result to store
    useObjectsStore.getState().objects.set(this.resultObject.id, this.resultObject);

    // Delete originals if requested
    if (!this.keepOriginals) {
      useObjectsStore.getState().objects.delete(this.baseMeshId);
      useObjectsStore.getState().objects.delete(this.toolMeshId);
      this.baseMeshDeleted = true;
      this.toolMeshDeleted = true;
    }

    // Cleanup
    geometry.dispose();
    if (resultMesh.material) {
      if (Array.isArray(resultMesh.material)) {
        resultMesh.material.forEach(m => m.dispose());
      } else {
        resultMesh.material.dispose();
      }
    }

    console.log('[BooleanCommand] Executed', this.operation, '→', resultName);
  }

  undo(): void {
    // Remove result object
    if (this.resultObject) {
      useObjectsStore.getState().objects.delete(this.resultObject.id);
    }

    // Restore original meshes if they were deleted
    if (this.baseMeshDeleted) {
      useObjectsStore.getState().objects.set(this.baseMeshId, this.baseMeshData);
    }
    if (this.toolMeshDeleted) {
      useObjectsStore.getState().objects.set(this.toolMeshId, this.toolMeshData);
    }

    console.log('[BooleanCommand] Undone', this.operation);
  }

  getDescription(): string {
    const operationName = this.operation.charAt(0).toUpperCase() + this.operation.slice(1);
    return `Boolean ${operationName}: ${this.baseMeshData.name} ${this.operation === 'union' ? '+' : this.operation === 'subtract' ? '-' : '∩'} ${this.toolMeshData.name}`;
  }
}
