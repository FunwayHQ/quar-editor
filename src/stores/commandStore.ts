/**
 * Command Store
 *
 * Manages command history for undo/redo functionality.
 */

import { create } from 'zustand';
import { Command, CommandHistory } from '../lib/commands/Command';

export interface CommandState {
  history: CommandHistory;

  // Execute a command and add to history
  executeCommand: (command: Command) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // History info
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;

  // Clear history
  clearHistory: () => void;
}

export const useCommandStore = create<CommandState>((set, get) => ({
  history: new CommandHistory(),

  executeCommand: (command) => {
    const { history } = get();
    history.execute(command);
    // Trigger re-render
    set({ history });
  },

  undo: () => {
    const { history } = get();
    history.undo();
    // Trigger re-render
    set({ history });
  },

  redo: () => {
    const { history } = get();
    history.redo();
    // Trigger re-render
    set({ history });
  },

  canUndo: () => {
    return get().history.canUndo();
  },

  canRedo: () => {
    return get().history.canRedo();
  },

  getUndoDescription: () => {
    return get().history.getUndoDescription();
  },

  getRedoDescription: () => {
    return get().history.getRedoDescription();
  },

  clearHistory: () => {
    const { history } = get();
    history.clear();
    // Trigger re-render
    set({ history });
  },
}));
