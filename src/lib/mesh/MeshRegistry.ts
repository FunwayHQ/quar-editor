/**
 * Mesh Registry
 *
 * Singleton registry to store and access Three.js mesh references
 * for edit mode operations.
 */

import * as THREE from 'three';

class MeshRegistry {
  private static instance: MeshRegistry;
  private meshes: Map<string, THREE.Mesh> = new Map();

  private constructor() {}

  public static getInstance(): MeshRegistry {
    if (!MeshRegistry.instance) {
      MeshRegistry.instance = new MeshRegistry();
    }
    return MeshRegistry.instance;
  }

  /**
   * Register a mesh with its object ID
   */
  public registerMesh(objectId: string, mesh: THREE.Mesh): void {
    this.meshes.set(objectId, mesh);
  }

  /**
   * Unregister a mesh when it's removed from scene
   */
  public unregisterMesh(objectId: string): void {
    this.meshes.delete(objectId);
  }

  /**
   * Get a mesh by object ID
   */
  public getMesh(objectId: string): THREE.Mesh | undefined {
    return this.meshes.get(objectId);
  }

  /**
   * Clear all mesh references
   */
  public clear(): void {
    this.meshes.clear();
  }

  /**
   * Check if a mesh is registered
   */
  public hasMesh(objectId: string): boolean {
    return this.meshes.has(objectId);
  }
}

// Export singleton instance
export const meshRegistry = MeshRegistry.getInstance();