/**
 * Editor Component
 *
 * Main 3D editor interface. This is a placeholder for Sprint 1.
 * Will be fully implemented in Sprint 3 (3D Viewport Foundation).
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download, FileDown } from 'lucide-react';
import { getStorageAdapter, ProjectData } from '../lib/storage';
import { useAppStore } from '../stores/appStore';
import { useToastStore } from '../stores/toastStore';
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
import { ViewportToolbar } from './viewport/ViewportToolbar';
import { AddMenu } from './modals/AddMenu';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAnimationKeyframes } from '../hooks/useAnimationKeyframes';
import { useEditModeStore } from '../stores/editModeStore';
import { useKnifeToolStore } from '../stores/knifeToolStore';

export function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  // Use selectors to subscribe only to needed state
  const setLastSaveTime = useAppStore((state) => state.setLastSaveTime);
  const isOffline = useAppStore((state) => state.isOffline);
  const { success, error: showError } = useToastStore();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [loading, setLoading] = useState(true);
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

  async function saveProject() {
    if (!project) return;

    try {
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

      {/* Sprint Y: Add Menu (Shift+A) */}
      <AddMenu isOpen={showAddMenu} onClose={() => setShowAddMenu(false)} />

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
      <footer className="border-t border-border p-2 flex items-center justify-between text-xs text-text-secondary">
        <span>Project ID: {project.id.slice(0, 8)}...</span>
        <span>Last modified: {new Date(project.lastModified).toLocaleTimeString()}</span>
      </footer>
    </div>
  );
}
