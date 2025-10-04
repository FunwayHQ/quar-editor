/**
 * Edit Mode Picking Hook
 *
 * Handles raycasting and selection in edit mode.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditModeStore } from '../stores/editModeStore';
import { useObjectsStore } from '../stores/objectsStore';
import { pickVertex } from '../lib/polygon/pickers/VertexPicker';
import { pickEdge } from '../lib/polygon/pickers/EdgePicker';
import { pickFace } from '../lib/polygon/pickers/FacePicker';

export function useEditModePicking() {
  const { camera, raycaster } = useThree();
  const {
    isEditMode,
    editingObjectId,
    selectionMode,
    toggleVertexSelection,
    toggleEdgeSelection,
    toggleFaceSelection,
  } = useEditModeStore();

  const { objects } = useObjectsStore();

  const handleEditModeClick = (event: THREE.Event, object: THREE.Object3D) => {
    if (!isEditMode || !editingObjectId) return;

    // Get the scene object we're editing
    const sceneObject = objects.get(editingObjectId);
    if (!sceneObject) return;

    // Get geometry from the clicked mesh
    const mesh = object as THREE.Mesh;
    if (!mesh.geometry || !(mesh.geometry instanceof THREE.BufferGeometry)) return;

    const geometry = mesh.geometry;

    // Cast ray to get intersection
    const mouseEvent = event as any; // ThreeEvent
    raycaster.setFromCamera(mouseEvent.pointer, camera);

    const intersects = raycaster.intersectObject(mesh);
    if (intersects.length === 0) return;

    const intersection = intersects[0];
    const multiSelect = mouseEvent.shiftKey;

    // Handle selection based on mode
    switch (selectionMode) {
      case 'vertex': {
        if (intersection.faceIndex !== undefined) {
          const result = pickVertex(
            geometry,
            intersection.point,
            intersection.faceIndex,
            0.15 // Threshold
          );

          if (result) {
            toggleVertexSelection(result.vertexIndex, multiSelect);
          }
        }
        break;
      }

      case 'edge': {
        const result = pickEdge(
          geometry,
          intersection.point,
          0.1 // Threshold
        );

        if (result) {
          toggleEdgeSelection(result.v1, result.v2, multiSelect);
        }
        break;
      }

      case 'face': {
        if (intersection.faceIndex !== undefined) {
          const result = pickFace(geometry, intersection.faceIndex);

          if (result) {
            toggleFaceSelection(result.faceIndex, multiSelect);
          }
        }
        break;
      }
    }
  };

  return {
    handleEditModeClick,
    isEditMode,
  };
}
