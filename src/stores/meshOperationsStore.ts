/**
 * Mesh Operations Store
 *
 * Manages state for 2D-to-3D mesh generation operations.
 */

import { create } from 'zustand';

export interface ExtrudeOptions {
  depth: number;
  bevelEnabled: boolean;
  bevelSize: number;
  bevelThickness: number;
  bevelSegments: number;
  bevelOffset: number;
  steps: number;
  curveSegments: number;
}

export interface RevolveOptions {
  axis: 'x' | 'y' | 'z';
  angle: number; // degrees (360 = full revolution)
  segments: number;
  offset: number; // distance from axis
  phiStart: number; // start angle in degrees
}

export interface LoftOptions {
  curveIds: string[];
  axis: 'x' | 'y' | 'z'; // Loft direction axis
  segments: number;
  closed: boolean; // Close into tube
  cap: boolean; // Cap ends
  smooth: boolean; // Smooth interpolation
}

export interface SweepOptions {
  pathId: string;
  segments: number;
  rotation: number; // Twist along path (degrees)
  scaleStart: number; // Scale at start
  scaleEnd: number; // Scale at end (taper)
  frames: 'frenet' | 'tangent'; // Frame calculation method
  closeProfile: boolean; // Auto-close open profiles
  capEnds: boolean; // Add end caps to path
}

interface MeshOperationsStore {
  // Active operation
  activeOperation: 'extrude' | 'revolve' | 'loft' | 'sweep' | null;

  // Operation options
  extrudeOptions: ExtrudeOptions;
  revolveOptions: RevolveOptions;
  loftOptions: LoftOptions;
  sweepOptions: SweepOptions;

  // Preview
  showPreview: boolean;

  // Actions
  setActiveOperation: (operation: 'extrude' | 'revolve' | 'loft' | 'sweep' | null) => void;
  updateExtrudeOptions: (options: Partial<ExtrudeOptions>) => void;
  updateRevolveOptions: (options: Partial<RevolveOptions>) => void;
  updateLoftOptions: (options: Partial<LoftOptions>) => void;
  updateSweepOptions: (options: Partial<SweepOptions>) => void;
  setShowPreview: (show: boolean) => void;
  resetOptions: () => void;
}

const defaultExtrudeOptions: ExtrudeOptions = {
  depth: 1.0,
  bevelEnabled: false,
  bevelSize: 0.1,
  bevelThickness: 0.1,
  bevelSegments: 3,
  bevelOffset: 0,
  steps: 1,
  curveSegments: 12
};

const defaultRevolveOptions: RevolveOptions = {
  axis: 'y',
  angle: 360,
  segments: 32,
  offset: 0,
  phiStart: 0
};

const defaultLoftOptions: LoftOptions = {
  curveIds: [],
  axis: 'y',
  segments: 20,
  closed: false,
  cap: true,
  smooth: true
};

const defaultSweepOptions: SweepOptions = {
  pathId: '',
  segments: 50,
  rotation: 0,
  scaleStart: 1.0,
  scaleEnd: 1.0,
  frames: 'frenet',
  closeProfile: true,
  capEnds: true
};

export const useMeshOperationsStore = create<MeshOperationsStore>((set) => ({
  activeOperation: null,
  extrudeOptions: defaultExtrudeOptions,
  revolveOptions: defaultRevolveOptions,
  loftOptions: defaultLoftOptions,
  sweepOptions: defaultSweepOptions,
  showPreview: true,

  setActiveOperation: (operation) => {
    set({ activeOperation: operation });
  },

  updateExtrudeOptions: (options) => {
    set((state) => ({
      extrudeOptions: { ...state.extrudeOptions, ...options }
    }));
  },

  updateRevolveOptions: (options) => {
    set((state) => ({
      revolveOptions: { ...state.revolveOptions, ...options }
    }));
  },

  updateLoftOptions: (options) => {
    set((state) => ({
      loftOptions: { ...state.loftOptions, ...options }
    }));
  },

  updateSweepOptions: (options) => {
    set((state) => ({
      sweepOptions: { ...state.sweepOptions, ...options }
    }));
  },

  setShowPreview: (show) => {
    set({ showPreview: show });
  },

  resetOptions: () => {
    set({
      activeOperation: null,
      extrudeOptions: defaultExtrudeOptions,
      revolveOptions: defaultRevolveOptions,
      loftOptions: defaultLoftOptions,
      sweepOptions: defaultSweepOptions,
      showPreview: true
    });
  }
}));
