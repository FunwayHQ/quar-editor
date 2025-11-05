/**
 * Edit Mode Store
 *
 * Manages polygon editing state (vertex/edge/face selection).
 * Sprint 7: Export System + Polygon Editing MVP
 * Sprint Y: Smart quad selection
 * REFACTORED: Now uses QMesh string IDs instead of numeric indices
 */

import { create } from 'zustand';
import { SelectionMode } from '../types/polygon';

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

  // Selection sets (NOW USING STRING IDs from QMesh)
  selectedVertices: Set<string>; // QVertex IDs
  selectedEdges: Set<string>;    // Format: "vertexId1-vertexId2" (sorted)
  selectedFaces: Set<string>;    // QFace IDs

  // Mode management
  enterEditMode: (objectId: string) => void;
  exitEditMode: () => void;
  setSelectionMode: (mode: SelectionMode) => void;

  // Vertex selection (NOW USES STRING IDs)
  toggleVertexSelection: (vertexId: string, multiSelect: boolean) => void;
  selectVertex: (vertexId: string, multiSelect: boolean) => void;
  deselectVertex: (vertexId: string) => void;
  selectAllVertices: (vertexIds: string[]) => void;

  // Edge selection (NOW USES STRING IDs)
  toggleEdgeSelection: (v1Id: string, v2Id: string, multiSelect: boolean) => void;
  selectEdge: (v1Id: string, v2Id: string, multiSelect: boolean) => void;
  deselectEdge: (v1Id: string, v2Id: string) => void;
  selectAllEdges: (edges: string[]) => void;

  // Face selection (NOW USES STRING IDs - NO MORE QUAD PAIRING NEEDED)
  toggleFaceSelection: (faceId: string, multiSelect: boolean) => void;
  selectFace: (faceId: string, multiSelect: boolean) => void;
  deselectFace: (faceId: string) => void;
  selectAllFaces: (faceIds: string[]) => void;

  // Clear selection
  clearSelection: () => void;
  clearAllSelections: () => void;

  // Utilities
  getSelectionCount: () => number;
  hasSelection: () => boolean;
}

// Helper to create edge key (always sorted)
export function makeEdgeKey(v1Id: string, v2Id: string): string {
  return v1Id < v2Id ? `${v1Id}-${v2Id}` : `${v2Id}-${v1Id}`;
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

  // Vertex selection (REFACTORED for string IDs)
  toggleVertexSelection: (vertexId, multiSelect) => set((state) => {
    const newSelected = new Set(state.selectedVertices);

    if (newSelected.has(vertexId)) {
      newSelected.delete(vertexId);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(vertexId);
    }

    return { selectedVertices: newSelected };
  }),

  selectVertex: (vertexId, multiSelect) => set((state) => {
    const newSelected = multiSelect ? new Set(state.selectedVertices) : new Set<string>();
    newSelected.add(vertexId);
    return { selectedVertices: newSelected };
  }),

  deselectVertex: (vertexId) => set((state) => {
    const newSelected = new Set(state.selectedVertices);
    newSelected.delete(vertexId);
    return { selectedVertices: newSelected };
  }),

  selectAllVertices: (vertexIds) => set({
    selectedVertices: new Set(vertexIds),
  }),

  // Edge selection (REFACTORED for string IDs)
  toggleEdgeSelection: (v1Id, v2Id, multiSelect) => set((state) => {
    const key = makeEdgeKey(v1Id, v2Id);
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

  selectEdge: (v1Id, v2Id, multiSelect) => set((state) => {
    const key = makeEdgeKey(v1Id, v2Id);
    const newSelected = multiSelect ? new Set(state.selectedEdges) : new Set<string>();
    newSelected.add(key);
    return { selectedEdges: newSelected };
  }),

  deselectEdge: (v1Id, v2Id) => set((state) => {
    const key = makeEdgeKey(v1Id, v2Id);
    const newSelected = new Set(state.selectedEdges);
    newSelected.delete(key);
    return { selectedEdges: newSelected };
  }),

  selectAllEdges: (edges) => set({
    selectedEdges: new Set(edges),
  }),

  // Face selection (REFACTORED - NO QUAD PAIRING NEEDED, QMesh handles quads natively!)
  toggleFaceSelection: (faceId, multiSelect) => set((state) => {
    const newSelected = new Set(state.selectedFaces);

    if (newSelected.has(faceId)) {
      newSelected.delete(faceId);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(faceId);
    }

    return { selectedFaces: newSelected };
  }),

  selectFace: (faceId, multiSelect) => set((state) => {
    const newSelected = multiSelect ? new Set(state.selectedFaces) : new Set<string>();
    newSelected.add(faceId);
    return { selectedFaces: newSelected };
  }),

  deselectFace: (faceId) => set((state) => {
    const newSelected = new Set(state.selectedFaces);
    newSelected.delete(faceId);
    return { selectedFaces: newSelected };
  }),

  selectAllFaces: (faceIds) => set({
    selectedFaces: new Set(faceIds),
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
