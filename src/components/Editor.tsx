/**
 * Editor Component
 *
 * Main 3D editor interface. This is a placeholder for Sprint 1.
 * Will be fully implemented in Sprint 3 (3D Viewport Foundation).
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download, FileDown } from 'lucide-react';
import * as THREE from 'three';
import { getStorageAdapter, ProjectData } from '../lib/storage';
import { useAppStore } from '../stores/appStore';
import { useToastStore } from '../stores/toastStore';
import { useObjectsStore } from '../stores/objectsStore';
import { useMaterialsStore } from '../stores/materialsStore';
import { useAnimationStore } from '../stores/animationStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useMorphTargetStore } from '../stores/morphTargetStore';
import { useCurveStore } from '../stores/curveStore';
import { Viewport } from './viewport/Viewport';
import { HierarchyPanel } from './panels/HierarchyPanel';
import { RightSidebar } from './panels/RightSidebar';
import { Timeline } from './timeline/Timeline';
import { ExportDialog } from './export/ExportDialog';
import { EditOperationsPanel } from './panels/EditOperationsPanel';
import { KnifeToolPanel } from './panels/KnifeToolPanel';
import { ViewportToolbar } from './viewport/ViewportToolbar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAnimationKeyframes } from '../hooks/useAnimationKeyframes';
import { useEditModeStore } from '../stores/editModeStore';
import { useKnifeToolStore } from '../stores/knifeToolStore';
import { meshRegistry } from '../lib/mesh/MeshRegistry';

export function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { setLastSaveTime, isOffline } = useAppStore();
  const { success, error: showError } = useToastStore();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isEditMode } = useEditModeStore();
  const { isActive: isKnifeActive } = useKnifeToolStore();

  const storage = getStorageAdapter();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Enable auto-keyframing
  useAnimationKeyframes();

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!project) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        const sceneData = serializeSceneData();

        const updatedProject = {
          ...project,
          sceneData,
          lastModified: new Date(),
        };

        await storage.saveProject(updatedProject);
        setProject(updatedProject);
        setLastSaveTime(new Date());
        console.log('[Editor] Auto-save completed');
        // Silent auto-save - no toast notification to avoid spam
      } catch (err) {
        console.error('[Editor] Auto-save failed:', err);
        showError('Auto-save failed. Please save manually.');
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [project]);

  async function loadProject(id: string) {
    try {
      setLoading(true);
      const data = await storage.getProject(id);
      if (!data) {
        alert('Project not found');
        navigate('/');
        return;
      }
      setProject(data);

      // Restore scene data into stores
      if (data.sceneData) {
        const scene = data.sceneData as any;

        // Restore objects
        if (scene.objects) {
          console.log(`[Editor] Loading ${scene.objects.length} objects from saved data`);
          scene.objects.forEach((obj: any) => {
            // Log if object has saved geometry data
            if (obj.geometry?.data) {
              console.log(`[Editor] Object ${obj.name} has saved geometry data (${obj.geometry.data.attributes?.position?.array.length / 3} vertices)`);
            }
            useObjectsStore.getState().objects.set(obj.id, obj);
          });
        }

        // Restore materials
        if (scene.materials) {
          scene.materials.forEach((mat: any) => {
            useMaterialsStore.getState().materials.set(mat.id, mat);
          });
          if (scene.objectMaterials) {
            scene.objectMaterials.forEach(([objId, matId]: [string, string]) => {
              useMaterialsStore.getState().objectMaterials.set(objId, matId);
            });
          }
        }

        // Restore animations
        if (scene.animations) {
          scene.animations.forEach((anim: any) => {
            useAnimationStore.getState().animations.set(anim.id, anim);
          });
          if (scene.activeAnimationId) {
            useAnimationStore.getState().setActiveAnimation(scene.activeAnimationId);
          }
        }

        // Restore environment
        if (scene.environment) {
          useEnvironmentStore.setState(scene.environment);
        }

        // Restore curves
        if (scene.curves) {
          console.log(`[Editor] Loading ${scene.curves.length} curves from saved data`);
          scene.curves.forEach((curveData: any) => {
            const curve = {
              ...curveData,
              // Convert back to Vector2/Vector3/Euler
              points: curveData.points.map((p: any) => new THREE.Vector2(p.x, p.y)),
              transform: {
                position: new THREE.Vector3(
                  curveData.transform.position.x,
                  curveData.transform.position.y,
                  curveData.transform.position.z
                ),
                rotation: new THREE.Euler(
                  curveData.transform.rotation.x,
                  curveData.transform.rotation.y,
                  curveData.transform.rotation.z
                ),
                scale: new THREE.Vector2(
                  curveData.transform.scale.x,
                  curveData.transform.scale.y
                )
              }
            };
            useCurveStore.getState().curves.set(curve.id, curve);
          });
        }

        // Restore shape keys
        if (scene.shapeKeys) {
          const morphState = useMorphTargetStore.getState();
          const newShapeKeysMap = new Map();

          scene.shapeKeys.forEach(([objectId, shapeKeys]: [string, any[]]) => {
            newShapeKeysMap.set(objectId, shapeKeys);
          });

          morphState.shapeKeysByObject = newShapeKeysMap;
        }

        // Restore base poses
        if (scene.basePoses) {
          const morphState = useMorphTargetStore.getState();
          const newBasePoses = new Map();

          scene.basePoses.forEach(({ objectId, geometryData }: any) => {
            // Deserialize geometry
            const geometry = new THREE.BufferGeometry();

            if (geometryData.attributes.position) {
              geometry.setAttribute(
                'position',
                new THREE.BufferAttribute(
                  new Float32Array(geometryData.attributes.position.array),
                  geometryData.attributes.position.itemSize
                )
              );
            }

            newBasePoses.set(objectId, geometry);
          });

          morphState.basePoses = newBasePoses;
        }

        console.log('[Editor] Scene data restored from storage');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  // Helper to serialize scene data from all stores
  const serializeSceneData = () => {
    const objectsState = useObjectsStore.getState();
    const materialsState = useMaterialsStore.getState();
    const animationState = useAnimationStore.getState();
    const envState = useEnvironmentStore.getState();
    const morphState = useMorphTargetStore.getState();
    const curveState = useCurveStore.getState();

    // Serialize objects with current geometry from mesh registry
    const objects = Array.from(objectsState.objects.values()).map(obj => {
      const mesh = meshRegistry.getMesh(obj.id);

      // If mesh exists in registry with modified geometry, serialize it
      if (mesh && mesh.geometry) {
        const geometry = mesh.geometry;
        const geometryData = {
          attributes: {} as any,
          index: null as any,
        };

        // Serialize position attribute
        if (geometry.attributes.position) {
          const pos = geometry.attributes.position;
          geometryData.attributes.position = {
            array: Array.from(pos.array),
            itemSize: pos.itemSize,
          };
        }

        // Serialize normal attribute
        if (geometry.attributes.normal) {
          const norm = geometry.attributes.normal;
          geometryData.attributes.normal = {
            array: Array.from(norm.array),
            itemSize: norm.itemSize,
          };
        }

        // Serialize UV attribute
        if (geometry.attributes.uv) {
          const uv = geometry.attributes.uv;
          geometryData.attributes.uv = {
            array: Array.from(uv.array),
            itemSize: uv.itemSize,
          };
        }

        // Serialize index
        if (geometry.index) {
          geometryData.index = {
            array: Array.from(geometry.index.array),
          };
        }

        // Log that we're saving modified geometry
        console.log(`[Editor] Saving modified geometry for ${obj.name}, vertices: ${geometryData.attributes.position?.array.length / 3}`);

        // Return object with updated geometry data
        return {
          ...obj,
          geometry: {
            ...obj.geometry,
            data: geometryData,
          }
        };
      }

      // Return object as-is if no mesh in registry
      return obj;
    });

    // Serialize shape keys
    const shapeKeysByObject = Array.from(morphState.shapeKeysByObject.entries());

    // Serialize base poses
    const basePoses: any[] = [];
    morphState.basePoses.forEach((geom, objectId) => {
      const geometryData = {
        attributes: {} as any,
        index: null as any,
      };

      if (geom.attributes.position) {
        const pos = geom.attributes.position;
        geometryData.attributes.position = {
          array: Array.from(pos.array),
          itemSize: pos.itemSize,
        };
      }

      basePoses.push({ objectId, geometryData });
    });

    console.log(`[Editor] Serializing ${objects.length} objects, ${shapeKeysByObject.length} shape key sets`);

    return {
      objects,
      shapeKeys: shapeKeysByObject,
      basePoses,
      materials: Array.from(materialsState.materials.values()),
      objectMaterials: Array.from(materialsState.objectMaterials.entries()),
      textures: Array.from(materialsState.textures.values()),
      animations: Array.from(animationState.animations.values()),
      activeAnimationId: animationState.activeAnimationId,
      environment: {
        backgroundColor: envState.backgroundColor,
        hdriEnabled: envState.hdriEnabled,
        hdriPreset: envState.hdriPreset,
        hdriIntensity: envState.hdriIntensity,
        hdriAsBackground: envState.hdriAsBackground,
        backgroundBlur: envState.backgroundBlur,
        fogEnabled: envState.fogEnabled,
        fogType: envState.fogType,
        fogColor: envState.fogColor,
        fogNear: envState.fogNear,
        fogFar: envState.fogFar,
        fogDensity: envState.fogDensity,
        groundPlaneEnabled: envState.groundPlaneEnabled,
        groundPlaneSize: envState.groundPlaneSize,
        groundPlaneColor: envState.groundPlaneColor,
        groundPlaneReceiveShadow: envState.groundPlaneReceiveShadow,
      },
      curves: Array.from(curveState.curves.values()).map(curve => ({
        ...curve,
        // Convert Vector2/Vector3/Euler to serializable format
        points: curve.points.map(p => ({ x: p.x, y: p.y })),
        transform: {
          position: { x: curve.transform.position.x, y: curve.transform.position.y, z: curve.transform.position.z },
          rotation: { x: curve.transform.rotation.x, y: curve.transform.rotation.y, z: curve.transform.rotation.z },
          scale: { x: curve.transform.scale.x, y: curve.transform.scale.y }
        }
      })),
    };
  };

  async function saveProject() {
    if (!project) return;

    try {
      const sceneData = serializeSceneData();

      const updatedProject = {
        ...project,
        sceneData,
        lastModified: new Date(),
      };

      await storage.saveProject(updatedProject);
      setProject(updatedProject);
      setLastSaveTime(new Date());
      success('Project saved successfully');
      console.log('[Editor] Project saved with scene data');
    } catch (err) {
      console.error('Failed to save project:', err);
      showError('Failed to save project. Please try again.');
    }
  }

  async function downloadQuar() {
    if (!project) return;

    try {
      const quarData = {
        version: '1.0',
        scene: project.sceneData,
        assets: [], // Will include assets in later sprints
      };

      const blob = new Blob([JSON.stringify(quarData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.quar`;
      a.click();
      URL.revokeObjectURL(url);

      success(`Downloaded ${project.name}.quar`);
    } catch (err) {
      console.error('Failed to download .quar file:', err);
      showError('Failed to download file. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Top Toolbar - Three column grid for perfect centering */}
      <header className="border-b border-border p-3 grid grid-cols-3 items-center">
        {/* Left Column */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost p-2"
            title="Back to projects"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <img src="/logo-dark.svg" alt="QUAR Editor" className="h-10" />

          <input
            type="text"
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            className="input bg-transparent border-none text-lg font-semibold focus:ring-0 px-2"
            title="Click to rename project"
            style={{ width: `${project.name.length + 2}ch` }}
          />

          {isOffline && (
            <span className="text-xs text-text-secondary px-2 py-1 bg-panel rounded">
              Offline
            </span>
          )}
        </div>

        {/* Center Column - Always centered regardless of left/right content */}
        <div className="flex items-center justify-center" style={{ marginLeft: '-70px' }}>
          {!isEditMode && <ViewportToolbar embedded={true} />}
        </div>

        {/* Right Column */}
        <div className="flex items-center gap-2 justify-end">
          <button onClick={saveProject} className="btn-secondary flex items-center gap-2" title="Save project">
            <Save className="w-4 h-4" />
            Save
          </button>

          <button onClick={() => setShowExportDialog(true)} className="btn-secondary flex items-center gap-2" title="Export scene">
            <FileDown className="w-4 h-4" />
            Export
          </button>

          <button onClick={downloadQuar} className="btn-ghost flex items-center gap-2" title="Download .quar file">
            <Download className="w-4 h-4" />
            Download .quar
          </button>
        </div>
      </header>

      {/* Export Dialog */}
      {showExportDialog && <ExportDialog onClose={() => setShowExportDialog(false)} />}

      {/* Main Editor Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Top Area - Hierarchy + Viewport + Properties */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Hierarchy */}
          <HierarchyPanel />

          {/* Center - Viewport */}
          <div className="flex-1 relative">
            <Viewport />
            {isEditMode && !isKnifeActive && <EditOperationsPanel />}
            {isEditMode && isKnifeActive && <KnifeToolPanel />}
          </div>

          {/* Right Sidebar - Properties & Material */}
          <RightSidebar />
        </div>

        {/* Bottom Area - Timeline */}
        <Timeline />
      </main>

      {/* Status Bar */}
      <footer className="border-t border-border p-2 flex items-center justify-between text-xs text-text-secondary">
        <span>Project ID: {project.id.slice(0, 8)}...</span>
        <span>Last modified: {new Date(project.lastModified).toLocaleTimeString()}</span>
      </footer>
    </div>
  );
}
