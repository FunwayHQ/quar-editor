/**
 * Curve Store
 *
 * Manages 2D curves imported from SVG files.
 * Curves are displayed on grid and used for 2D-to-3D operations.
 */

import { create } from 'zustand';
import * as THREE from 'three';

export interface Curve {
  id: string;
  name: string;
  type: 'svg' | 'bezier' | 'nurbs';
  points: THREE.Vector2[];
  closed: boolean;
  svgPath?: string; // Original SVG path data
  transform: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector2;
  };
  createdAt: number;
  modifiedAt: number;
}

interface CurveStore {
  curves: Map<string, Curve>;
  selectedCurveIds: string[];

  // Management
  addCurve: (curve: Curve) => void;
  removeCurve: (id: string) => void;
  updateCurve: (id: string, updates: Partial<Curve>) => void;
  getCurve: (id: string) => Curve | undefined;

  // Selection
  selectCurve: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  toggleCurveSelection: (id: string, multiSelect?: boolean) => void;

  // Utilities
  generateName: (type: string) => string;
  clear: () => void;
}

export const useCurveStore = create<CurveStore>((set, get) => ({
  curves: new Map(),
  selectedCurveIds: [],

  addCurve: (curve) => {
    set((state) => {
      const newCurves = new Map(state.curves);
      newCurves.set(curve.id, curve);
      return { curves: newCurves };
    });
  },

  removeCurve: (id) => {
    set((state) => {
      const newCurves = new Map(state.curves);
      newCurves.delete(id);

      // Remove from selection if selected
      const newSelectedIds = state.selectedCurveIds.filter(cid => cid !== id);

      return {
        curves: newCurves,
        selectedCurveIds: newSelectedIds
      };
    });
  },

  updateCurve: (id, updates) => {
    set((state) => {
      const curve = state.curves.get(id);
      if (!curve) return state;

      const newCurves = new Map(state.curves);
      newCurves.set(id, {
        ...curve,
        ...updates,
        modifiedAt: Date.now()
      });

      return { curves: newCurves };
    });
  },

  getCurve: (id) => {
    return get().curves.get(id);
  },

  selectCurve: (id, multiSelect = false) => {
    set((state) => {
      if (!state.curves.has(id)) {
        console.warn('[curveStore] Curve not found:', id);
        return state;
      }

      if (multiSelect) {
        // Add to selection
        if (state.selectedCurveIds.includes(id)) {
          console.log('[curveStore] Curve already selected:', id);
          return state;
        }
        console.log('[curveStore] Adding to selection:', id, 'Current:', state.selectedCurveIds);
        return {
          selectedCurveIds: [...state.selectedCurveIds, id]
        };
      } else {
        // Replace selection
        console.log('[curveStore] Replacing selection with:', id);
        return {
          selectedCurveIds: [id]
        };
      }
    });
  },

  clearSelection: () => {
    set({ selectedCurveIds: [] });
  },

  toggleCurveSelection: (id, multiSelect = false) => {
    set((state) => {
      if (!state.curves.has(id)) return state;

      if (multiSelect) {
        // Toggle in multi-select
        if (state.selectedCurveIds.includes(id)) {
          return {
            selectedCurveIds: state.selectedCurveIds.filter(cid => cid !== id)
          };
        } else {
          return {
            selectedCurveIds: [...state.selectedCurveIds, id]
          };
        }
      } else {
        // Single select toggle
        if (state.selectedCurveIds.length === 1 && state.selectedCurveIds[0] === id) {
          return { selectedCurveIds: [] };
        } else {
          return { selectedCurveIds: [id] };
        }
      }
    });
  },

  generateName: (type: string) => {
    const curves = Array.from(get().curves.values());
    const sameName = curves.filter(c => c.name.startsWith(type));
    return `${type}_${sameName.length + 1}`;
  },

  clear: () => {
    set({
      curves: new Map(),
      selectedCurveIds: []
    });
  }
}));
