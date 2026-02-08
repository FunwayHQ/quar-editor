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

  // Grid settings (Sprint Y: Professional grid system)
  gridSize: number;           // Total size in meters (e.g., 20 = 20x20 meters)
  setGridSize: (size: number) => void;

  gridDivisions: number;      // Number of divisions (e.g., 20 = 20 squares)
  setGridDivisions: (divisions: number) => void;

  gridUnitSize: number;       // Size of one grid square in meters (default: 1.0)
  setGridUnitSize: (size: number) => void;

  gridColor: string;          // Grid line color
  setGridColor: (color: string) => void;

  gridOpacity: number;        // Grid plane opacity (0.0 - 1.0)
  setGridOpacity: (opacity: number) => void;

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

  // Grid settings (Sprint Y: Professional grid with units)
  gridSize: 20,                      // 20 meters total
  setGridSize: (size) => set({ gridSize: size }),

  gridDivisions: 20,                 // 20 divisions
  setGridDivisions: (divisions) => set({ gridDivisions: divisions }),

  gridUnitSize: 1.0,                 // 1 meter per square
  setGridUnitSize: (size) => set({ gridUnitSize: size }),

  gridColor: '#7C3AED',              // Purple accent
  setGridColor: (color) => set({ gridColor: color }),

  gridOpacity: 0,                    // 0% opacity for plane (invisible fill)
  setGridOpacity: (opacity) => set({ gridOpacity: opacity }),

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
