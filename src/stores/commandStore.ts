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
    // Force new state object to trigger re-render
    set((state) => ({ ...state }));
  },

  undo: () => {
    const { history } = get();
    history.undo();
    // Force new state object to trigger re-render
    set((state) => ({ ...state }));
  },

  redo: () => {
    const { history } = get();
    history.redo();
    // Force new state object to trigger re-render
    set((state) => ({ ...state }));
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
    // Force new state object to trigger re-render
    set((state) => ({ ...state }));
  },
}));
