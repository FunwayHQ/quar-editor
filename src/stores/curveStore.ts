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

  // Serialization
  serialize: () => any;
  deserialize: (data: any) => void;
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
  },

  // Serialization
  serialize: () => {
    const state = get();
    return Array.from(state.curves.values()).map(curve => ({
      ...curve,
      // Convert Vector2/Vector3/Euler to serializable format
      points: curve.points.map(p => ({ x: p.x, y: p.y })),
      transform: {
        position: {
          x: curve.transform.position.x,
          y: curve.transform.position.y,
          z: curve.transform.position.z
        },
        rotation: {
          x: curve.transform.rotation.x,
          y: curve.transform.rotation.y,
          z: curve.transform.rotation.z
        },
        scale: {
          x: curve.transform.scale.x,
          y: curve.transform.scale.y
        }
      }
    }));
  },

  deserialize: (data: any) => {
    if (!data || !Array.isArray(data)) {
      console.warn('[curveStore] Invalid data for deserialization');
      return;
    }

    console.log(`[curveStore] Loading ${data.length} curves from saved data`);

    set((state) => {
      const newCurves = new Map<string, Curve>();

      data.forEach((curveData: any) => {
        const curve: Curve = {
          ...curveData,
          // Convert back to Vector2/Vector3/Euler
          points: curveData.points.map((p: any) => new THREE.Vector2(p.x, p.y)),
          transform: {
            position: new THREE.Vector3(
              curveData.transform.position.x,
              curveData.transform.position.y,
              curveData.transform.position.z
            ),
            rotation: new THREE.Euler(
              curveData.transform.rotation.x,
              curveData.transform.rotation.y,
              curveData.transform.rotation.z
            ),
            scale: new THREE.Vector2(
              curveData.transform.scale.x,
              curveData.transform.scale.y
            )
          }
        };
        newCurves.set(curve.id, curve);
      });

      return { curves: newCurves };
    });
  }
}));
