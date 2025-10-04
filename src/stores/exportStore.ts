/**
 * Export Store
 *
 * Manages export state and settings.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { create } from 'zustand';

export type ExportFormat = 'glb' | 'gltf' | 'obj' | 'usdz';

export interface ExportOptions {
  format: ExportFormat;
  includeAnimations: boolean;
  includeMaterials: boolean;
  includeMorphTargets: boolean;
  embedTextures: boolean;
  exportSelectionOnly: boolean;
  binary: boolean; // GLB vs GLTF
  useDracoCompression: boolean; // Draco mesh compression
  dracoCompressionLevel: number; // 0-10, higher = smaller but slower
}

export interface ExportProgress {
  isExporting: boolean;
  progress: number; // 0-100
  currentStep: string;
  error: string | null;
}

interface ExportStore {
  // Export options
  options: ExportOptions;

  // Progress tracking
  progress: ExportProgress;

  // Actions
  setFormat: (format: ExportFormat) => void;
  setOption: (key: keyof ExportOptions, value: boolean) => void;
  setOptions: (options: Partial<ExportOptions>) => void;

  // Progress tracking
  startExport: () => void;
  updateProgress: (progress: number, step: string) => void;
  completeExport: () => void;
  failExport: (error: string) => void;
  resetProgress: () => void;
}

const defaultOptions: ExportOptions = {
  format: 'glb',
  includeAnimations: true,
  includeMaterials: true,
  includeMorphTargets: true,
  embedTextures: true,
  exportSelectionOnly: false,
  binary: true, // GLB by default
  useDracoCompression: false, // Off by default (requires Draco decoder on client)
  dracoCompressionLevel: 7, // Good balance of size vs speed
};

export const useExportStore = create<ExportStore>((set) => ({
  options: defaultOptions,

  progress: {
    isExporting: false,
    progress: 0,
    currentStep: '',
    error: null,
  },

  setFormat: (format) => set((state) => ({
    options: {
      ...state.options,
      format,
      // Auto-adjust binary option based on format
      binary: format === 'glb',
    },
  })),

  setOption: (key, value) => set((state) => ({
    options: {
      ...state.options,
      [key]: value,
    },
  })),

  setOptions: (options) => set((state) => ({
    options: {
      ...state.options,
      ...options,
    },
  })),

  startExport: () => set({
    progress: {
      isExporting: true,
      progress: 0,
      currentStep: 'Initializing export...',
      error: null,
    },
  }),

  updateProgress: (progress, currentStep) => set((state) => ({
    progress: {
      ...state.progress,
      progress,
      currentStep,
    },
  })),

  completeExport: () => set({
    progress: {
      isExporting: false,
      progress: 100,
      currentStep: 'Export complete!',
      error: null,
    },
  }),

  failExport: (error) => set({
    progress: {
      isExporting: false,
      progress: 0,
      currentStep: '',
      error,
    },
  }),

  resetProgress: () => set({
    progress: {
      isExporting: false,
      progress: 0,
      currentStep: '',
      error: null,
    },
  }),
}));
