/**
 * Edit Mode Store
 *
 * Manages polygon editing state (vertex/edge/face selection).
 * Sprint 7: Export System + Polygon Editing MVP
 * Sprint Y: Smart quad selection
 */

import { create } from 'zustand';
import { SelectionMode } from '../types/polygon';
import { findQuadPair } from '../lib/geometry/QuadDetection';
import { meshRegistry } from '../lib/mesh/MeshRegistry';

interface EditModeStore {
  // Edit mode state
  isEditMode: boolean;
  editingObjectId: string | null;
  selectionMode: SelectionMode;

  // Sprint 10: Geometry version for forcing re-renders after knife cuts
  geometryVersion: number;
  incrementGeometryVersion: () => void;

  // Sprint Y: Merged vertex mode (move connected vertices together)
  mergedVertexMode: boolean;
  setMergedVertexMode: (enabled: boolean) => void;

  // Selection sets
  selectedVertices: Set<number>;
  selectedEdges: Set<string>; // Format: "v1-v2" (sorted, e.g., "3-5")
  selectedFaces: Set<number>;

  // Mode management
  enterEditMode: (objectId: string) => void;
  exitEditMode: () => void;
  setSelectionMode: (mode: SelectionMode) => void;

  // Vertex selection
  toggleVertexSelection: (index: number, multiSelect: boolean) => void;
  selectVertex: (index: number, multiSelect: boolean) => void;
  deselectVertex: (index: number) => void;
  selectAllVertices: (vertexCount: number) => void;

  // Edge selection
  toggleEdgeSelection: (v1: number, v2: number, multiSelect: boolean) => void;
  selectEdge: (v1: number, v2: number, multiSelect: boolean) => void;
  deselectEdge: (v1: number, v2: number) => void;
  selectAllEdges: (edges: string[]) => void;

  // Face selection
  toggleFaceSelection: (index: number, multiSelect: boolean) => void;
  selectFace: (index: number, multiSelect: boolean) => void;
  deselectFace: (index: number) => void;
  selectAllFaces: (faceCount: number) => void;

  // Clear selection
  clearSelection: () => void;
  clearAllSelections: () => void;

  // Utilities
  getSelectionCount: () => number;
  hasSelection: () => boolean;
}

// Helper to create edge key (always sorted)
export function makeEdgeKey(v1: number, v2: number): string {
  return v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
}

export const useEditModeStore = create<EditModeStore>((set, get) => ({
  // Initial state
  isEditMode: false,
  editingObjectId: null,
  selectionMode: 'vertex',

  // Sprint 10: Geometry version counter (incremented after knife cuts to force re-render)
  geometryVersion: 0,
  incrementGeometryVersion: () => {
    set((state) => {
      const newVersion = state.geometryVersion + 1;
      console.log(`[EditModeStore] Incrementing geometryVersion: ${state.geometryVersion} → ${newVersion}`);
      return { geometryVersion: newVersion };
    });
  },

  // Sprint Y: Merged vertex mode (ON by default)
  mergedVertexMode: true,
  setMergedVertexMode: (enabled) => set({ mergedVertexMode: enabled }),

  selectedVertices: new Set(),
  selectedEdges: new Set(),
  selectedFaces: new Set(),

  // Mode management
  enterEditMode: (objectId) => set({
    isEditMode: true,
    editingObjectId: objectId,
    selectionMode: 'vertex',
    selectedVertices: new Set(),
    selectedEdges: new Set(),
    selectedFaces: new Set(),
  }),

  exitEditMode: () => {
    // Import knife tool store dynamically to avoid circular dependency
    import('./knifeToolStore').then(({ useKnifeToolStore }) => {
      if (useKnifeToolStore.getState().isActive) {
        useKnifeToolStore.getState().deactivateTool();
      }
    });

    set({
      isEditMode: false,
      editingObjectId: null,
      selectedVertices: new Set(),
      selectedEdges: new Set(),
      selectedFaces: new Set(),
    });
  },

  setSelectionMode: (mode) => set({
    selectionMode: mode,
    // Clear selections when switching modes
    selectedVertices: new Set(),
    selectedEdges: new Set(),
    selectedFaces: new Set(),
  }),

  // Vertex selection
  toggleVertexSelection: (index, multiSelect) => set((state) => {
    const newSelected = new Set(state.selectedVertices);

    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(index);
    }

    return { selectedVertices: newSelected };
  }),

  selectVertex: (index, multiSelect) => set((state) => {
    const newSelected = multiSelect ? new Set(state.selectedVertices) : new Set<number>();
    newSelected.add(index);
    return { selectedVertices: newSelected };
  }),

  deselectVertex: (index) => set((state) => {
    const newSelected = new Set(state.selectedVertices);
    newSelected.delete(index);
    return { selectedVertices: newSelected };
  }),

  selectAllVertices: (vertexCount) => set({
    selectedVertices: new Set(Array.from({ length: vertexCount }, (_, i) => i)),
  }),

  // Edge selection
  toggleEdgeSelection: (v1, v2, multiSelect) => set((state) => {
    const key = makeEdgeKey(v1, v2);
    const newSelected = new Set(state.selectedEdges);

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(key);
    }

    return { selectedEdges: newSelected };
  }),

  selectEdge: (v1, v2, multiSelect) => set((state) => {
    const key = makeEdgeKey(v1, v2);
    const newSelected = multiSelect ? new Set(state.selectedEdges) : new Set<string>();
    newSelected.add(key);
    return { selectedEdges: newSelected };
  }),

  deselectEdge: (v1, v2) => set((state) => {
    const key = makeEdgeKey(v1, v2);
    const newSelected = new Set(state.selectedEdges);
    newSelected.delete(key);
    return { selectedEdges: newSelected };
  }),

  selectAllEdges: (edges) => set({
    selectedEdges: new Set(edges),
  }),

  // Face selection
  toggleFaceSelection: (index, multiSelect) => set((state) => {
    const newSelected = new Set(state.selectedFaces);

    if (newSelected.has(index)) {
      // Deselect: Remove this face and its quad pair
      newSelected.delete(index);

      // Sprint Y: Also remove quad pair if it exists
      if (state.editingObjectId) {
        const mesh = meshRegistry.getMesh(state.editingObjectId);
        if (mesh?.geometry) {
          const pairIdx = findQuadPair(index, mesh.geometry);
          if (pairIdx !== null) {
            newSelected.delete(pairIdx);
          }
        }
      }
    } else {
      // Select: Add this face
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(index);

      // Sprint Y: Auto-select quad pair for intuitive quad selection
      if (state.editingObjectId) {
        const mesh = meshRegistry.getMesh(state.editingObjectId);
        if (mesh?.geometry) {
          const pairIdx = findQuadPair(index, mesh.geometry);
          if (pairIdx !== null) {
            newSelected.add(pairIdx);
            console.log(`[EditMode] Auto-selected quad pair: face ${index} + face ${pairIdx}`);
          }
        }
      }
    }

    return { selectedFaces: newSelected };
  }),

  selectFace: (index, multiSelect) => set((state) => {
    const newSelected = multiSelect ? new Set(state.selectedFaces) : new Set<number>();
    newSelected.add(index);

    // Sprint Y: Auto-select quad pair
    if (state.editingObjectId) {
      const mesh = meshRegistry.getMesh(state.editingObjectId);
      if (mesh?.geometry) {
        const pairIdx = findQuadPair(index, mesh.geometry);
        if (pairIdx !== null) {
          newSelected.add(pairIdx);
        }
      }
    }

    return { selectedFaces: newSelected };
  }),

  deselectFace: (index) => set((state) => {
    const newSelected = new Set(state.selectedFaces);
    newSelected.delete(index);

    // Sprint Y: Also deselect quad pair
    if (state.editingObjectId) {
      const mesh = meshRegistry.getMesh(state.editingObjectId);
      if (mesh?.geometry) {
        const pairIdx = findQuadPair(index, mesh.geometry);
        if (pairIdx !== null) {
          newSelected.delete(pairIdx);
        }
      }
    }

    return { selectedFaces: newSelected };
  }),

  selectAllFaces: (faceCount) => set({
    selectedFaces: new Set(Array.from({ length: faceCount }, (_, i) => i)),
  }),

  // Clear selection
  clearSelection: () => set((state) => {
    switch (state.selectionMode) {
      case 'vertex':
        return { selectedVertices: new Set() };
      case 'edge':
        return { selectedEdges: new Set() };
      case 'face':
        return { selectedFaces: new Set() };
      default:
        return state;
    }
  }),

  clearAllSelections: () => set({
    selectedVertices: new Set(),
    selectedEdges: new Set(),
    selectedFaces: new Set(),
  }),

  // Utilities
  getSelectionCount: () => {
    const state = get();
    switch (state.selectionMode) {
      case 'vertex':
        return state.selectedVertices.size;
      case 'edge':
        return state.selectedEdges.size;
      case 'face':
        return state.selectedFaces.size;
      default:
        return 0;
    }
  },

  hasSelection: () => {
    const state = get();
    return (
      state.selectedVertices.size > 0 ||
      state.selectedEdges.size > 0 ||
      state.selectedFaces.size > 0
    );
  },
}));
