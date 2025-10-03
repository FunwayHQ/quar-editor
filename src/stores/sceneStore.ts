/**
 * Scene Store
 *
 * Manages 3D scene state, objects, camera, and viewport settings.
 */

import { create } from 'zustand';
import * as THREE from 'three';

export type CameraType = 'perspective' | 'orthographic';
export type ShadingMode = 'wireframe' | 'solid' | 'material';
export type CameraPreset = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'isometric';

export interface ViewportStats {
  fps: number;
  vertices: number;
  triangles: number;
  memory: number;
}

export interface SceneState {
  // Camera
  cameraType: CameraType;
  setCameraType: (type: CameraType) => void;

  cameraPreset: CameraPreset | null;
  setCameraPreset: (preset: CameraPreset | null) => void;

  // Viewport
  shadingMode: ShadingMode;
  setShadingMode: (mode: ShadingMode) => void;

  showGrid: boolean;
  setShowGrid: (show: boolean) => void;

  showAxes: boolean;
  setShowAxes: (show: boolean) => void;

  showStats: boolean;
  setShowStats: (show: boolean) => void;

  // Grid settings
  gridSize: number;
  setGridSize: (size: number) => void;

  gridDivisions: number;
  setGridDivisions: (divisions: number) => void;

  // Performance stats
  stats: ViewportStats;
  updateStats: (stats: Partial<ViewportStats>) => void;

  // Selected objects (will be used in Sprint 3)
  selectedObjects: string[];
  setSelectedObjects: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  // Camera
  cameraType: 'perspective',
  setCameraType: (type) => set({ cameraType: type }),

  cameraPreset: null,
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  // Viewport
  shadingMode: 'solid',
  setShadingMode: (mode) => set({ shadingMode: mode }),

  showGrid: true,
  setShowGrid: (show) => set({ showGrid: show }),

  showAxes: true,
  setShowAxes: (show) => set({ showAxes: show }),

  showStats: true,
  setShowStats: (show) => set({ showStats: show }),

  // Grid settings
  gridSize: 10,
  setGridSize: (size) => set({ gridSize: size }),

  gridDivisions: 10,
  setGridDivisions: (divisions) => set({ gridDivisions: divisions }),

  // Stats
  stats: {
    fps: 60,
    vertices: 0,
    triangles: 0,
    memory: 0,
  },
  updateStats: (newStats) => set((state) => ({
    stats: { ...state.stats, ...newStats }
  })),

  // Selection (Sprint 3)
  selectedObjects: [],
  setSelectedObjects: (ids) => set({ selectedObjects: ids }),
  addToSelection: (id) => set((state) => ({
    selectedObjects: [...state.selectedObjects, id]
  })),
  removeFromSelection: (id) => set((state) => ({
    selectedObjects: state.selectedObjects.filter(objId => objId !== id)
  })),
  clearSelection: () => set({ selectedObjects: [] }),
}));
