/**
 * Camera Presets Component
 *
 * Quick camera view presets (Front, Top, Right, Isometric, etc.)
 */

import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type CameraPreset = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'isometric';

export function useCameraPresets() {
  const { camera, controls } = useThree();

  const applyPreset = (preset: CameraPreset) => {
    const distance = 10;

    const positions: Record<CameraPreset, [number, number, number]> = {
      front: [0, 0, distance],
      back: [0, 0, -distance],
      top: [0, distance, 0],
      bottom: [0, -distance, 0],
      left: [-distance, 0, 0],
      right: [distance, 0, 0],
      isometric: [distance, distance, distance],
    };

    const position = positions[preset];
    camera.position.set(...position);
    camera.lookAt(0, 0, 0);

    // Update controls target
    if (controls && 'target' in controls) {
      (controls as any).target.set(0, 0, 0);
      (controls as any).update();
    }
  };

  return { applyPreset };
}
