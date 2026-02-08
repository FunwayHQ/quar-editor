/**
 * Command Store
 *
 * Manages command history for undo/redo functionality.
 */

import { create } from 'zustand';
import { Command, CommandHistory } from '../lib/commands/Command';

export interface CommandState {
  history: CommandHistory;
  /** Incremented after each command execution to trigger re-renders */
  version: number;

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
  version: 0,

  executeCommand: (command) => {
    const { history } = get();
    history.execute(command);
    set((state) => ({ version: state.version + 1 }));
  },

  undo: () => {
    const { history } = get();
    history.undo();
    set((state) => ({ version: state.version + 1 }));
  },

  redo: () => {
    const { history } = get();
    history.redo();
    set((state) => ({ version: state.version + 1 }));
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
    set({ version: 0 });
  },
}));
