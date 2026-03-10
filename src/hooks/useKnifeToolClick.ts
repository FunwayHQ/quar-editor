/**
 * useKnifeToolClick Hook
 *
 * Handles knife tool click logic: edge snapping, face validation,
 * and intersection calculation. Extracted from SceneObject.tsx.
 */

import * as THREE from 'three';
import { useObjectsStore } from '../stores/objectsStore';
import { useKnifeToolStore } from '../stores/knifeToolStore';
import {
  findLineIntersections,
  findNearbyEdge,
  closestPointOnLine,
} from '../lib/geometry/IntersectionUtils';

/**
 * Returns a handler function for knife tool clicks.
 * Returns null if the knife click was not handled (not a knife event).
 */
export function useKnifeToolClick(
  editingObjectId: string | null,
  meshRef: React.RefObject<THREE.Mesh | null>
) {
  const {
    isActive: isKnifeActive,
    drawingPath,
    targetFaceIndex,
    addPathPoint,
    setIntersectionPoints,
  } = useKnifeToolStore();

  /**
   * Handle a knife tool click event.
   * @returns true if the click was consumed by the knife tool, false otherwise
   */
  const handleKnifeClick = (event: THREE.Event): boolean => {
    if (!isKnifeActive || !editingObjectId || !meshRef.current) return false;

    // Filter intersections to only use hits on Mesh objects (not lineSegments/helpers)
    const allIntersections = (event as any).intersections || [];
    const intersection = allIntersections.find(
      (i: any) => i.object?.isMesh
    );
    if (!intersection) return true; // Consumed but no valid hit

    // Snap to QMesh face edges (not BufferGeometry triangulation diagonals)
    const sceneObjForSnap = useObjectsStore.getState().getObject(editingObjectId);
    const qMesh = sceneObjForSnap?.qMesh;

    let snapPoint: THREE.Vector3;

    if (qMesh && intersection.faceIndex !== undefined) {
      // Find the QMesh face from the triangle index
      const qFaceId = qMesh.getFaceIdFromTriangleIndex(intersection.faceIndex);
      const qFace = qFaceId ? qMesh.faces.get(qFaceId) : null;

      if (qFace) {
        // Snap to nearest REAL edge of the QMesh face
        const faceVerts = qFace.getVertices();
        let bestDist = Infinity;
        let bestSnapPoint: THREE.Vector3 | null = null;

        for (let i = 0; i < faceVerts.length; i++) {
          const p0 = faceVerts[i].position.clone();
          const p1 = faceVerts[(i + 1) % faceVerts.length].position.clone();

          // Transform to world space
          meshRef.current!.localToWorld(p0);
          meshRef.current!.localToWorld(p1);

          const candidate = closestPointOnLine(p0, p1, intersection.point);
          const dist = intersection.point.distanceTo(candidate);

          if (dist < bestDist) {
            bestDist = dist;
            bestSnapPoint = candidate;
          }
        }

        if (bestSnapPoint && bestDist < 1.5) {
          snapPoint = bestSnapPoint;
          console.log('[KnifeTool] Snapped to QMesh edge, dist:', bestDist.toFixed(3));
        } else {
          console.warn('[KnifeTool] Click must be near an edge. Click closer to an edge.');
          return true;
        }
      } else {
        console.warn('[KnifeTool] Could not find QMesh face for triangle', intersection.faceIndex);
        return true;
      }
    } else {
      // Fallback to BufferGeometry edge snapping
      const nearbyEdge = findNearbyEdge(
        intersection.point,
        meshRef.current!.geometry,
        meshRef.current!,
        1.5
      );

      if (nearbyEdge) {
        const positions = meshRef.current!.geometry.attributes.position;
        const [v0Idx, v1Idx] = nearbyEdge;
        const p0 = new THREE.Vector3().fromBufferAttribute(positions, v0Idx);
        const p1 = new THREE.Vector3().fromBufferAttribute(positions, v1Idx);
        meshRef.current!.localToWorld(p0);
        meshRef.current!.localToWorld(p1);
        snapPoint = closestPointOnLine(p0, p1, intersection.point);
      } else {
        console.warn('[KnifeTool] Click must be near an edge. Click closer to an edge.');
        return true;
      }
    }

    // Validate: second point must be on the same QMesh face
    if (targetFaceIndex !== null && intersection.faceIndex !== targetFaceIndex) {
      const sceneObj = useObjectsStore.getState().getObject(editingObjectId);
      if (sceneObj?.qMesh) {
        const targetQFace = sceneObj.qMesh.getFaceIdFromTriangleIndex(targetFaceIndex);
        const clickedQFace = sceneObj.qMesh.getFaceIdFromTriangleIndex(intersection.faceIndex);
        if (targetQFace && clickedQFace && targetQFace === clickedQFace) {
          console.log('[KnifeTool] Same QMesh face', targetQFace, '- OK');
        } else {
          console.warn('[KnifeTool] Second point must be on the same face!', targetQFace, '!=', clickedQFace);
          return true;
        }
      } else {
        console.warn('[KnifeTool] Second point must be on the same face!');
        return true;
      }
    }

    // Only accept 2 points max
    if (drawingPath.length >= 2) {
      console.warn('[KnifeTool] Already have 2 points - click Confirm or press Enter');
      return true;
    }

    // Add point to cutting path (pass face index for first point)
    addPathPoint(snapPoint!, intersection.faceIndex);

    // After second point, calculate intersections
    if (drawingPath.length === 1) {
      const currentPath = [...drawingPath, snapPoint!];
      const intersections = findLineIntersections(
        currentPath[0],
        currentPath[1],
        meshRef.current!.geometry,
        meshRef.current!
      );

      console.log('[KnifeTool] Total intersections:', intersections.length);
      setIntersectionPoints(intersections);
    }

    return true;
  };

  return { handleKnifeClick, isKnifeActive, drawingPath, targetFaceIndex };
}
