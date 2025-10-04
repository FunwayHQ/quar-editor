/**
 * Stats Panel Component
 *
 * Displays FPS, vertices, triangles, and memory usage.
 */

import { useRef } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useFrame } from '@react-three/fiber';

export function StatsPanel() {
  const { stats } = useSceneStore();

  // Determine FPS color
  const getFpsColor = (fps: number) => {
    if (fps > 55) return 'text-success'; // Green
    if (fps > 30) return 'text-warning'; // Yellow
    return 'text-error'; // Red
  };

  return (
    <div className="absolute top-4 left-4 glass px-4 py-2 text-xs font-mono space-y-1 z-10">
      <div className="flex items-center gap-2">
        <span className="text-text-secondary">FPS:</span>
        <span className={`font-semibold ${getFpsColor(stats.fps)}`}>
          {stats.fps.toFixed(1)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-text-secondary">Vertices:</span>
        <span className="text-text-primary">{stats.vertices.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-text-secondary">Triangles:</span>
        <span className="text-text-primary">{stats.triangles.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-text-secondary">Memory:</span>
        <span className="text-text-primary">
          {(stats.memory / 1024 / 1024).toFixed(1)} MB
        </span>
      </div>
    </div>
  );
}

/**
 * FPS Counter Hook
 *
 * Tracks FPS and updates stats store.
 * Use this component inside <Canvas> to track performance.
 */
export function FPSCounter() {
  const { updateStats } = useSceneStore();
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    const delta = currentTime - lastTime.current;

    // Update FPS every second
    if (delta >= 1000) {
      const fps = (frameCount.current / delta) * 1000;
      updateStats({ fps });
      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  });

  return null;
}
