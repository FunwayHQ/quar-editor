/**
 * Editor Component
 *
 * Main 3D editor interface. This is a placeholder for Sprint 1.
 * Will be fully implemented in Sprint 3 (3D Viewport Foundation).
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStorageAdapter, ProjectData } from '../lib/storage';
import { useAppStore } from '../stores/appStore';
import { useToastStore } from '../stores/toastStore';
import { useSceneStore } from '../stores/sceneStore';
import { useObjectsStore } from '../stores/objectsStore';
import { serializeScene } from '../services/sceneSerializer';
import { useLoadProject } from '../hooks/useLoadProject';
import { useAutoSave } from '../hooks/useAutoSave';
import { Viewport } from './viewport/Viewport';
import { HierarchyPanel } from './panels/HierarchyPanel';
import { RightSidebar } from './panels/RightSidebar';
import { Timeline } from './timeline/Timeline';
import { ExportDialog } from './export/ExportDialog';
import { EditOperationsPanel } from './panels/EditOperationsPanel';
import { AdvancedOperationsPanel } from './panels/AdvancedOperationsPanel';
import { KnifeToolPanel } from './panels/KnifeToolPanel';
import { MenuBar } from './MenuBar';
import { AddMenu } from './modals/AddMenu';
import { ContextMenu } from './ContextMenu';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAnimationKeyframes } from '../hooks/useAnimationKeyframes';
import { useEditModeStore } from '../stores/editModeStore';
import { useKnifeToolStore } from '../stores/knifeToolStore';

export function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  // Use selectors to subscribe only to needed state
  const setLastSaveTime = useAppStore((state) => state.setLastSaveTime);
  const lastSaveTime = useAppStore((state) => state.lastSaveTime);
  const isOffline = useAppStore((state) => state.isOffline);
  const { success, error: showError } = useToastStore();
  const stats = useSceneStore((state) => state.stats);
  const objectCount = useObjectsStore((state) => state.getAllObjects().length);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { isEditMode } = useEditModeStore();
  const { isActive: isKnifeActive } = useKnifeToolStore();

  const storage = getStorageAdapter();

  // Enable keyboard shortcuts (Sprint Y: Pass setShowAddMenu for Shift+A)
  useKeyboardShortcuts(setShowAddMenu);

  // Enable auto-keyframing
  useAnimationKeyframes();

  // Load project using custom hook
  useLoadProject({
    projectId,
    onLoadStart: () => setLoading(true),
    onLoadComplete: (data) => {
      setProject(data);
      setLoading(false);
    },
    onLoadError: (error) => {
      alert('Failed to load project');
      setLoading(false);
    },
  });

  // Auto-save using custom hook
  useAutoSave({
    project,
    interval: 30000, // 30 seconds
    onSaveSuccess: (updatedProject) => {
      setProject(updatedProject);
    },
    onSaveError: (error) => {
      showError('Auto-save failed. Please save manually.');
    },
  });

  // Determine save state
  const getSaveState = (): 'saved' | 'unsaved' | 'saving' => {
    if (isSaving) return 'saving';
    if (!lastSaveTime) return 'unsaved';
    if (project && new Date(project.lastModified) > lastSaveTime) return 'unsaved';
    return 'saved';
  };

  async function saveProject() {
    if (!project) return;

    try {
      setIsSaving(true);
      const sceneData = serializeScene();

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
    } finally {
      setIsSaving(false);
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

  const saveState = getSaveState();

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Menu Bar — matches QUAR Animator/Artist design */}
      <MenuBar
        project={project}
        onProjectUpdate={(p) => setProject(p)}
        onSave={saveProject}
        onExport={() => setShowExportDialog(true)}
        onDownloadQuar={downloadQuar}
        onShowAddMenu={() => setShowAddMenu(true)}
        isSaving={isSaving}
      />

      {/* Export Dialog */}
      {showExportDialog && <ExportDialog onClose={() => setShowExportDialog(false)} />}

      {/* Sprint Y: Add Menu (Shift+A) */}
      <AddMenu isOpen={showAddMenu} onClose={() => setShowAddMenu(false)} />

      {/* Context Menu (global) */}
      <ContextMenu />

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
            {isEditMode && !isKnifeActive && <AdvancedOperationsPanel />}
            {isEditMode && isKnifeActive && <KnifeToolPanel />}
          </div>

          {/* Right Sidebar - Properties & Material */}
          <RightSidebar />
        </div>

        {/* Bottom Area - Timeline */}
        <Timeline />
      </main>

      {/* Status Bar */}
      <footer className="border-t border-border/60 px-3 py-1 flex items-center justify-between text-[11px] text-text-tertiary font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="save-dot" data-state={saveState} title={saveState === 'saved' ? 'All changes saved' : saveState === 'saving' ? 'Saving...' : 'Unsaved changes'} />
            <span>{saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving...' : 'Unsaved'}</span>
          </div>
          <span className="text-border">|</span>
          <span>{objectCount} objects</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{stats.vertices.toLocaleString()} verts</span>
          <span>{stats.triangles.toLocaleString()} tris</span>
          <span>{stats.memory > 0 ? `${stats.memory.toFixed(1)} MB` : ''}</span>
        </div>
      </footer>
    </div>
  );
}
