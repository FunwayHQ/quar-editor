/**
 * Knife Face Highlight Component
 *
 * NEW QMesh-based implementation - shows face edges correctly
 */

import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useObjectsStore } from '../../stores/objectsStore';
import { useEditModeStore } from '../../stores/editModeStore';

interface KnifeFaceHighlightProps {
  geometry: THREE.BufferGeometry;
  faceIndex: number; // BufferGeometry triangle index
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export function KnifeFaceHighlight({
  geometry,
  faceIndex,
  position,
  rotation,
  scale,
}: KnifeFaceHighlightProps) {
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const { editingObjectId } = useEditModeStore();

  // Create geometry showing face edges using QMesh
  const faceGeometry = useMemo(() => {
    // Dispose previous geometry to prevent memory leak
    if (geometryRef.current) {
      geometryRef.current.dispose();
      geometryRef.current = null;
    }

    if (!editingObjectId) return null;

    // Get QMesh to map triangle index to face ID
    const sceneObject = useObjectsStore.getState().getObject(editingObjectId);
    if (!sceneObject || !sceneObject.qMesh) {
      console.warn('[KnifeFaceHighlight] No QMesh found');
      return null;
    }

    const qMesh = sceneObject.qMesh;
    const faceId = qMesh.getFaceIdFromTriangleIndex(faceIndex);

    if (!faceId) {
      console.warn(`[KnifeFaceHighlight] No QMesh face for triangle ${faceIndex}`);
      return null;
    }

    const face = qMesh.faces.get(faceId);
    if (!face) {
      console.warn(`[KnifeFaceHighlight] Face ${faceId} not found in QMesh`);
      return null;
    }

    // Get face vertices from QMesh
    const faceVertices = face.getVertices();

    console.log(`[KnifeFaceHighlight] Highlighting QMesh face ${faceId} with ${faceVertices.length} vertices`);

    // Build edge positions from QMesh face
    const edgePositions: number[] = [];

    for (let i = 0; i < faceVertices.length; i++) {
      const v1 = faceVertices[i];
      const v2 = faceVertices[(i + 1) % faceVertices.length];

      edgePositions.push(
        v1.position.x, v1.position.y, v1.position.z,
        v2.position.x, v2.position.y, v2.position.z
      );
    }

    // Create edge geometry
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));

    // Store in ref for disposal
    geometryRef.current = edgeGeo;

    return edgeGeo;
  }, [geometry, faceIndex, editingObjectId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
    };
  }, []);

  if (!faceGeometry) return null;

  return (
    <lineSegments
      geometry={faceGeometry}
      position={position}
      rotation={rotation}
      scale={scale}
      raycast={() => {}}
    >
      <lineBasicMaterial color="#10B981" linewidth={2} depthTest={false} />
    </lineSegments>
  );
}
