/**
 * Viewport Toolbar Component
 *
 * Controls for camera, shading, and viewport settings.
 */

import { Box, Grid3x3, Eye, Maximize2, Move, RotateCw, Scaling } from 'lucide-react';
import { useSceneStore } from '@/stores/sceneStore';
import { useObjectsStore } from '@/stores/objectsStore';
import { CameraPresetButtons } from './CameraPresetButtons';

interface ViewportToolbarProps {
  embedded?: boolean;
}

export function ViewportToolbar({ embedded = false }: ViewportToolbarProps) {
  const {
    shadingMode,
    setShadingMode,
    showGrid,
    setShowGrid,
    showAxes,
    setShowAxes,
  } = useSceneStore();

  const { transformMode, setTransformMode, selectedIds } = useObjectsStore();

  const shadingModes: Array<{ mode: 'wireframe' | 'solid' | 'material'; label: string; icon: any }> = [
    { mode: 'wireframe', label: 'Wireframe', icon: Grid3x3 },
    { mode: 'solid', label: 'Solid', icon: Box },
    { mode: 'material', label: 'Material', icon: Eye },
  ];

  const transformModes: Array<{ mode: 'translate' | 'rotate' | 'scale'; label: string; icon: any; shortcut: string }> = [
    { mode: 'translate', label: 'Move', icon: Move, shortcut: 'W' },
    { mode: 'rotate', label: 'Rotate', icon: RotateCw, shortcut: 'E' },
    { mode: 'scale', label: 'Scale', icon: Scaling, shortcut: 'R' },
  ];

  // Different styling for embedded vs floating
  const containerClass = embedded
    ? "flex items-center gap-4"
    : "absolute top-4 left-1/2 transform -translate-x-1/2 glass px-4 py-2 flex items-center gap-4 z-10";

  return (
    <div className={containerClass}>
      {/* Transform Modes (only show if something is selected) */}
      {selectedIds.length > 0 && (
        <>
          <div className="flex items-center gap-1">
            {transformModes.map(({ mode, label, icon: Icon, shortcut }) => (
              <button
                key={mode}
                onClick={() => setTransformMode(mode)}
                className={`p-2 rounded transition-all ${
                  transformMode === mode
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
                }`}
                title={`${label} (${shortcut})`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border" />
        </>
      )}

      {/* Shading Modes */}
      <div className="flex items-center gap-1">
        {shadingModes.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => setShadingMode(mode)}
            className={`p-2 rounded transition-all ${
              shadingMode === mode
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-panel'
            }`}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Camera Presets */}
      <CameraPresetButtons />

      <div className="w-px h-6 bg-border" />

      {/* Toggle Grid */}
      <button
        onClick={() => setShowGrid(!showGrid)}
        className={`p-2 rounded transition-all ${
          showGrid
            ? 'bg-accent text-white'
            : 'text-text-secondary hover:text-text-primary hover:bg-panel'
        }`}
        title="Toggle Grid"
      >
        <Grid3x3 className="w-4 h-4" />
      </button>

      {/* Toggle Axes */}
      <button
        onClick={() => setShowAxes(!showAxes)}
        className={`p-2 rounded transition-all ${
          showAxes
            ? 'bg-accent text-white'
            : 'text-text-secondary hover:text-text-primary hover:bg-panel'
        }`}
        title="Toggle Axes"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
}
