/**
 * Boolean Operations Store
 *
 * Manages state for CSG boolean operations.
 */

import { create } from 'zustand';

export type BooleanOperation = 'union' | 'subtract' | 'intersect';

interface BooleanOperationsStore {
  // State
  activeOperation: BooleanOperation | null;
  keepOriginals: boolean;

  // Actions
  setActiveOperation: (operation: BooleanOperation | null) => void;
  setKeepOriginals: (keep: boolean) => void;
  reset: () => void;
}

export const useBooleanOperationsStore = create<BooleanOperationsStore>((set) => ({
  activeOperation: null,
  keepOriginals: false, // Delete originals by default

  setActiveOperation: (operation) => {
    set({ activeOperation: operation });
  },

  setKeepOriginals: (keep) => {
    set({ keepOriginals: keep });
  },

  reset: () => {
    set({
      activeOperation: null,
      keepOriginals: false
    });
  }
}));
