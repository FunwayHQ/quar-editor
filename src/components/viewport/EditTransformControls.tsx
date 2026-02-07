/**
 * Edit Transform Controls Component
 *
 * Transform controls for polygon editing mode (move/rotate/scale selected elements).
 * Sprint 7: Export System + Polygon Editing MVP
 * REFACTORED: Now uses QMesh string IDs
 */

import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEditModeStore } from '../../stores/editModeStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { meshRegistry } from '../../lib/mesh/MeshRegistry';
import { MoveVerticesCommand } from '../../lib/commands/EditModeCommands';

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
    mergedVertexMode,
    hasSelection
  } = useEditModeStore();

  const { objects, updateObjectGeometry } = useObjectsStore();
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
  const initialPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map()); // NOW STRING IDs
  const initialTransformRef = useRef<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  } | null>(null);
  const isDraggingRef = useRef(false);

  // Get the editing object
  const editingObject = editingObjectId ? objects.get(editingObjectId) : null;

  // Calculate center point of selection (REFACTORED for QMesh)
  const calculateSelectionCenter = () => {
    if (!editingObject || !editingObject.qMesh) return new THREE.Vector3();

    const qMesh = editingObject.qMesh;
    const meshObject = meshRegistry.getMesh(editingObject.id);
    if (!meshObject) {
      console.warn('[EditTransformControls] Mesh not found in registry for', editingObject.id);
      return new THREE.Vector3();
    }

    const center = new THREE.Vector3();
    let count = 0;

    if (selectionMode === 'vertex' && selectedVertices.size > 0) {
      selectedVertices.forEach(vertexId => {
        const vertex = qMesh.vertices.get(vertexId);
        if (vertex) {
          center.add(vertex.position);
          count++;
        }
      });
    } else if (selectionMode === 'edge' && selectedEdges.size > 0) {
      selectedEdges.forEach(edgeKey => {
        const [v1Id, v2Id] = edgeKey.split('-');
        const v1 = qMesh.vertices.get(v1Id);
        const v2 = qMesh.vertices.get(v2Id);
        if (v1 && v2) {
          center.add(v1.position);
          center.add(v2.position);
          count += 2;
        }
      });
    } else if (selectionMode === 'face' && selectedFaces.size > 0) {
      selectedFaces.forEach(faceId => {
        if (qMesh.faces && qMesh.faces instanceof Map) {
          const face = qMesh.faces.get(faceId);
          if (face) {
            const vertices = face.getVertices();
            vertices.forEach(vertex => {
              center.add(vertex.position);
              count++;
            });
          }
        }
      });
    }

    if (count > 0) {
      center.divideScalar(count);
      // Transform to world space
      meshObject.localToWorld(center);
      console.log('[EditTransformControls] Selection center (world):', center.toArray());
    }

    return center;
  };

  // Handle transform start (REFACTORED for QMesh)
  const handleDragStart = (event?: any) => {
    if (!editingObject || !editingObject.qMesh || !helperRef.current) return;

    // Mark that we're actually dragging the gizmo
    isDraggingRef.current = true;

    const qMesh = editingObject.qMesh;

    // Store initial helper transform
    initialTransformRef.current = {
      position: helperRef.current.position.clone(),
      rotation: helperRef.current.rotation.clone(),
      scale: helperRef.current.scale.clone(),
    };

    // Store initial positions
    initialPositionsRef.current.clear();

    if (selectionMode === 'vertex') {
      // TODO: Implement merged vertex mode for QMesh
      // For now, just use selected vertices
      console.log(`[EditTransform] Vertex mode - selected: ${selectedVertices.size}`);

      selectedVertices.forEach(vertexId => {
        const vertex = qMesh.vertices.get(vertexId);
        if (vertex) {
          initialPositionsRef.current.set(vertexId, vertex.position.clone());
        }
      });
    } else if (selectionMode === 'edge') {
      selectedEdges.forEach(edgeKey => {
        const [v1Id, v2Id] = edgeKey.split('-');
        [v1Id, v2Id].forEach(vertexId => {
          if (!initialPositionsRef.current.has(vertexId)) {
            const vertex = qMesh.vertices.get(vertexId);
            if (vertex) {
              initialPositionsRef.current.set(vertexId, vertex.position.clone());
            }
          }
        });
      });
    } else if (selectionMode === 'face') {
      selectedFaces.forEach(faceId => {
        if (qMesh.faces && qMesh.faces instanceof Map) {
          const face = qMesh.faces.get(faceId);
          if (face) {
            const vertices = face.getVertices();
            vertices.forEach(vertex => {
              if (!initialPositionsRef.current.has(vertex.id)) {
                initialPositionsRef.current.set(vertex.id, vertex.position.clone());
              }
            });
          }
        }
      });
    }
  };

  // Handle transform change (REFACTORED for QMesh)
  const handleDragChange = () => {
    if (!isDraggingRef.current || !helperRef.current || !editingObject || !editingObject.qMesh || !initialTransformRef.current) return;

    const qMesh = editingObject.qMesh;
    const meshObject = meshRegistry.getMesh(editingObject.id);
    if (!meshObject) return;

    const transform = helperRef.current;
    const initialTransform = initialTransformRef.current;

    // Calculate transformation deltas in world space
    const positionDelta = new THREE.Vector3().subVectors(transform.position, initialTransform.position);

    // Get selection center in world space
    const selectionCenter = calculateSelectionCenter();

    // Apply transformation to QMesh vertices
    initialPositionsRef.current.forEach((initialPos, vertexId) => {
      const vertex = qMesh.vertices.get(vertexId);
      if (!vertex) return;

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

      // Convert back to local space and update QMesh vertex
      meshObject.worldToLocal(worldPos);
      vertex.position.copy(worldPos);
    });

    // CRITICAL: Recompile QMesh to renderGeometry for real-time visual feedback
    const newRenderGeometry = qMesh.toBufferGeometry();

    // Replace the mesh's geometry
    if (editingObject.renderGeometry) {
      editingObject.renderGeometry.dispose();
    }
    editingObject.renderGeometry = newRenderGeometry;
    meshObject.geometry = newRenderGeometry;
  };

  // Handle transform end (REFACTORED for QMesh)
  const handleDragEnd = () => {
    if (!isDraggingRef.current || !editingObject || !editingObject.qMesh) return;

    const qMesh = editingObject.qMesh;

    // Capture current positions after transform
    const newPositions = new Map<string, THREE.Vector3>();

    // Store new positions for undo/redo
    initialPositionsRef.current.forEach((oldPos, vertexId) => {
      const vertex = qMesh.vertices.get(vertexId);
      if (vertex) {
        newPositions.set(vertexId, vertex.position.clone());
      }
    });

    // Create and execute undo/redo command
    const command = new MoveVerticesCommand(
      editingObject.id,
      Array.from(initialPositionsRef.current.keys()),
      initialPositionsRef.current,
      newPositions
    );
    executeCommand(command);

    console.log('[EditTransformControls] Created undo command for', initialPositionsRef.current.size, 'vertices');

    // CRITICAL: Update object geometry in store (recompiles QMesh to renderGeometry)
    updateObjectGeometry(editingObject.id, qMesh);

    isDraggingRef.current = false;
    initialPositionsRef.current.clear();
    initialTransformRef.current = null;

    // Update helper position to new selection center
    if (helperRef.current && hasSelection()) {
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