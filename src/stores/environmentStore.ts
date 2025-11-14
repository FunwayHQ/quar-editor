/**
 * Environment Store
 *
 * Manages environment settings (background, fog, ground plane).
 * Sprint 5: Lighting & Environment
 */

import { create } from 'zustand';

export interface EnvironmentState {
  // Background
  backgroundColor: string;

  // HDRI / IBL
  hdriEnabled: boolean;
  hdriPreset: string | null;           // Preset name from drei (e.g., 'sunset', 'warehouse')
  hdriFile: string | null;             // Custom HDRI file URL or base64
  hdriIntensity: number;               // Environment map intensity (IBL strength)
  hdriAsBackground: boolean;           // Use HDRI as background (skybox)
  backgroundBlur: number;              // Background blur amount (0-1)

  // Fog
  fogEnabled: boolean;
  fogType: 'linear' | 'exponential';
  fogColor: string;
  fogNear: number;      // Linear fog start distance
  fogFar: number;       // Linear fog end distance
  fogDensity: number;   // Exponential fog density

  // Ground plane
  groundPlaneEnabled: boolean;
  groundPlaneSize: number;
  groundPlaneColor: string;
  groundPlaneReceiveShadow: boolean;

  // Actions
  setBackgroundColor: (color: string) => void;
  setHdriEnabled: (enabled: boolean) => void;
  setHdriPreset: (preset: string | null) => void;
  setHdriFile: (file: string | null) => void;
  setHdriIntensity: (intensity: number) => void;
  setHdriAsBackground: (asBackground: boolean) => void;
  setBackgroundBlur: (blur: number) => void;
  setFogEnabled: (enabled: boolean) => void;
  setFogType: (type: 'linear' | 'exponential') => void;
  setFogColor: (color: string) => void;
  setFogNear: (near: number) => void;
  setFogFar: (far: number) => void;
  setFogDensity: (density: number) => void;
  setGroundPlaneEnabled: (enabled: boolean) => void;
  setGroundPlaneSize: (size: number) => void;
  setGroundPlaneColor: (color: string) => void;
  setGroundPlaneReceiveShadow: (receiveShadow: boolean) => void;

  // Serialization
  serialize: () => any;
  deserialize: (data: any) => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  // Initial values
  backgroundColor: '#0A0A0B',

  hdriEnabled: false,
  hdriPreset: null,
  hdriFile: null,
  hdriIntensity: 1,
  hdriAsBackground: true,
  backgroundBlur: 0,

  fogEnabled: false,
  fogType: 'linear',
  fogColor: '#0A0A0B',
  fogNear: 10,
  fogFar: 50,
  fogDensity: 0.05,

  groundPlaneEnabled: false,
  groundPlaneSize: 20,
  groundPlaneColor: '#27272A',
  groundPlaneReceiveShadow: true,

  // Actions
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setHdriEnabled: (enabled) => set({ hdriEnabled: enabled }),
  setHdriPreset: (preset) => set({ hdriPreset: preset, hdriFile: null }),
  setHdriFile: (file) => set({ hdriFile: file, hdriPreset: null }),
  setHdriIntensity: (intensity) => set({ hdriIntensity: intensity }),
  setHdriAsBackground: (asBackground) => set({ hdriAsBackground: asBackground }),
  setBackgroundBlur: (blur) => set({ backgroundBlur: blur }),
  setFogEnabled: (enabled) => set({ fogEnabled: enabled }),
  setFogType: (type) => set({ fogType: type }),
  setFogColor: (color) => set({ fogColor: color }),
  setFogNear: (near) => set({ fogNear: near }),
  setFogFar: (far) => set({ fogFar: far }),
  setFogDensity: (density) => set({ fogDensity: density }),
  setGroundPlaneEnabled: (enabled) => set({ groundPlaneEnabled: enabled }),
  setGroundPlaneSize: (size) => set({ groundPlaneSize: size }),
  setGroundPlaneColor: (color) => set({ groundPlaneColor: color }),
  setGroundPlaneReceiveShadow: (receiveShadow) => set({ groundPlaneReceiveShadow: receiveShadow }),

  // Serialization
  serialize: () => {
    const state = get();
    return {
      backgroundColor: state.backgroundColor,
      hdriEnabled: state.hdriEnabled,
      hdriPreset: state.hdriPreset,
      hdriIntensity: state.hdriIntensity,
      hdriAsBackground: state.hdriAsBackground,
      backgroundBlur: state.backgroundBlur,
      fogEnabled: state.fogEnabled,
      fogType: state.fogType,
      fogColor: state.fogColor,
      fogNear: state.fogNear,
      fogFar: state.fogFar,
      fogDensity: state.fogDensity,
      groundPlaneEnabled: state.groundPlaneEnabled,
      groundPlaneSize: state.groundPlaneSize,
      groundPlaneColor: state.groundPlaneColor,
      groundPlaneReceiveShadow: state.groundPlaneReceiveShadow,
    };
  },

  deserialize: (data: any) => {
    if (!data) {
      console.warn('[environmentStore] Invalid data for deserialization');
      return;
    }

    set(() => data);
  },
}));
