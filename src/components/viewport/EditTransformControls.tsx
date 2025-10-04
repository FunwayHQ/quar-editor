/**
 * Edit Transform Controls Component
 *
 * Transform controls for polygon editing mode (move/rotate/scale selected elements).
 * Sprint 7: Export System + Polygon Editing MVP
 */

import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEditModeStore } from '../../stores/editModeStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { meshRegistry } from '../../lib/mesh/MeshRegistry';

interface EditTransformControlsProps {
  mode: 'translate' | 'rotate' | 'scale';
}

export function EditTransformControls({ mode }: EditTransformControlsProps) {
  const {
    isEditMode,
    editingObjectId,
    selectedVertices,
    selectedEdges,
    selectedFaces,
    selectionMode,
    hasSelection
  } = useEditModeStore();

  const { objects } = useObjectsStore();
  const { executeCommand } = useCommandStore();
  const { scene } = useThree();

  // Debug log when mode changes
  useEffect(() => {
    console.log('[EditTransformControls] Mode changed to:', mode);
    console.log('[EditTransformControls] Has selection:', hasSelection());
    console.log('[EditTransformControls] Selected vertices:', selectedVertices.size);
  }, [mode, selectedVertices]);

  const controlsRef = useRef<any>(null);
  const helperRef = useRef<THREE.Object3D>(null);
  const initialPositionsRef = useRef<Map<number, THREE.Vector3>>(new Map());
  const initialTransformRef = useRef<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  } | null>(null);
  const isDraggingRef = useRef(false);

  // Get the editing object
  const editingObject = editingObjectId ? objects.get(editingObjectId) : null;

  // Calculate center point of selection
  const calculateSelectionCenter = () => {
    if (!editingObject) return new THREE.Vector3();

    // Use mesh registry instead of scene search
    const meshObject = meshRegistry.getMesh(editingObject.id);
    if (!meshObject || !meshObject.geometry) {
      console.warn('[EditTransformControls] Mesh not found in registry for', editingObject.id);
      return new THREE.Vector3();
    }

    const positions = meshObject.geometry.attributes.position;
    const center = new THREE.Vector3();
    let count = 0;

    if (selectionMode === 'vertex' && selectedVertices.size > 0) {
      selectedVertices.forEach(index => {
        center.x += positions.getX(index);
        center.y += positions.getY(index);
        center.z += positions.getZ(index);
        count++;
      });
    } else if (selectionMode === 'edge' && selectedEdges.size > 0) {
      selectedEdges.forEach(edgeKey => {
        const [v1, v2] = edgeKey.split('-').map(Number);
        center.x += positions.getX(v1) + positions.getX(v2);
        center.y += positions.getY(v1) + positions.getY(v2);
        center.z += positions.getZ(v1) + positions.getZ(v2);
        count += 2;
      });
    } else if (selectionMode === 'face' && selectedFaces.size > 0) {
      const index = meshObject.geometry.index;
      if (index) {
        selectedFaces.forEach(faceIndex => {
          const i = faceIndex * 3;
          for (let j = 0; j < 3; j++) {
            const vertexIndex = index.getX(i + j);
            center.x += positions.getX(vertexIndex);
            center.y += positions.getY(vertexIndex);
            center.z += positions.getZ(vertexIndex);
            count++;
          }
        });
      }
    }

    if (count > 0) {
      center.divideScalar(count);
      // Transform to world space
      meshObject.localToWorld(center);
      console.log('[EditTransformControls] Selection center (world):', center.toArray());
    }

    return center;
  };

  // Handle transform start
  const handleDragStart = (event?: any) => {
    if (!editingObject || !helperRef.current) return;

    // Mark that we're actually dragging the gizmo
    isDraggingRef.current = true;

    const meshObject = meshRegistry.getMesh(editingObject.id);
    if (!meshObject || !meshObject.geometry) return;

    // Store initial helper transform
    initialTransformRef.current = {
      position: helperRef.current.position.clone(),
      rotation: helperRef.current.rotation.clone(),
      scale: helperRef.current.scale.clone(),
    };

    // Store initial positions
    const positions = meshObject.geometry.attributes.position;
    initialPositionsRef.current.clear();

    if (selectionMode === 'vertex') {
      selectedVertices.forEach(index => {
        const pos = new THREE.Vector3(
          positions.getX(index),
          positions.getY(index),
          positions.getZ(index)
        );
        initialPositionsRef.current.set(index, pos);
      });
    } else if (selectionMode === 'edge') {
      selectedEdges.forEach(edgeKey => {
        const [v1, v2] = edgeKey.split('-').map(Number);
        [v1, v2].forEach(index => {
          if (!initialPositionsRef.current.has(index)) {
            const pos = new THREE.Vector3(
              positions.getX(index),
              positions.getY(index),
              positions.getZ(index)
            );
            initialPositionsRef.current.set(index, pos);
          }
        });
      });
    } else if (selectionMode === 'face') {
      const index = meshObject.geometry.index;
      if (index) {
        selectedFaces.forEach(faceIndex => {
          const i = faceIndex * 3;
          for (let j = 0; j < 3; j++) {
            const vertexIndex = index.getX(i + j);
            if (!initialPositionsRef.current.has(vertexIndex)) {
              const pos = new THREE.Vector3(
                positions.getX(vertexIndex),
                positions.getY(vertexIndex),
                positions.getZ(vertexIndex)
              );
              initialPositionsRef.current.set(vertexIndex, pos);
            }
          }
        });
      }
    }
  };

  // Handle transform change
  const handleDragChange = () => {
    if (!isDraggingRef.current || !helperRef.current || !editingObject || !initialTransformRef.current) return;

    const meshObject = meshRegistry.getMesh(editingObject.id);
    if (!meshObject || !meshObject.geometry) return;

    const positions = meshObject.geometry.attributes.position;
    const transform = helperRef.current;
    const initialTransform = initialTransformRef.current;

    // Calculate transformation deltas in world space
    const positionDelta = new THREE.Vector3().subVectors(transform.position, initialTransform.position);

    // Get selection center in world space
    const selectionCenter = calculateSelectionCenter();

    // Apply transformation based on mode
    initialPositionsRef.current.forEach((initialPos, vertexIndex) => {
      // Convert initial position to world space
      const worldPos = initialPos.clone();
      meshObject.localToWorld(worldPos);

      if (mode === 'translate') {
        // Apply world space translation
        worldPos.add(positionDelta);
      } else if (mode === 'rotate') {
        // Rotate around selection center in world space
        worldPos.sub(selectionCenter);

        const rotationDelta = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            transform.rotation.x - initialTransform.rotation.x,
            transform.rotation.y - initialTransform.rotation.y,
            transform.rotation.z - initialTransform.rotation.z
          )
        );

        worldPos.applyQuaternion(rotationDelta);
        worldPos.add(selectionCenter);
      } else if (mode === 'scale') {
        // Scale from selection center in world space
        worldPos.sub(selectionCenter);

        const scaleDelta = new THREE.Vector3(
          transform.scale.x / initialTransform.scale.x,
          transform.scale.y / initialTransform.scale.y,
          transform.scale.z / initialTransform.scale.z
        );

        worldPos.multiply(scaleDelta);
        worldPos.add(selectionCenter);
      }

      // Convert back to local space
      meshObject.worldToLocal(worldPos);
      positions.setXYZ(vertexIndex, worldPos.x, worldPos.y, worldPos.z);
    });

    positions.needsUpdate = true;
    meshObject.geometry.computeVertexNormals();
    meshObject.geometry.computeBoundingBox();
    meshObject.geometry.computeBoundingSphere();
  };

  // Handle transform end
  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;

    // TODO: Create and execute EditVerticesCommand for undo/redo
    // This will be implemented when we create the command system for edit operations

    isDraggingRef.current = false;
    initialPositionsRef.current.clear();
    initialTransformRef.current = null;

    // Update helper position to new selection center
    if (helperRef.current && editingObject && hasSelection()) {
      const newCenter = calculateSelectionCenter();
      helperRef.current.position.copy(newCenter);
      helperRef.current.rotation.set(0, 0, 0);
      helperRef.current.scale.set(1, 1, 1);
    }
  };

  // Update helper position
  useEffect(() => {
    if (helperRef.current && hasSelection() && editingObject && isEditMode) {
      const center = calculateSelectionCenter();
      helperRef.current.position.copy(center);
    }
  }, [selectedVertices, selectedEdges, selectedFaces, selectionMode, editingObject, isEditMode]);

  // Only render controls if conditions are met
  const shouldRender = isEditMode && editingObject && hasSelection();

  // Debug logging
  useEffect(() => {
    console.log('[EditTransformControls] Render check:', {
      isEditMode,
      hasEditingObject: !!editingObject,
      hasSelection: hasSelection(),
      shouldRender,
      helperExists: !!helperRef.current,
      mode
    });
  }, [isEditMode, editingObject, selectedVertices, selectedEdges, selectedFaces, mode]);

  return (
    <>
      {/* Invisible helper object for transform controls */}
      <object3D ref={helperRef} />

      {/* Transform controls attached to helper */}
      {shouldRender && helperRef.current && (
        <TransformControls
          ref={controlsRef}
          object={helperRef.current}
          mode={mode}
          onMouseDown={handleDragStart}
          onChange={handleDragChange}
          onMouseUp={handleDragEnd}
          showX
          showY
          showZ
          size={0.75}
          space="world"
          enabled={true}
        />
      )}
    </>
  );
}