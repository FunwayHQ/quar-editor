/**
 * Preview Store
 *
 * Manages preview meshes for curve operations.
 */

import { create } from 'zustand';
import * as THREE from 'three';

interface PreviewStore {
  previewMesh: THREE.Mesh | null;

  setPreviewMesh: (mesh: THREE.Mesh | null) => void;
  clearPreview: () => void;
}

export const usePreviewStore = create<PreviewStore>((set, get) => ({
  previewMesh: null,

  setPreviewMesh: (mesh) => {
    // Dispose old mesh
    const oldMesh = get().previewMesh;
    if (oldMesh) {
      oldMesh.geometry.dispose();
      if (Array.isArray(oldMesh.material)) {
        oldMesh.material.forEach(m => m.dispose());
      } else {
        oldMesh.material.dispose();
      }
      console.log('[PreviewStore] Disposed old preview mesh');
    }

    set({ previewMesh: mesh });
  },

  clearPreview: () => {
    const mesh = get().previewMesh;
    if (mesh) {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
      console.log('[PreviewStore] Cleared preview');
    }
    set({ previewMesh: null });
  }
}));
