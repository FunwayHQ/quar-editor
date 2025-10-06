/**
 * Keyboard Shortcuts Hook
 *
 * Handles global keyboard shortcuts for the editor.
 */

import { useEffect } from 'react';
import { useObjectsStore } from '../stores/objectsStore';
import { useCommandStore } from '../stores/commandStore';
import { useAnimationStore } from '../stores/animationStore';
import { useEditModeStore } from '../stores/editModeStore';
import { useKnifeToolStore } from '../stores/knifeToolStore';
import { useSceneStore } from '../stores/sceneStore';
import { useModalModeStore } from '../stores/modalModeStore';
import { DeleteObjectsCommand, DuplicateObjectsCommand } from '../lib/commands/ObjectCommands';
import { GroupObjectsCommand, UngroupObjectsCommand } from '../lib/commands/GroupCommands';
import { getAnimationEngine } from '../lib/animation/AnimationEngine';
import { DeleteVerticesCommand } from '../lib/commands/EditModeCommands';
import { meshRegistry } from '../lib/mesh/MeshRegistry';
import * as THREE from 'three';

export function useKeyboardShortcuts(setShowAddMenu?: (show: boolean) => void) {
  const { selectedIds, setTransformMode } = useObjectsStore();
  const { executeCommand, undo, redo } = useCommandStore();
  const { isPlaying, isPaused, activeAnimationId, animations, currentTime, play, pause, stop, setCurrentTime, autoKeyframe, playbackSpeed } = useAnimationStore();
  const {
    isEditMode,
    editingObjectId,
    selectionMode,
    enterEditMode,
    exitEditMode,
    setSelectionMode,
    selectedVertices,
    selectedEdges,
    selectedFaces,
    clearSelection: clearEditSelection,
  } = useEditModeStore();

  // Helper: Delete selected vertices
  const handleDeleteVertices = (objectId: string, vertices: Set<number>) => {
    const mesh = meshRegistry.getMesh(objectId);
    if (!mesh || !mesh.geometry) return;

    const oldGeometry = mesh.geometry.clone();

    // Create new geometry without selected vertices
    const positions = mesh.geometry.attributes.position;
    const indices = mesh.geometry.index;

    if (!indices) {
      console.warn('[Delete] Geometry must be indexed');
      return;
    }

    // Build new vertex list (excluding selected)
    const vertexArray = Array.from(vertices);
    const newPositions: number[] = [];
    const newIndices: number[] = [];
    const vertexMap = new Map<number, number>(); // old index -> new index
    let newIndex = 0;

    // Copy non-deleted vertices
    for (let i = 0; i < positions.count; i++) {
      if (!vertexArray.includes(i)) {
        newPositions.push(positions.getX(i), positions.getY(i), positions.getZ(i));
        vertexMap.set(i, newIndex);
        newIndex++;
      }
    }

    // Rebuild indices (skip faces with deleted vertices)
    for (let i = 0; i < indices.count; i += 3) {
      const i0 = indices.array[i];
      const i1 = indices.array[i + 1];
      const i2 = indices.array[i + 2];

      // Skip if any vertex is deleted
      if (vertexArray.includes(i0) || vertexArray.includes(i1) || vertexArray.includes(i2)) {
        continue;
      }

      // Remap indices
      const newI0 = vertexMap.get(i0);
      const newI1 = vertexMap.get(i1);
      const newI2 = vertexMap.get(i2);

      if (newI0 !== undefined && newI1 !== undefined && newI2 !== undefined) {
        newIndices.push(newI0, newI1, newI2);
      }
    }

    // Create new geometry
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    newGeometry.setIndex(newIndices);
    newGeometry.computeVertexNormals();

    // Apply to mesh
    mesh.geometry.dispose();
    mesh.geometry = newGeometry;

    // Create undo command
    const command = new DeleteVerticesCommand(objectId, oldGeometry, newGeometry);
    executeCommand(command);

    // Clear selection
    clearEditSelection();

    console.log('[Delete] Deleted', vertices.size, 'vertices');
  };

  // Helper: Delete selected faces
  const handleDeleteFaces = (objectId: string, faces: Set<number>) => {
    const mesh = meshRegistry.getMesh(objectId);
    if (!mesh || !mesh.geometry) return;

    const oldGeometry = mesh.geometry.clone();
    const indices = mesh.geometry.index;

    if (!indices) {
      console.warn('[Delete] Geometry must be indexed');
      return;
    }

    // Build new index list (excluding selected faces)
    const faceArray = Array.from(faces);
    const newIndices: number[] = [];

    for (let i = 0; i < indices.count / 3; i++) {
      if (!faceArray.includes(i)) {
        // Keep this face
        newIndices.push(
          indices.array[i * 3],
          indices.array[i * 3 + 1],
          indices.array[i * 3 + 2]
        );
      }
    }

    // Create new geometry
    const newGeometry = mesh.geometry.clone();
    newGeometry.setIndex(newIndices);
    newGeometry.computeVertexNormals();

    // Apply to mesh
    mesh.geometry.dispose();
    mesh.geometry = newGeometry;

    // Create undo command
    const command = new DeleteVerticesCommand(objectId, oldGeometry, newGeometry);
    executeCommand(command);

    // Clear selection
    clearEditSelection();

    console.log('[Delete] Deleted', faces.size, 'faces');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Sprint Y: Blender-standard transform shortcuts
      // G = Grab (Move), R = Rotate, S = Scale
      if ((e.key === 'g' || e.key === 'G') && !cmdOrCtrl && !isEditMode) {
        e.preventDefault();
        setTransformMode('translate');
        useModalModeStore.getState().enterGrabMode();
      } else if ((e.key === 'r' || e.key === 'R') && !cmdOrCtrl && !isEditMode) {
        e.preventDefault();
        setTransformMode('rotate');
        useModalModeStore.getState().enterRotateMode();
      } else if ((e.key === 's' || e.key === 'S') && !cmdOrCtrl && !isEditMode) {
        e.preventDefault();
        setTransformMode('scale');
        useModalModeStore.getState().enterScaleMode();
      }

      // Sprint Y: X = Delete (Blender standard), also keep Delete/Backspace
      else if (e.key === 'x' || e.key === 'X' || e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        if (isEditMode && editingObjectId) {
          // In edit mode, delete selected elements
          if (selectionMode === 'vertex' && selectedVertices.size > 0) {
            handleDeleteVertices(editingObjectId, selectedVertices);
          } else if (selectionMode === 'edge' && selectedEdges.size > 0) {
            console.log('Delete edges not yet implemented - will delete edge vertices');
            // TODO: Implement edge deletion (remove edge and affected faces)
          } else if (selectionMode === 'face' && selectedFaces.size > 0) {
            handleDeleteFaces(editingObjectId, selectedFaces);
          }
        } else if (selectedIds.length > 0) {
          // Normal mode, delete objects
          const command = new DeleteObjectsCommand(selectedIds);
          executeCommand(command);
        }
      }

      // Duplicate shortcut (Ctrl+D / Cmd+D)
      else if (cmdOrCtrl && e.key === 'd') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const command = new DuplicateObjectsCommand(selectedIds);
          executeCommand(command);
        }
      }

      // Group shortcut (Ctrl+G / Cmd+G)
      else if (cmdOrCtrl && !e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        if (selectedIds.length >= 2) {
          e.preventDefault();
          const command = new GroupObjectsCommand(selectedIds);
          executeCommand(command);
          // Clear selection after grouping
          useObjectsStore.getState().clearSelection();
        }
      }

      // Ungroup shortcut (Ctrl+Shift+G / Cmd+Shift+G)
      else if (cmdOrCtrl && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        if (selectedIds.length === 1) {
          e.preventDefault();
          const selectedObject = useObjectsStore.getState().objects.get(selectedIds[0]);
          if (selectedObject && selectedObject.type === 'group') {
            const command = new UngroupObjectsCommand(selectedIds[0]);
            executeCommand(command);
            // Clear selection after ungrouping
            useObjectsStore.getState().clearSelection();
          }
        }
      }

      // Undo shortcut (Ctrl+Z / Cmd+Z)
      else if (cmdOrCtrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }

      // Redo shortcut (Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y)
      else if ((cmdOrCtrl && e.shiftKey && e.key === 'z') || (cmdOrCtrl && e.key === 'y')) {
        e.preventDefault();
        redo();
      }

      // Select All shortcut (Ctrl+A / Cmd+A)
      else if (cmdOrCtrl && e.key === 'a') {
        e.preventDefault();
        const allObjects = useObjectsStore.getState().getAllObjects();
        useObjectsStore.getState().setSelectedIds(allObjects.map(obj => obj.id));
      }

      // Deselect All (Escape)
      else if (e.key === 'Escape') {
        const { isActive: isKnifeActive, cancelCut } = useKnifeToolStore.getState();

        if (isKnifeActive) {
          // Cancel knife tool path
          cancelCut();
        } else if (isEditMode) {
          // Clear edit mode selections
          clearEditSelection();
        } else {
          // Clear object selections
          useObjectsStore.getState().clearSelection();
        }
      }

      // Edit Mode: Tab key (enter/exit)
      else if (e.key === 'Tab') {
        e.preventDefault();
        if (isEditMode) {
          exitEditMode();
        } else if (selectedIds.length === 1) {
          // Enter edit mode for selected object
          enterEditMode(selectedIds[0]);
        }
      }

      // Knife Tool: K key (toggle knife tool in edit mode)
      else if (isEditMode && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const { isActive: isKnifeActive, activateTool, deactivateTool } = useKnifeToolStore.getState();

        if (isKnifeActive) {
          deactivateTool();
        } else {
          activateTool();
        }
      }

      // Sprint Y: I key = Inset (Insert Face) in Edit Mode
      else if (isEditMode && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        // Trigger inset - will be handled by EditOperationsPanel
        console.log('[Shortcuts] I key pressed - Inset operation');
        // Note: Actual operation handled by panel UI, this just logs for now
      }

      // Edit Mode: Selection mode shortcuts (1/2/3)
      else if (isEditMode && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        if (e.key === '1') setSelectionMode('vertex');
        else if (e.key === '2') setSelectionMode('edge');
        else if (e.key === '3') setSelectionMode('face');
      }

      // Sprint Y: Edit Mode transform shortcuts (G/R/S)
      else if (isEditMode && (e.key === 'g' || e.key === 'G') && !cmdOrCtrl) {
        e.preventDefault();
        setTransformMode('translate');
      }
      else if (isEditMode && (e.key === 'r' || e.key === 'R') && !cmdOrCtrl) {
        e.preventDefault();
        setTransformMode('rotate');
      }
      else if (isEditMode && (e.key === 's' || e.key === 'S') && !cmdOrCtrl) {
        e.preventDefault();
        setTransformMode('scale');
      }

      // Shading Modes (when not in edit mode): Z/X/C
      else if (!isEditMode && e.key === 'z') {
        e.preventDefault();
        useSceneStore.getState().setShadingMode('wireframe');
      }
      else if (!isEditMode && e.key === 'x') {
        e.preventDefault();
        useSceneStore.getState().setShadingMode('solid');
      }
      else if (!isEditMode && e.key === 'c') {
        e.preventDefault();
        useSceneStore.getState().setShadingMode('material');
      }

      // Sprint Y: G key will be used for Grab (Move) in Day 2
      // Grid toggle moved to menu only (no keyboard shortcut)

      // Sprint Y: Shift+A = Add Menu (Blender standard)
      else if (e.shiftKey && e.key === 'A' && !isEditMode && setShowAddMenu) {
        e.preventDefault();
        setShowAddMenu(true);
      }

      // Object Creation: Shift + Number (use e.code for reliability)
      else if (e.shiftKey && !isEditMode) {
        const objectsStore = useObjectsStore.getState();

        if (e.code === 'Digit1') {
          e.preventDefault();
          const box = objectsStore.createPrimitive('box');
          objectsStore.addObject(box);
        } else if (e.code === 'Digit2') {
          e.preventDefault();
          const sphere = objectsStore.createPrimitive('sphere');
          objectsStore.addObject(sphere);
        } else if (e.code === 'Digit3') {
          e.preventDefault();
          const cylinder = objectsStore.createPrimitive('cylinder');
          objectsStore.addObject(cylinder);
        } else if (e.code === 'Digit4') {
          e.preventDefault();
          const cone = objectsStore.createPrimitive('cone');
          objectsStore.addObject(cone);
        } else if (e.code === 'Digit5') {
          e.preventDefault();
          const torus = objectsStore.createPrimitive('torus');
          objectsStore.addObject(torus);
        } else if (e.code === 'Digit6') {
          e.preventDefault();
          const plane = objectsStore.createPrimitive('plane');
          objectsStore.addObject(plane);
        } else if (e.code === 'Digit7') {
          e.preventDefault();
          const light = objectsStore.createPrimitive('pointLight');
          objectsStore.addObject(light);
          console.log('[Shortcuts] Created point light');
        } else if (e.code === 'Digit8') {
          e.preventDefault();
          const light = objectsStore.createPrimitive('spotLight');
          objectsStore.addObject(light);
          console.log('[Shortcuts] Created spot light');
        } else if (e.code === 'Digit9') {
          e.preventDefault();
          const light = objectsStore.createPrimitive('directionalLight');
          objectsStore.addObject(light);
          console.log('[Shortcuts] Created directional light');
        } else if (e.code === 'Digit0') {
          e.preventDefault();
          const light = objectsStore.createPrimitive('ambientLight');
          objectsStore.addObject(light);
          console.log('[Shortcuts] Created ambient light');
        }
      }

      // Animation: Play/Pause (Space)
      else if (e.key === ' ' || e.key === 'Spacebar') {
        const activeAnimation = activeAnimationId ? animations.get(activeAnimationId) : null;
        if (activeAnimation) {
          e.preventDefault();

          if (!isPlaying) {
            // Show warning if recording mode is on (only when starting fresh, not resuming)
            if (autoKeyframe && !isPaused) {
              // Create and dispatch a custom event to show warning from PlaybackControls
              const event = new CustomEvent('showRecordingWarning');
              window.dispatchEvent(event);
              return;
            }

            // Play
            play();
            const engine = getAnimationEngine();
            engine.start(
              activeAnimation,
              currentTime,
              (time) => setCurrentTime(time),
              () => stop(),
              playbackSpeed
            );
          } else {
            // Pause
            pause();
            getAnimationEngine().stop();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIds, executeCommand, undo, redo, setTransformMode, isPlaying, isPaused, activeAnimationId, animations, currentTime, isEditMode, selectionMode, enterEditMode, exitEditMode, setSelectionMode, autoKeyframe, playbackSpeed]);
}
