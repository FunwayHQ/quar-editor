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
import { DeleteObjectsCommand, DuplicateObjectsCommand } from '../lib/commands/ObjectCommands';
import { getAnimationEngine } from '../lib/animation/AnimationEngine';

export function useKeyboardShortcuts() {
  const { selectedIds, setTransformMode } = useObjectsStore();
  const { executeCommand, undo, redo } = useCommandStore();
  const { isPlaying, isPaused, activeAnimationId, animations, currentTime, play, pause, stop, setCurrentTime, autoKeyframe, playbackSpeed } = useAnimationStore();
  const {
    isEditMode,
    selectionMode,
    enterEditMode,
    exitEditMode,
    setSelectionMode,
    selectedVertices,
    selectedEdges,
    selectedFaces,
    clearSelection: clearEditSelection,
  } = useEditModeStore();

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

      // Transform mode shortcuts
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setTransformMode('translate');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setTransformMode('rotate');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setTransformMode('scale');
      }

      // Delete shortcut
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        if (isEditMode) {
          // In edit mode, delete selected elements
          if (selectionMode === 'vertex' && selectedVertices.size > 0) {
            console.log('Delete vertices not yet implemented');
            // TODO: Implement vertex deletion
          } else if (selectionMode === 'edge' && selectedEdges.size > 0) {
            console.log('Delete edges not yet implemented');
            // TODO: Implement edge deletion
          } else if (selectionMode === 'face' && selectedFaces.size > 0) {
            console.log('Delete faces not yet implemented');
            // TODO: Implement face deletion
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
        if (isEditMode) {
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

      // Edit Mode: Selection mode shortcuts (1/2/3)
      else if (isEditMode && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        if (e.key === '1') setSelectionMode('vertex');
        else if (e.key === '2') setSelectionMode('edge');
        else if (e.key === '3') setSelectionMode('face');
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
