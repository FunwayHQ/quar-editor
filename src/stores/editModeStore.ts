/**
 * Edit Mode Store
 *
 * Manages polygon editing state (vertex/edge/face selection).
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { create } from 'zustand';
import { SelectionMode } from '../types/polygon';

interface EditModeStore {
  // Edit mode state
  isEditMode: boolean;
  editingObjectId: string | null;
  selectionMode: SelectionMode;

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

  exitEditMode: () => set({
    isEditMode: false,
    editingObjectId: null,
    selectedVertices: new Set(),
    selectedEdges: new Set(),
    selectedFaces: new Set(),
  }),

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
      newSelected.delete(index);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(index);
    }

    return { selectedFaces: newSelected };
  }),

  selectFace: (index, multiSelect) => set((state) => {
    const newSelected = multiSelect ? new Set(state.selectedFaces) : new Set<number>();
    newSelected.add(index);
    return { selectedFaces: newSelected };
  }),

  deselectFace: (index) => set((state) => {
    const newSelected = new Set(state.selectedFaces);
    newSelected.delete(index);
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
