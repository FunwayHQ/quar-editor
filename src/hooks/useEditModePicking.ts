/**
 * Edit Mode Picking Hook
 *
 * Handles raycasting and selection in edit mode.
 * Sprint 7: Export System + Polygon Editing MVP
 * REFACTORED: Now uses QMesh string IDs
 */

import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditModeStore } from '../stores/editModeStore';
import { useObjectsStore } from '../stores/objectsStore';

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
    if (!sceneObject || !sceneObject.qMesh) return;

    const qMesh = sceneObject.qMesh;

    // Get geometry from the clicked mesh
    const mesh = object as THREE.Mesh;
    if (!mesh.geometry || !(mesh.geometry instanceof THREE.BufferGeometry)) return;

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
          // Get the face ID from the triangle index
          const faceId = qMesh.triangleFaceMap.get(intersection.faceIndex);
          if (!faceId) break;

          const face = qMesh.faces.get(faceId);
          if (!face) break;

          // Find the closest vertex to the intersection point
          const vertices = face.getVertices();
          let closestVertex = vertices[0];
          let closestDistance = intersection.point.distanceTo(
            mesh.localToWorld(vertices[0].position.clone())
          );

          for (let i = 1; i < vertices.length; i++) {
            const worldPos = mesh.localToWorld(vertices[i].position.clone());
            const distance = intersection.point.distanceTo(worldPos);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestVertex = vertices[i];
            }
          }

          toggleVertexSelection(closestVertex.id, multiSelect);
        }
        break;
      }

      case 'edge': {
        // Find the closest edge to the intersection point
        const edges = qMesh.getEdges();
        let closestEdge: { v1: typeof edges[0]['v1']; v2: typeof edges[0]['v2'] } | null = null;
        let closestDistance = Infinity;

        edges.forEach(edge => {
          const p0 = mesh.localToWorld(edge.v1.position.clone());
          const p1 = mesh.localToWorld(edge.v2.position.clone());

          // Calculate closest point on line segment
          const line = new THREE.Line3(p0, p1);
          const closestPoint = new THREE.Vector3();
          line.closestPointToPoint(intersection.point, true, closestPoint);

          const distance = intersection.point.distanceTo(closestPoint);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestEdge = edge;
          }
        });

        // Only select if within threshold
        if (closestEdge && closestDistance < 0.1) {
          toggleEdgeSelection(closestEdge.v1.id, closestEdge.v2.id, multiSelect);
        }
        break;
      }

      case 'face': {
        if (intersection.faceIndex !== undefined) {
          // Get the face ID directly from the triangle index using triangleFaceMap
          const faceId = qMesh.triangleFaceMap.get(intersection.faceIndex);

          if (faceId) {
            toggleFaceSelection(faceId, multiSelect);
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
