/**
 * Edit Mode Store Tests
 *
 * Tests for polygon editing state management.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { useEditModeStore, makeEdgeKey } from '../editModeStore';

describe('EditModeStore', () => {
  beforeEach(() => {
    // Reset store
    useEditModeStore.setState({
      isEditMode: false,
      editingObjectId: null,
      selectionMode: 'vertex',
      selectedVertices: new Set(),
      selectedEdges: new Set(),
      selectedFaces: new Set(),
    });
  });

  describe('Mode Management', () => {
    test('should enter edit mode', () => {
      useEditModeStore.getState().enterEditMode('obj1');

      const state = useEditModeStore.getState();
      expect(state.isEditMode).toBe(true);
      expect(state.editingObjectId).toBe('obj1');
      expect(state.selectionMode).toBe('vertex');
    });

    test('should exit edit mode', () => {
      useEditModeStore.getState().enterEditMode('obj1');
      useEditModeStore.getState().exitEditMode();

      const state = useEditModeStore.getState();
      expect(state.isEditMode).toBe(false);
      expect(state.editingObjectId).toBeNull();
    });

    test('should clear selections on exit', () => {
      useEditModeStore.getState().enterEditMode('obj1');
      useEditModeStore.getState().selectVertex(0, false);
      useEditModeStore.getState().exitEditMode();

      const state = useEditModeStore.getState();
      expect(state.selectedVertices.size).toBe(0);
    });

    test('should switch selection modes', () => {
      useEditModeStore.getState().enterEditMode('obj1');

      useEditModeStore.getState().setSelectionMode('edge');
      expect(useEditModeStore.getState().selectionMode).toBe('edge');

      useEditModeStore.getState().setSelectionMode('face');
      expect(useEditModeStore.getState().selectionMode).toBe('face');
    });

    test('should clear selections when switching modes', () => {
      useEditModeStore.getState().enterEditMode('obj1');
      useEditModeStore.getState().selectVertex(0, false);

      useEditModeStore.getState().setSelectionMode('edge');

      expect(useEditModeStore.getState().selectedVertices.size).toBe(0);
    });
  });

  describe('Vertex Selection', () => {
    test('should select vertex', () => {
      useEditModeStore.getState().selectVertex(5, false);
      expect(useEditModeStore.getState().selectedVertices.has(5)).toBe(true);
    });

    test('should multi-select vertices', () => {
      useEditModeStore.getState().selectVertex(1, false);
      useEditModeStore.getState().selectVertex(3, true);
      useEditModeStore.getState().selectVertex(7, true);

      const selected = useEditModeStore.getState().selectedVertices;
      expect(selected.size).toBe(3);
      expect(selected.has(1)).toBe(true);
      expect(selected.has(3)).toBe(true);
      expect(selected.has(7)).toBe(true);
    });

    test('should replace selection when not multi-select', () => {
      useEditModeStore.getState().selectVertex(1, false);
      useEditModeStore.getState().selectVertex(3, false);

      const selected = useEditModeStore.getState().selectedVertices;
      expect(selected.size).toBe(1);
      expect(selected.has(3)).toBe(true);
      expect(selected.has(1)).toBe(false);
    });

    test('should toggle vertex selection', () => {
      useEditModeStore.getState().toggleVertexSelection(5, false);
      expect(useEditModeStore.getState().selectedVertices.has(5)).toBe(true);

      useEditModeStore.getState().toggleVertexSelection(5, false);
      expect(useEditModeStore.getState().selectedVertices.has(5)).toBe(false);
    });

    test('should deselect vertex', () => {
      useEditModeStore.getState().selectVertex(5, false);
      useEditModeStore.getState().deselectVertex(5);

      expect(useEditModeStore.getState().selectedVertices.has(5)).toBe(false);
    });

    test('should select all vertices', () => {
      useEditModeStore.getState().selectAllVertices(10);

      const selected = useEditModeStore.getState().selectedVertices;
      expect(selected.size).toBe(10);
      expect(selected.has(0)).toBe(true);
      expect(selected.has(9)).toBe(true);
    });
  });

  describe('Edge Selection', () => {
    test('should select edge', () => {
      useEditModeStore.getState().selectEdge(1, 5, false);

      const selected = useEditModeStore.getState().selectedEdges;
      expect(selected.has('1-5')).toBe(true);
    });

    test('should normalize edge keys', () => {
      useEditModeStore.getState().selectEdge(5, 1, false); // Reversed order

      const selected = useEditModeStore.getState().selectedEdges;
      expect(selected.has('1-5')).toBe(true); // Should be normalized
    });

    test('should multi-select edges', () => {
      useEditModeStore.getState().selectEdge(1, 2, false);
      useEditModeStore.getState().selectEdge(3, 4, true);

      const selected = useEditModeStore.getState().selectedEdges;
      expect(selected.size).toBe(2);
    });

    test('should toggle edge selection', () => {
      useEditModeStore.getState().toggleEdgeSelection(1, 5, false);
      expect(useEditModeStore.getState().selectedEdges.has('1-5')).toBe(true);

      useEditModeStore.getState().toggleEdgeSelection(1, 5, false);
      expect(useEditModeStore.getState().selectedEdges.has('1-5')).toBe(false);
    });

    test('should deselect edge', () => {
      useEditModeStore.getState().selectEdge(1, 5, false);
      useEditModeStore.getState().deselectEdge(1, 5);

      expect(useEditModeStore.getState().selectedEdges.has('1-5')).toBe(false);
    });

    test('should select all edges', () => {
      const edges = ['0-1', '1-2', '2-3', '3-0'];
      useEditModeStore.getState().selectAllEdges(edges);

      const selected = useEditModeStore.getState().selectedEdges;
      expect(selected.size).toBe(4);
    });
  });

  describe('Face Selection', () => {
    test('should select face', () => {
      useEditModeStore.getState().selectFace(3, false);
      expect(useEditModeStore.getState().selectedFaces.has(3)).toBe(true);
    });

    test('should multi-select faces', () => {
      useEditModeStore.getState().selectFace(1, false);
      useEditModeStore.getState().selectFace(3, true);
      useEditModeStore.getState().selectFace(5, true);

      const selected = useEditModeStore.getState().selectedFaces;
      expect(selected.size).toBe(3);
    });

    test('should toggle face selection', () => {
      useEditModeStore.getState().toggleFaceSelection(3, false);
      expect(useEditModeStore.getState().selectedFaces.has(3)).toBe(true);

      useEditModeStore.getState().toggleFaceSelection(3, false);
      expect(useEditModeStore.getState().selectedFaces.has(3)).toBe(false);
    });

    test('should deselect face', () => {
      useEditModeStore.getState().selectFace(3, false);
      useEditModeStore.getState().deselectFace(3);

      expect(useEditModeStore.getState().selectedFaces.has(3)).toBe(false);
    });

    test('should select all faces', () => {
      useEditModeStore.getState().selectAllFaces(12); // 12 faces (cube)

      const selected = useEditModeStore.getState().selectedFaces;
      expect(selected.size).toBe(12);
    });
  });

  describe('Clear Selection', () => {
    test('should clear current mode selection', () => {
      useEditModeStore.setState({ selectionMode: 'vertex' });
      useEditModeStore.getState().selectVertex(1, false);
      useEditModeStore.getState().clearSelection();

      expect(useEditModeStore.getState().selectedVertices.size).toBe(0);
    });

    test('should clear all selections', () => {
      useEditModeStore.getState().selectVertex(1, false);
      useEditModeStore.getState().selectEdge(1, 2, false);
      useEditModeStore.getState().selectFace(0, false);

      useEditModeStore.getState().clearAllSelections();

      expect(useEditModeStore.getState().selectedVertices.size).toBe(0);
      expect(useEditModeStore.getState().selectedEdges.size).toBe(0);
      expect(useEditModeStore.getState().selectedFaces.size).toBe(0);
    });
  });

  describe('Utilities', () => {
    test('should get selection count for vertex mode', () => {
      useEditModeStore.setState({ selectionMode: 'vertex' });
      useEditModeStore.getState().selectVertex(1, false);
      useEditModeStore.getState().selectVertex(2, true);

      expect(useEditModeStore.getState().getSelectionCount()).toBe(2);
    });

    test('should get selection count for edge mode', () => {
      useEditModeStore.setState({ selectionMode: 'edge' });
      useEditModeStore.getState().selectEdge(1, 2, false);

      expect(useEditModeStore.getState().getSelectionCount()).toBe(1);
    });

    test('should get selection count for face mode', () => {
      useEditModeStore.setState({ selectionMode: 'face' });
      useEditModeStore.getState().selectFace(0, false);
      useEditModeStore.getState().selectFace(1, true);
      useEditModeStore.getState().selectFace(2, true);

      expect(useEditModeStore.getState().getSelectionCount()).toBe(3);
    });

    test('should detect if has selection', () => {
      expect(useEditModeStore.getState().hasSelection()).toBe(false);

      useEditModeStore.getState().selectVertex(0, false);
      expect(useEditModeStore.getState().hasSelection()).toBe(true);
    });
  });

  describe('Edge Key Helper', () => {
    test('should create normalized edge key', () => {
      expect(makeEdgeKey(1, 5)).toBe('1-5');
      expect(makeEdgeKey(5, 1)).toBe('1-5'); // Should be same (sorted)
    });

    test('should handle same indices', () => {
      expect(makeEdgeKey(3, 3)).toBe('3-3');
    });
  });
});
