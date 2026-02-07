/**
 * Knife Tool Store
 *
 * State management for the knife cutting tool.
 * Mini-Sprint: Knife Tool Implementation
 */

import { create } from 'zustand';
import * as THREE from 'three';

export interface IntersectionPoint {
  point: THREE.Vector3;
  faceIndex: number;
  edgeIndex?: [number, number];
  vertexIndex?: number;
  uv: THREE.Vector2;
}

export type KnifeCutMode = 'triangle' | 'quad';

export interface KnifeToolState {
  // Tool state
  isActive: boolean;
  isDrawing: boolean;

  // Sprint Y: Cut mode toggle
  cutMode: KnifeCutMode;
  setCutMode: (mode: KnifeCutMode) => void;

  // Path data
  drawingPath: THREE.Vector3[];
  intersectionPoints: IntersectionPoint[];
  targetFaceIndex: number | null; // The face we're cutting

  // Actions
  activateTool: () => void;
  deactivateTool: () => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  addPathPoint: (point: THREE.Vector3, faceIndex?: number) => void;
  setIntersectionPoints: (points: IntersectionPoint[]) => void;
  clearPath: () => void;
  confirmCut: () => void;
  cancelCut: () => void;
}

export const useKnifeToolStore = create<KnifeToolState>((set, get) => ({
  // Initial state
  isActive: false,
  isDrawing: false,
  cutMode: 'quad', // Sprint Y: Default to quad mode for intuitive UX
  drawingPath: [],
  intersectionPoints: [],
  targetFaceIndex: null,

  // Sprint Y: Set cut mode
  setCutMode: (mode) => set({ cutMode: mode }),

  // Activate the knife tool
  // NOTE: We DON'T clear selection - user should select face FIRST, then press K
  activateTool: () => {
    console.log('[KnifeTool] Tool activated - selection preserved');
    set({
      isActive: true,
      isDrawing: false,
      drawingPath: [],
      intersectionPoints: [],
      // targetFaceIndex: null, // REMOVED - keep the current target face!
    });
  },

  // Deactivate the knife tool
  deactivateTool: () => {
    console.log('[KnifeTool] Tool deactivated');
    set({
      isActive: false,
      isDrawing: false,
      drawingPath: [],
      intersectionPoints: [],
    });
  },

  // Start drawing a path
  startDrawing: () => {
    set({ isDrawing: true });
  },

  // Stop drawing (ready to confirm/cancel)
  stopDrawing: () => {
    set({ isDrawing: false });
  },

  // Add a point to the cutting path
  addPathPoint: (point, faceIndex) => {
    const { drawingPath, targetFaceIndex } = get();
    console.log('[KnifeTool] Added path point:', point.toArray(), 'on face:', faceIndex);

    // If this is the first point, store the target face
    const newTargetFace = drawingPath.length === 0 && faceIndex !== undefined ? faceIndex : targetFaceIndex;

    set({
      drawingPath: [...drawingPath, point.clone()],
      targetFaceIndex: newTargetFace,
    });
  },

  // Set intersection points found on mesh
  setIntersectionPoints: (points) => {
    console.log(`[KnifeTool] Set ${points.length} intersection points`);
    set({ intersectionPoints: points });
  },

  // Clear the current path
  clearPath: () => {
    console.log('[KnifeTool] Path cleared');
    set({
      drawingPath: [],
      intersectionPoints: [],
      targetFaceIndex: null,
      isDrawing: false,
    });
  },

  // Confirm the cut (will trigger geometry update)
  confirmCut: () => {
    const { drawingPath, intersectionPoints } = get();

    if (drawingPath.length < 2) {
      console.warn('[KnifeTool] Need at least 2 points to cut');
      return;
    }

    console.log('[KnifeTool] Cut confirmed, applying...');
    // The actual cutting will be handled by the UI component
    // which has access to the mesh and can execute commands
  },

  // Cancel the current cut
  cancelCut: () => {
    console.log('[KnifeTool] Cut cancelled');
    set({
      drawingPath: [],
      intersectionPoints: [],
      targetFaceIndex: null,
      isDrawing: false,
    });
  },
}));
