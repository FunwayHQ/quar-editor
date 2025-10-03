/**
 * Keyboard Shortcuts Hook
 *
 * Handles global keyboard shortcuts for the editor.
 */

import { useEffect } from 'react';
import { useObjectsStore } from '../stores/objectsStore';
import { useCommandStore } from '../stores/commandStore';
import { useAnimationStore } from '../stores/animationStore';
import { DeleteObjectsCommand, DuplicateObjectsCommand } from '../lib/commands/ObjectCommands';
import { getAnimationEngine } from '../lib/animation/AnimationEngine';

export function useKeyboardShortcuts() {
  const { selectedIds, setTransformMode } = useObjectsStore();
  const { executeCommand, undo, redo } = useCommandStore();
  const { isPlaying, activeAnimationId, animations, currentTime, play, pause, stop, setCurrentTime } = useAnimationStore();

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
        if (selectedIds.length > 0) {
          e.preventDefault();
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
        useObjectsStore.getState().clearSelection();
      }

      // Animation: Play/Pause (Space)
      else if (e.key === ' ' || e.key === 'Spacebar') {
        const activeAnimation = activeAnimationId ? animations.get(activeAnimationId) : null;
        if (activeAnimation) {
          e.preventDefault();

          if (!isPlaying) {
            // Play
            play();
            const engine = getAnimationEngine();
            engine.start(
              activeAnimation,
              currentTime,
              (time) => setCurrentTime(time),
              () => stop()
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
  }, [selectedIds, executeCommand, undo, redo, setTransformMode, isPlaying, activeAnimationId, animations, currentTime]);
}
