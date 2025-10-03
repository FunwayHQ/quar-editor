/**
 * Editor Component
 *
 * Main 3D editor interface. This is a placeholder for Sprint 1.
 * Will be fully implemented in Sprint 3 (3D Viewport Foundation).
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download } from 'lucide-react';
import { getStorageAdapter, ProjectData } from '../lib/storage';
import { useAppStore } from '../stores/appStore';
import { useToastStore } from '../stores/toastStore';
import { useObjectsStore } from '../stores/objectsStore';
import { useMaterialsStore } from '../stores/materialsStore';
import { useAnimationStore } from '../stores/animationStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { Viewport } from './viewport/Viewport';
import { HierarchyPanel } from './panels/HierarchyPanel';
import { RightSidebar } from './panels/RightSidebar';
import { Timeline } from './timeline/Timeline';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAnimationKeyframes } from '../hooks/useAnimationKeyframes';

export function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { setLastSaveTime, isOffline } = useAppStore();
  const { success, error: showError } = useToastStore();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

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
          scene.objects.forEach((obj: any) => {
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

    return {
      objects: Array.from(objectsState.objects.values()),
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
      {/* Top Toolbar */}
      <header className="border-b border-border p-3 flex items-center justify-between">
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
            style={{ width: `${project.name.length + 2}ch` }}
          />

          {isOffline && (
            <span className="text-xs text-text-secondary px-2 py-1 bg-panel rounded">
              Offline
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={saveProject} className="btn-secondary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save
          </button>

          <button onClick={downloadQuar} className="btn-ghost flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download .quar
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Top Area - Hierarchy + Viewport + Properties */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Hierarchy */}
          <HierarchyPanel />

          {/* Center - Viewport */}
          <div className="flex-1">
            <Viewport />
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
