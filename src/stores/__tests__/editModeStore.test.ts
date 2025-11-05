/**
 * Edit Mode Store Tests
 *
 * Tests for polygon editing state management.
 * Updated for QMesh string ID architecture
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
      useEditModeStore.getState().selectVertex('v_0', false);
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
      useEditModeStore.getState().selectVertex('v_0', false);

      useEditModeStore.getState().setSelectionMode('edge');

      expect(useEditModeStore.getState().selectedVertices.size).toBe(0);
    });
  });

  describe('Vertex Selection', () => {
    test('should select vertex', () => {
      useEditModeStore.getState().selectVertex('v_5', false);
      expect(useEditModeStore.getState().selectedVertices.has('v_5')).toBe(true);
    });

    test('should multi-select vertices', () => {
      useEditModeStore.getState().selectVertex('v_1', false);
      useEditModeStore.getState().selectVertex('v_3', true);
      useEditModeStore.getState().selectVertex('v_7', true);

      const selected = useEditModeStore.getState().selectedVertices;
      expect(selected.size).toBe(3);
      expect(selected.has('v_1')).toBe(true);
      expect(selected.has('v_3')).toBe(true);
      expect(selected.has('v_7')).toBe(true);
    });

    test('should replace selection when not multi-select', () => {
      useEditModeStore.getState().selectVertex('v_1', false);
      useEditModeStore.getState().selectVertex('v_3', false);

      const selected = useEditModeStore.getState().selectedVertices;
      expect(selected.size).toBe(1);
      expect(selected.has('v_3')).toBe(true);
      expect(selected.has('v_1')).toBe(false);
    });

    test('should toggle vertex selection', () => {
      useEditModeStore.getState().toggleVertexSelection('v_5', false);
      expect(useEditModeStore.getState().selectedVertices.has('v_5')).toBe(true);

      useEditModeStore.getState().toggleVertexSelection('v_5', false);
      expect(useEditModeStore.getState().selectedVertices.has('v_5')).toBe(false);
    });

    test('should deselect vertex', () => {
      useEditModeStore.getState().selectVertex('v_5', false);
      useEditModeStore.getState().deselectVertex('v_5');

      expect(useEditModeStore.getState().selectedVertices.has('v_5')).toBe(false);
    });

    test('should select all vertices', () => {
      const vertexIds = Array.from({ length: 10 }, (_, i) => `v_${i}`);
      useEditModeStore.getState().selectAllVertices(vertexIds);

      const selected = useEditModeStore.getState().selectedVertices;
      expect(selected.size).toBe(10);
      expect(selected.has('v_0')).toBe(true);
      expect(selected.has('v_9')).toBe(true);
    });
  });

  describe('Edge Selection', () => {
    test('should select edge', () => {
      useEditModeStore.getState().selectEdge('v_1', 'v_5', false);

      const selected = useEditModeStore.getState().selectedEdges;
      expect(selected.has('v_1-v_5')).toBe(true);
    });

    test('should normalize edge keys', () => {
      useEditModeStore.getState().selectEdge('v_5', 'v_1', false); // Reversed order

      const selected = useEditModeStore.getState().selectedEdges;
      expect(selected.has('v_1-v_5')).toBe(true); // Should be normalized
    });

    test('should multi-select edges', () => {
      useEditModeStore.getState().selectEdge('v_1', 'v_2', false);
      useEditModeStore.getState().selectEdge('v_3', 'v_4', true);

      const selected = useEditModeStore.getState().selectedEdges;
      expect(selected.size).toBe(2);
    });

    test('should toggle edge selection', () => {
      useEditModeStore.getState().toggleEdgeSelection('v_1', 'v_5', false);
      expect(useEditModeStore.getState().selectedEdges.has('v_1-v_5')).toBe(true);

      useEditModeStore.getState().toggleEdgeSelection('v_1', 'v_5', false);
      expect(useEditModeStore.getState().selectedEdges.has('v_1-v_5')).toBe(false);
    });

    test('should deselect edge', () => {
      useEditModeStore.getState().selectEdge('v_1', 'v_5', false);
      useEditModeStore.getState().deselectEdge('v_1', 'v_5');

      expect(useEditModeStore.getState().selectedEdges.has('v_1-v_5')).toBe(false);
    });

    test('should select all edges', () => {
      const edges = ['v_0-v_1', 'v_1-v_2', 'v_2-v_3', 'v_3-v_0'];
      useEditModeStore.getState().selectAllEdges(edges);

      const selected = useEditModeStore.getState().selectedEdges;
      expect(selected.size).toBe(4);
    });
  });

  describe('Face Selection', () => {
    test('should select face', () => {
      useEditModeStore.getState().selectFace('f_3', false);
      expect(useEditModeStore.getState().selectedFaces.has('f_3')).toBe(true);
    });

    test('should multi-select faces', () => {
      useEditModeStore.getState().selectFace('f_1', false);
      useEditModeStore.getState().selectFace('f_3', true);
      useEditModeStore.getState().selectFace('f_5', true);

      const selected = useEditModeStore.getState().selectedFaces;
      expect(selected.size).toBe(3);
    });

    test('should toggle face selection', () => {
      useEditModeStore.getState().toggleFaceSelection('f_3', false);
      expect(useEditModeStore.getState().selectedFaces.has('f_3')).toBe(true);

      useEditModeStore.getState().toggleFaceSelection('f_3', false);
      expect(useEditModeStore.getState().selectedFaces.has('f_3')).toBe(false);
    });

    test('should deselect face', () => {
      useEditModeStore.getState().selectFace('f_3', false);
      useEditModeStore.getState().deselectFace('f_3');

      expect(useEditModeStore.getState().selectedFaces.has('f_3')).toBe(false);
    });

    test('should select all faces', () => {
      const faceIds = Array.from({ length: 6 }, (_, i) => `f_${i}`); // 6 faces (cube with quads)
      useEditModeStore.getState().selectAllFaces(faceIds);

      const selected = useEditModeStore.getState().selectedFaces;
      expect(selected.size).toBe(6);
    });
  });

  describe('Clear Selection', () => {
    test('should clear current mode selection', () => {
      useEditModeStore.setState({ selectionMode: 'vertex' });
      useEditModeStore.getState().selectVertex('v_1', false);
      useEditModeStore.getState().clearSelection();

      expect(useEditModeStore.getState().selectedVertices.size).toBe(0);
    });

    test('should clear all selections', () => {
      useEditModeStore.getState().selectVertex('v_1', false);
      useEditModeStore.getState().selectEdge('v_1', 'v_2', false);
      useEditModeStore.getState().selectFace('f_0', false);

      useEditModeStore.getState().clearAllSelections();

      expect(useEditModeStore.getState().selectedVertices.size).toBe(0);
      expect(useEditModeStore.getState().selectedEdges.size).toBe(0);
      expect(useEditModeStore.getState().selectedFaces.size).toBe(0);
    });
  });

  describe('Utilities', () => {
    test('should get selection count for vertex mode', () => {
      useEditModeStore.setState({ selectionMode: 'vertex' });
      useEditModeStore.getState().selectVertex('v_1', false);
      useEditModeStore.getState().selectVertex('v_2', true);

      expect(useEditModeStore.getState().getSelectionCount()).toBe(2);
    });

    test('should get selection count for edge mode', () => {
      useEditModeStore.setState({ selectionMode: 'edge' });
      useEditModeStore.getState().selectEdge('v_1', 'v_2', false);

      expect(useEditModeStore.getState().getSelectionCount()).toBe(1);
    });

    test('should get selection count for face mode', () => {
      useEditModeStore.setState({ selectionMode: 'face' });
      useEditModeStore.getState().selectFace('f_0', false);
      useEditModeStore.getState().selectFace('f_1', true);
      useEditModeStore.getState().selectFace('f_2', true);

      expect(useEditModeStore.getState().getSelectionCount()).toBe(3);
    });

    test('should detect if has selection', () => {
      expect(useEditModeStore.getState().hasSelection()).toBe(false);

      useEditModeStore.getState().selectVertex('v_0', false);
      expect(useEditModeStore.getState().hasSelection()).toBe(true);
    });
  });

  describe('Edge Key Helper', () => {
    test('should create normalized edge key', () => {
      expect(makeEdgeKey('v_1', 'v_5')).toBe('v_1-v_5');
      expect(makeEdgeKey('v_5', 'v_1')).toBe('v_1-v_5'); // Should be same (sorted)
    });

    test('should handle same IDs', () => {
      expect(makeEdgeKey('v_3', 'v_3')).toBe('v_3-v_3');
    });
  });
});
