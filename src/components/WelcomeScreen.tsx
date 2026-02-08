/**
 * Welcome Screen Component
 *
 * Shows project list and allows creating/opening projects.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, Download, Shield, Database, Trash2, FileDown, HelpCircle } from 'lucide-react';
import { getStorageAdapter, ProjectData } from '../lib/storage';
import { useAppStore } from '../stores/appStore';
import { useConsentStore } from '../stores/consentStore';
import { useToastStore } from '../stores/toastStore';
import { v4 as uuidv4 } from 'uuid';
import { PrivacyPolicy } from './PrivacyPolicy';
import { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';
import { clearAllData } from '../lib/storage/db';

export function WelcomeScreen() {
  const navigate = useNavigate();
  // Use selector to subscribe only to needed state
  const isOffline = useAppStore((state) => state.isOffline);
  const { revokeConsent } = useConsentStore();
  const toast = useToastStore();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const { dialogProps, showConfirm } = useConfirmDialog();

  const storage = getStorageAdapter();

  // Allow page scrolling on welcome screen (global body has overflow:hidden for the editor)
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const projectList = await storage.getProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createNewProject() {
    const projectId = uuidv4();
    const newProject: ProjectData = {
      id: projectId,
      name: 'Untitled Project',
      sceneData: { objects: [], lights: [], cameras: [] }, // Empty scene
      created: new Date(),
      lastModified: new Date(),
    };

    try {
      await storage.saveProject(newProject);
      navigate(`/editor/${projectId}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  }

  function openProject(projectId: string) {
    navigate(`/editor/${projectId}`);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate .quar file format
      if (!data.version || !data.scene) {
        throw new Error('Invalid .quar file format');
      }

      const projectId = uuidv4();
      const importedProject: ProjectData = {
        id: projectId,
        name: file.name.replace('.quar', ''),
        sceneData: data.scene,
        created: new Date(),
        lastModified: new Date(),
      };

      await storage.saveProject(importedProject);
      await loadProjects();
      navigate(`/editor/${projectId}`);
    } catch (error) {
      console.error('Failed to import project:', error);
      alert('Failed to import .quar file');
    }
  }

  async function exportAllData() {
    try {
      const allProjects = await storage.getProjects();
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        projects: allProjects,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quar-editor-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    }
  }

  function handleClearProjects() {
    showConfirm({
      title: 'Clear All Projects',
      message:
        'This will permanently delete all projects and assets from your browser. This cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        try {
          await clearAllData();
          setProjects([]);
          toast.success('All projects cleared');
        } catch {
          toast.error('Failed to clear projects');
        }
      },
    });
  }

  function handleClearPreferences() {
    showConfirm({
      title: 'Clear Preferences',
      message:
        'This will reset your theme, layout, and all other preferences to defaults.',
      variant: 'warning',
      confirmLabel: 'Reset',
      onConfirm: () => {
        try {
          localStorage.removeItem('quar-app-storage');
          toast.success('Preferences cleared — reload to apply defaults');
        } catch {
          toast.error('Failed to clear preferences');
        }
      },
    });
  }

  function handleRevokeConsent() {
    showConfirm({
      title: 'Revoke Consent',
      message:
        'This will revoke your storage consent. The consent banner will appear again on your next visit.',
      variant: 'warning',
      icon: Shield,
      confirmLabel: 'Revoke',
      onConfirm: () => {
        revokeConsent();
        toast.info('Consent revoked');
      },
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Subtle radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <header className="border-b border-border p-6 relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-dark.svg" alt="QUAR Editor" className="h-12" />
            <span className="text-[10px] font-mono text-text-tertiary bg-surface-2 px-2 py-0.5 rounded-full border border-border/50">v0.1.0</span>
            {isOffline && (
              <span className="text-sm text-text-secondary px-2 py-1 bg-panel rounded">
                Offline Mode
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-8 relative z-10">
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-bold mb-2">Your Projects</h2>
          <p className="text-text-secondary">
            All projects are stored locally on your device
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={createNewProject}
            className="glass p-6 hover:shadow-glow-sm transition-all flex flex-col items-center justify-center gap-3 min-h-[200px] group"
          >
            <Plus className="w-12 h-12 text-accent group-hover:scale-110 transition-transform" />
            <span className="font-medium font-heading">New Project</span>
            <span className="text-sm text-text-secondary">Start from scratch</span>
          </button>

          <label className="glass p-6 hover:shadow-glow-sm transition-all flex flex-col items-center justify-center gap-3 min-h-[200px] cursor-pointer group">
            <input
              type="file"
              accept=".quar"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Download className="w-12 h-12 text-accent group-hover:scale-110 transition-transform" />
            <span className="font-medium font-heading">Open .quar File</span>
            <span className="text-sm text-text-secondary">Import from file</span>
          </label>

          <div className="glass p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] opacity-50">
            <Folder className="w-12 h-12 text-text-secondary" />
            <span className="font-medium font-heading">Sample Projects</span>
            <span className="text-sm text-text-secondary">Coming soon</span>
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <h3 className="text-xl font-heading font-semibold mb-4">Recent Projects</h3>

          {loading ? (
            <div className="text-center py-12 text-text-secondary">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              No projects yet. Create one to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => openProject(project.id)}
                  className="glass p-4 hover:-translate-y-1 hover:shadow-lg transition-all text-left group"
                >
                  <div className="aspect-video bg-background rounded mb-3 flex items-center justify-center">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Folder className="w-12 h-12 text-text-secondary" />
                    )}
                  </div>
                  <h4 className="font-medium truncate group-hover:text-accent transition-colors">
                    {project.name}
                  </h4>
                  <p className="text-sm text-text-secondary">
                    {new Date(project.lastModified).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Data Management */}
        {showDataManagement && (
          <div className="mt-8 glass p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-heading font-semibold">Manage Your Data</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              All your data is stored locally in your browser. Use these controls to export or delete it.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportAllData}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#27272A] hover:bg-[#3f3f46] rounded-lg transition-colors"
              >
                <FileDown className="w-4 h-4" />
                Export All Data
              </button>
              <button
                onClick={handleClearProjects}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Projects
              </button>
              <button
                onClick={handleClearPreferences}
                className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg transition-colors"
              >
                Clear Preferences
              </button>
              <button
                onClick={handleRevokeConsent}
                className="flex items-center gap-2 px-4 py-2 text-sm text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4" />
                Revoke Consent
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border p-6 text-center text-text-secondary text-sm relative z-10">
        <p>
          QUAR Editor Open Source v0.1.0 • MIT License •{' '}
          <a
            href="https://github.com/FunwayHQ/quar-editor"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          {' • '}
          <button
            onClick={() => setShowPrivacyPolicy(true)}
            className="text-accent hover:underline"
          >
            Privacy Policy
          </button>
          {' • '}
          <button
            onClick={() => setShowDataManagement((v) => !v)}
            className="text-accent hover:underline"
          >
            Manage Data
          </button>
          {' • '}
          <button
            onClick={() => navigate('/help')}
            className="text-accent hover:underline inline-flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5 inline" />
            Help & Guide
          </button>
        </p>
      </footer>

      {showPrivacyPolicy && (
        <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
