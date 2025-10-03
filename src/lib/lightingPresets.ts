/**
 * Lighting Presets
 *
 * Common lighting setups for quick scene configuration.
 * Sprint 5: Lighting & Environment
 */

import { SceneObject, ObjectType } from '../stores/objectsStore';
import { v4 as uuidv4 } from 'uuid';

export interface LightingPreset {
  id: string;
  name: string;
  description: string;
  lights: Omit<SceneObject, 'id' | 'createdAt' | 'modifiedAt'>[];
  environment?: {
    backgroundColor?: string;
    hdriEnabled?: boolean;
    hdriPreset?: string;
    hdriIntensity?: number;
    hdriAsBackground?: boolean;
    backgroundBlur?: number;
    fogEnabled?: boolean;
    fogType?: 'linear' | 'exponential';
    fogColor?: string;
    groundPlaneEnabled?: boolean;
  };
}

export const lightingPresets: LightingPreset[] = [
  {
    id: 'studio',
    name: 'Studio',
    description: '3-point lighting setup with key, fill, and rim lights',
    lights: [
      // Key light (main light, slightly warm)
      {
        name: 'Key Light',
        type: 'spotLight' as ObjectType,
        visible: true,
        locked: false,
        position: [3, 5, 3],
        rotation: [-0.8, 0.5, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#FFF5E6',
          intensity: 2.5,
          distance: 20,
          decay: 2,
          angle: Math.PI / 4,
          penumbra: 0.3,
          castShadow: true,
          shadowMapSize: 2048,
          shadowBias: -0.0001,
          shadowRadius: 2,
        },
      },
      // Fill light (softer, opposite side)
      {
        name: 'Fill Light',
        type: 'pointLight' as ObjectType,
        visible: true,
        locked: false,
        position: [-4, 3, 2],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#E6F2FF',
          intensity: 1.2,
          distance: 15,
          decay: 2,
          castShadow: false,
        },
      },
      // Rim/Back light (creates edge definition)
      {
        name: 'Rim Light',
        type: 'directionalLight' as ObjectType,
        visible: true,
        locked: false,
        position: [-2, 4, -3],
        rotation: [0.5, 3, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#FFFFFF',
          intensity: 1.5,
          castShadow: false,
        },
      },
      // Ambient (soft base illumination)
      {
        name: 'Ambient Light',
        type: 'ambientLight' as ObjectType,
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#FFFFFF',
          intensity: 0.4,
        },
      },
    ],
    environment: {
      backgroundColor: '#1A1A1A',
      groundPlaneEnabled: true,
    },
  },
  {
    id: 'outdoor',
    name: 'Outdoor (HDRI)',
    description: 'Natural outdoor lighting with HDRI environment',
    lights: [],
    environment: {
      hdriEnabled: true,
      hdriPreset: 'park',
      hdriIntensity: 1,
      hdriAsBackground: true,
      backgroundBlur: 0,
      groundPlaneEnabled: true,
    },
  },
  {
    id: 'outdoor-manual',
    name: 'Outdoor (Manual)',
    description: 'Bright sunlight with sky ambient and ground bounce',
    lights: [
      // Sun (strong directional)
      {
        name: 'Sun',
        type: 'directionalLight' as ObjectType,
        visible: true,
        locked: false,
        position: [5, 10, 5],
        rotation: [-0.8, 0.5, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#FFF9E6',
          intensity: 3,
          castShadow: true,
          shadowMapSize: 4096,
          shadowBias: -0.0002,
          shadowRadius: 1,
        },
      },
      // Sky ambient (blue-tinted)
      {
        name: 'Sky Light',
        type: 'ambientLight' as ObjectType,
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#87CEEB',
          intensity: 0.8,
        },
      },
    ],
    environment: {
      backgroundColor: '#87CEEB',
      fogEnabled: true,
      fogType: 'linear',
      fogColor: '#C8E6FF',
      groundPlaneEnabled: true,
    },
  },
  {
    id: 'night',
    name: 'Night',
    description: 'Low ambient with colored accent lights',
    lights: [
      // Cool moonlight
      {
        name: 'Moonlight',
        type: 'directionalLight' as ObjectType,
        visible: true,
        locked: false,
        position: [-5, 8, -3],
        rotation: [-1, -0.5, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#6B8CFF',
          intensity: 0.8,
          castShadow: true,
          shadowMapSize: 2048,
          shadowBias: -0.0001,
          shadowRadius: 3,
        },
      },
      // Warm accent light (street lamp)
      {
        name: 'Street Lamp',
        type: 'pointLight' as ObjectType,
        visible: true,
        locked: false,
        position: [3, 3, 3],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#FFB366',
          intensity: 2,
          distance: 12,
          decay: 2,
          castShadow: true,
          shadowMapSize: 1024,
        },
      },
      // Purple neon accent
      {
        name: 'Neon Light',
        type: 'pointLight' as ObjectType,
        visible: true,
        locked: false,
        position: [-3, 2, 2],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#B366FF',
          intensity: 1.5,
          distance: 10,
          decay: 2,
          castShadow: false,
        },
      },
      // Very low ambient
      {
        name: 'Ambient',
        type: 'ambientLight' as ObjectType,
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#1A1A2E',
          intensity: 0.2,
        },
      },
    ],
    environment: {
      backgroundColor: '#0A0A14',
      fogEnabled: true,
      fogType: 'exponential',
      fogColor: '#0A0A14',
      groundPlaneEnabled: true,
    },
  },
  {
    id: 'warehouse',
    name: 'Warehouse (HDRI)',
    description: 'Industrial warehouse HDRI with dramatic lighting',
    lights: [],
    environment: {
      hdriEnabled: true,
      hdriPreset: 'warehouse',
      hdriIntensity: 1.2,
      hdriAsBackground: true,
      backgroundBlur: 0,
      groundPlaneEnabled: true,
    },
  },
  {
    id: 'sunset-hdri',
    name: 'Sunset (HDRI)',
    description: 'Natural sunset HDRI environment',
    lights: [],
    environment: {
      hdriEnabled: true,
      hdriPreset: 'sunset',
      hdriIntensity: 1,
      hdriAsBackground: true,
      backgroundBlur: 0.1,
      groundPlaneEnabled: true,
    },
  },
  {
    id: 'sunset',
    name: 'Sunset (Manual)',
    description: 'Warm orange sun with purple shadows',
    lights: [
      // Warm sun
      {
        name: 'Setting Sun',
        type: 'directionalLight' as ObjectType,
        visible: true,
        locked: false,
        position: [10, 2, 5],
        rotation: [0, 0.5, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#FF8C42',
          intensity: 2.5,
          castShadow: true,
          shadowMapSize: 2048,
        },
      },
      // Purple/blue ambient for shadows
      {
        name: 'Sky Ambient',
        type: 'ambientLight' as ObjectType,
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        lightProps: {
          color: '#9B6BFF',
          intensity: 0.6,
        },
      },
    ],
    environment: {
      backgroundColor: '#FF6B6B',
      fogEnabled: true,
      fogType: 'linear',
      fogColor: '#FFA07A',
      groundPlaneEnabled: true,
    },
  },
  {
    id: 'clear',
    name: 'Clear All',
    description: 'Remove all lights (use your own custom setup)',
    lights: [],
    environment: {
      backgroundColor: '#0A0A0B',
      fogEnabled: false,
      groundPlaneEnabled: false,
    },
  },
];

// Helper to generate a complete SceneObject from preset light data
export function createLightFromPreset(
  presetLight: Omit<SceneObject, 'id' | 'createdAt' | 'modifiedAt'>
): SceneObject {
  const now = Date.now();
  return {
    ...presetLight,
    id: `light_${uuidv4()}`,
    createdAt: now,
    modifiedAt: now,
  };
}
