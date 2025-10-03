/**
 * Camera Preset Buttons
 *
 * UI buttons for quick camera view presets.
 */

import { CameraPreset } from './CameraPresets';
import { useSceneStore } from '@/stores/sceneStore';

export function CameraPresetButtons() {
  const { cameraPreset, setCameraPreset } = useSceneStore();

  const presets: Array<{ preset: CameraPreset; label: string; shortLabel: string }> = [
    { preset: 'front', label: 'Front View', shortLabel: 'F' },
    { preset: 'top', label: 'Top View', shortLabel: 'T' },
    { preset: 'right', label: 'Right View', shortLabel: 'R' },
    { preset: 'isometric', label: 'Isometric View', shortLabel: 'I' },
  ];

  return (
    <div className="flex items-center gap-1">
      {presets.map(({ preset, label, shortLabel }) => (
        <button
          key={preset}
          onClick={() => setCameraPreset(preset)}
          className={`p-2 rounded text-xs font-semibold transition-all ${
            cameraPreset === preset
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-panel hover:bg-accent hover:text-white'
          }`}
          title={label}
        >
          {shortLabel}
        </button>
      ))}
    </div>
  );
}
