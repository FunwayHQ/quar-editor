/**
 * 3D Viewport Component
 *
 * Main 3D editing viewport using React Three Fiber.
 * Sprint 2: 3D Viewport Foundation
 * Sprint 3: Object Manipulation
 * Sprint 5: Lighting & Environment
 */

import React, { useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useSceneStore } from '@/stores/sceneStore';
import { useObjectsStore } from '@/stores/objectsStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { useEditModeStore } from '@/stores/editModeStore';
import { useCurveStore } from '@/stores/curveStore';
import { useContextMenuStore } from '@/stores/contextMenuStore';
import { ViewportToolbar } from './ViewportToolbar';
import { StatsPanel, FPSCounter } from './StatsPanel';
import { ObjectCreationToolbar } from './ObjectCreationToolbar';
import { SceneObject } from './SceneObject';
import { TransformGizmo } from './TransformGizmo';
import { EditTransformControls } from './EditTransformControls';
import { EditModeToolbar } from './EditModeToolbar';
import { KnifeToolVisuals } from './KnifeToolVisuals';
import { CurveRenderer } from './CurveRenderer';
import { PreviewMeshRenderer } from './PreviewMeshRenderer';
import { PoseModeToolbar } from './PoseModeToolbar';
import { WeightPaintToolbar } from './WeightPaintToolbar';
import { WeightVisualization } from './WeightVisualization';
import { useCameraPresets } from './CameraPresets';
import * as THREE from 'three';
import { useEffect } from 'react';

function Scene() {
  // CRITICAL FIX: Use selective subscriptions to prevent re-renders from stats updates
  const showGrid = useSceneStore((state) => state.showGrid);
  const showAxes = useSceneStore((state) => state.showAxes);
  const gridSize = useSceneStore((state) => state.gridSize);
  const gridDivisions = useSceneStore((state) => state.gridDivisions);
  const gridUnitSize = useSceneStore((state) => state.gridUnitSize);
  const gridColor = useSceneStore((state) => state.gridColor);
  const gridOpacity = useSceneStore((state) => state.gridOpacity);
  const cameraPreset = useSceneStore((state) => state.cameraPreset);

  const objects = useObjectsStore((state) => state.getAllObjects());
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const toggleSelection = useObjectsStore((state) => state.toggleSelection);
  const clearSelection = useObjectsStore((state) => state.clearSelection);
  const transformMode = useObjectsStore((state) => state.transformMode);
  const { isEditMode } = useEditModeStore();
  const clearCurveSelection = useCurveStore((state) => state.clearSelection);

  // Memoize callback to prevent SceneObject re-renders
  const handleObjectSelect = useCallback((id: string, multiSelect: boolean) => {
    clearCurveSelection();
    toggleSelection(id, multiSelect);
  }, [clearCurveSelection, toggleSelection]);

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
  const handleBackgroundClick = useCallback(() => {
    clearSelection();
    clearCurveSelection();
  }, [clearSelection, clearCurveSelection]);

  // Memoize grid helper to prevent recreation every render
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(
      gridSize * gridUnitSize,  // Total size in meters
      gridDivisions,            // Number of divisions
      gridColor,                // Center line color
      gridColor                 // Grid line color
    );
    // Make grid lines 50% transparent
    const mat = grid.material as THREE.LineBasicMaterial;
    mat.transparent = true;
    mat.opacity = 0.5;
    mat.depthWrite = false;
    return grid;
  }, [gridSize, gridUnitSize, gridDivisions, gridColor]);

  // Memoize axes helper
  const axesHelper = useMemo(() => {
    return new THREE.AxesHelper(2);
  }, []);

  // Memoize grid plane material to prevent recreation
  const gridPlaneMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: gridColor,
      transparent: true,
      opacity: gridOpacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [gridColor, gridOpacity]);

  // Memoize ground plane material
  const groundPlaneMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: groundPlaneColor,
      side: THREE.DoubleSide,
    });
  }, [groundPlaneColor]);

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

      {/* Grid - Sprint Y: Professional grid with real units */}
      {showGrid && (
        <>
          {/* Grid lines */}
          <primitive object={gridHelper} />

          {/* Semi-transparent grid plane for better depth perception */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.001, 0]}
            receiveShadow={false}
          >
            <planeGeometry args={[gridSize * gridUnitSize, gridSize * gridUnitSize]} />
            <primitive object={gridPlaneMaterial} attach="material" />
          </mesh>
        </>
      )}

      {/* Axes - X (Red), Y (Green), Z (Blue) */}
      {showAxes && <primitive object={axesHelper} />}

      {/* Ground Plane */}
      {groundPlaneEnabled && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow={groundPlaneReceiveShadow}>
          <planeGeometry args={[groundPlaneSize, groundPlaneSize]} />
          <primitive object={groundPlaneMaterial} attach="material" />
        </mesh>
      )}

      {/* Default Lighting - Comment out to test user-added lights */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.3} castShadow shadow-mapSize={[2048, 2048]} />

      {/* Scene Objects (including lights) - Only render root objects, children are rendered recursively */}
      {objects
        .filter((object) => object.parentId === null)
        .map((object) => (
          <SceneObject
            key={object.id}
            object={object}
            isSelected={selectedIds.includes(object.id)}
            onSelect={handleObjectSelect}
          />
        ))}

      {/* 2D Curves (SVG imports) */}
      <CurveRenderer />

      {/* Preview Mesh (for curve operations) */}
      <PreviewMeshRenderer />

      {/* Background plane for deselection */}
      <mesh onClick={handleBackgroundClick} visible={false}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Transform Controls */}
      {isEditMode ? (
        <EditTransformControls mode={transformMode} />
      ) : (
        <TransformGizmo />
      )}

      {/* Knife Tool Visuals */}
      <KnifeToolVisuals />

      {/* Weight Paint Visualization */}
      <WeightVisualization />

      {/* FPS Counter - tracks scene stats */}
      <FPSCounter />

    </>
  );
}

export function Viewport() {
  const { showStats } = useSceneStore();
  const { isEditMode } = useEditModeStore();
  const { clearSelection, selectedIds } = useObjectsStore();
  const { clearSelection: clearEditSelection } = useEditModeStore();
  const { clearSelection: clearCurveSelection } = useCurveStore();
  const showContextMenu = useContextMenuStore((state) => state.showContextMenu);

  const handleBackgroundClick = () => {
    if (isEditMode) {
      clearEditSelection();
    } else {
      clearSelection();
      clearCurveSelection();
    }
  };

  return (
    <div
      className="relative w-full h-full bg-background"
      onContextMenu={(e) => {
        e.preventDefault();
        const context = selectedIds.length > 0 ? 'viewport-object' : 'viewport-empty';
        showContextMenu(e.clientX, e.clientY, context);
      }}
    >
      {/* Object Creation Toolbar (hide in edit mode) - moved closer to top */}
      {!isEditMode && <ObjectCreationToolbar />}

      {/* Stats Panel - moved closer to top */}
      {showStats && <StatsPanel />}

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{
          position: [5, 5, 5],
          fov: 50,
        }}
        onPointerMissed={handleBackgroundClick}
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

      {/* Edit Mode Toolbar */}
      <EditModeToolbar />

      {/* Pose Mode Toolbar */}
      <PoseModeToolbar />

      {/* Weight Paint Toolbar */}
      <WeightPaintToolbar />
    </div>
  );
}
