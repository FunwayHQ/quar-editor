/**
 * 3D Viewport Component
 *
 * Main 3D editing viewport using React Three Fiber.
 * Sprint 2: 3D Viewport Foundation
 * Sprint 3: Object Manipulation
 * Sprint 5: Lighting & Environment
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useSceneStore } from '@/stores/sceneStore';
import { useObjectsStore } from '@/stores/objectsStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { ViewportToolbar } from './ViewportToolbar';
import { StatsPanel } from './StatsPanel';
import { ObjectCreationToolbar } from './ObjectCreationToolbar';
import { SceneObject } from './SceneObject';
import { TransformGizmo } from './TransformGizmo';
import { useCameraPresets } from './CameraPresets';
import * as THREE from 'three';
import { useEffect } from 'react';

function Scene() {
  const { showGrid, showAxes } = useSceneStore();
  const cameraPreset = useSceneStore((state) => state.cameraPreset);
  const objects = useObjectsStore((state) => state.getAllObjects());
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const toggleSelection = useObjectsStore((state) => state.toggleSelection);
  const clearSelection = useObjectsStore((state) => state.clearSelection);

  // Environment settings
  const {
    backgroundColor,
    hdriEnabled,
    hdriPreset,
    hdriFile,
    hdriIntensity,
    hdriAsBackground,
    backgroundBlur,
    fogEnabled,
    fogType,
    fogColor,
    fogNear,
    fogFar,
    fogDensity,
    groundPlaneEnabled,
    groundPlaneSize,
    groundPlaneColor,
    groundPlaneReceiveShadow,
  } = useEnvironmentStore();

  // Camera preset hook
  const { applyPreset } = useCameraPresets();

  // Apply camera preset when it changes
  useEffect(() => {
    if (cameraPreset) {
      applyPreset(cameraPreset);
    }
  }, [cameraPreset, applyPreset]);

  // Handle background click to deselect
  const handleBackgroundClick = () => {
    clearSelection();
  };

  return (
    <>
      {/* HDRI / IBL Environment */}
      {hdriEnabled && (hdriPreset || hdriFile) && (
        <Environment
          preset={hdriPreset as any}
          files={hdriFile || undefined}
          background={hdriAsBackground}
          blur={backgroundBlur}
          environmentIntensity={hdriIntensity}
        />
      )}

      {/* Background Color (only if HDRI not used as background) */}
      {(!hdriEnabled || !hdriAsBackground) && (
        <color attach="background" args={[backgroundColor]} />
      )}

      {/* Fog */}
      {fogEnabled && fogType === 'linear' && (
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      )}
      {fogEnabled && fogType === 'exponential' && (
        <fogExp2 attach="fog" args={[fogColor, fogDensity]} />
      )}

      {/* Grid */}
      {showGrid && (
        <primitive object={new THREE.GridHelper(10, 10, '#7C3AED', '#7C3AED')} />
      )}

      {/* Axes - X (Red), Y (Green), Z (Blue) */}
      {showAxes && <primitive object={new THREE.AxesHelper(2)} />}

      {/* Ground Plane */}
      {groundPlaneEnabled && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow={groundPlaneReceiveShadow}>
          <planeGeometry args={[groundPlaneSize, groundPlaneSize]} />
          <meshStandardMaterial color={groundPlaneColor} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Default Lighting - Comment out to test user-added lights */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.3} castShadow shadow-mapSize={[2048, 2048]} />

      {/* Scene Objects (including lights) */}
      {objects.map((object) => (
        <SceneObject
          key={object.id}
          object={object}
          isSelected={selectedIds.includes(object.id)}
          onSelect={toggleSelection}
        />
      ))}

      {/* Background plane for deselection */}
      <mesh onClick={handleBackgroundClick} visible={false}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Transform Gizmo */}
      <TransformGizmo />
    </>
  );
}

export function Viewport() {
  const { showStats } = useSceneStore();

  return (
    <div className="relative w-full h-full bg-background">
      {/* Object Creation Toolbar */}
      <ObjectCreationToolbar />

      {/* Viewport Toolbar */}
      <ViewportToolbar />

      {/* Stats Panel */}
      {showStats && <StatsPanel />}

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{
          position: [5, 5, 5],
          fov: 50,
        }}
        onCreated={({ gl }) => {
          // Handle WebGL context loss
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('[WebGL] Context lost, attempting to restore...');
          });

          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log('[WebGL] Context restored');
          });
        }}
      >
        {/* Camera Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          enabled={true}
          enablePan={true}
          enableRotate={true}
          enableZoom={true}
          regress
        />

        {/* Scene Content */}
        <Scene />
      </Canvas>
    </div>
  );
}
