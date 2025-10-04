/**
 * Stats Panel Component
 *
 * Displays FPS, vertices, triangles, and memory usage.
 */

import { useRef } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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

  useFrame(({ scene, gl }) => {
    frameCount.current++;
    const currentTime = performance.now();
    const delta = currentTime - lastTime.current;

    // Update stats every second
    if (delta >= 1000) {
      const fps = (frameCount.current / delta) * 1000;

      // Count vertices and triangles from scene
      let totalVertices = 0;
      let totalTriangles = 0;

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.geometry) {
          const geometry = object.geometry;
          if (geometry.attributes.position) {
            totalVertices += geometry.attributes.position.count;
          }
          if (geometry.index) {
            totalTriangles += geometry.index.count / 3;
          } else if (geometry.attributes.position) {
            totalTriangles += geometry.attributes.position.count / 3;
          }
        }
      });

      // Get actual memory usage from WebGL
      const info = (gl as any).info;
      const geometryCount = info?.memory?.geometries || 0;
      const textureCount = info?.memory?.textures || 0;

      // Estimate memory: geometries + textures
      // Each geometry: estimate based on vertices
      const estimatedMemory = totalVertices * 48 + totalTriangles * 12;

      updateStats({
        fps,
        vertices: totalVertices,
        triangles: Math.floor(totalTriangles),
        memory: estimatedMemory,
      });

      // Log if geometry count is growing (potential leak detection)
      if (geometryCount > 100) {
        console.warn('[Stats] High geometry count:', geometryCount, '- possible memory leak');
      }

      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  });

  return null;
}
