/**
 * Welcome Screen Component
 *
 * Shows project list and allows creating/opening projects.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Shield, Database, Trash2, FileDown } from 'lucide-react';
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

  function handleDeleteProject(projectId: string, projectName: string) {
    showConfirm({
      title: 'Delete Project',
      message: `Are you sure you want to delete "${projectName}"? This cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await storage.deleteProject(projectId);
          setProjects((prev) => prev.filter((p) => p.id !== projectId));
          toast.success(`Deleted "${projectName}"`);
        } catch {
          toast.error('Failed to delete project');
        }
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col relative overflow-x-hidden">
      {/* Header — matches Animator/Artist: Logo left, Import button right */}
      <header
        className="flex items-center justify-between h-12 px-4 relative z-10"
        style={{ borderBottom: '1px solid rgba(39, 39, 42, 0.5)' }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo-dark.svg" alt="QUAR Editor" className="h-7" />
          <span className="text-[10px] font-mono text-[#52525B] bg-[#18181B] px-2 py-0.5 rounded border border-[#27272A]/50">
            v0.1.0
          </span>
          {isOffline && (
            <span className="text-xs text-[#71717A] px-2 py-0.5 bg-[#18181B] rounded border border-[#27272A]/50">
              Offline
            </span>
          )}
        </div>

        <label
          className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#A1A1AA] border border-[#27272A] rounded cursor-pointer hover:border-[#3f3f46] hover:text-[#FAFAFA] transition-colors"
        >
          <input type="file" accept=".quar" onChange={handleFileUpload} className="hidden" />
          <Download className="w-3.5 h-3.5" />
          Import .quar
        </label>
      </header>

      {/* Main content area */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Projects grid or empty state */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-3 border-[#7C3AED] border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-[#71717A] text-sm">Loading projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state — centered like Animator */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <p className="text-[#71717A] text-sm mb-5">No projects yet. Create your first 3D scene or import an existing .quar file.</p>
              <button
                onClick={createNewProject}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' }}
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        ) : (
          /* Projects list */
          <div className="max-w-6xl mx-auto w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-[#FAFAFA]">Projects</h2>
              <button
                onClick={createNewProject}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                New Project
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="group relative text-left rounded-lg overflow-hidden border border-[#27272A]/60 hover:border-[#7C3AED]/40 transition-all hover:-translate-y-0.5 cursor-pointer"
                  style={{ backgroundColor: 'rgba(24, 24, 27, 0.5)' }}
                  onClick={() => openProject(proj.id)}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(proj.id, proj.name);
                    }}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-[#18181B]/80 border border-[#27272A]/60 text-[#52525B] opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/15 hover:border-red-500/30 transition-all"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="aspect-video bg-[#111113] flex items-center justify-center">
                    {proj.thumbnail ? (
                      <img src={proj.thumbnail} alt={proj.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-[#E4E4E7] truncate group-hover:text-[#A855F7] transition-colors">
                      {proj.name}
                    </h4>
                    <p className="text-xs text-[#52525B] mt-0.5">
                      {new Date(proj.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer — compact, links only */}
      <footer className="px-4 py-3 text-center text-[11px] text-[#52525B] relative z-10" style={{ borderTop: '1px solid rgba(39, 39, 42, 0.3)' }}>
        <span>QUAR Editor v0.1.0 • MIT License</span>
        {' • '}
        <a href="https://github.com/FunwayHQ/quar-editor" className="text-[#71717A] hover:text-[#A1A1AA] transition-colors" target="_blank" rel="noopener noreferrer">GitHub</a>
        {' • '}
        <button onClick={() => setShowPrivacyPolicy(true)} className="text-[#71717A] hover:text-[#A1A1AA] transition-colors">Privacy</button>
        {' • '}
        <button onClick={() => setShowDataManagement((v) => !v)} className="text-[#71717A] hover:text-[#A1A1AA] transition-colors">Manage Data</button>
        {' • '}
        <button onClick={() => navigate('/help')} className="text-[#71717A] hover:text-[#A1A1AA] transition-colors">Help</button>
      </footer>

      {/* Data Management Drawer */}
      {showDataManagement && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-[480px] p-4 rounded-lg border border-[#27272A] shadow-xl" style={{ backgroundColor: 'rgba(24, 24, 27, 0.97)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#7C3AED]" />
              <h3 className="text-sm font-medium text-[#FAFAFA]">Manage Data</h3>
            </div>
            <button onClick={() => setShowDataManagement(false)} className="text-[#52525B] hover:text-[#A1A1AA] text-lg leading-none">&times;</button>
          </div>
          <p className="text-xs text-[#71717A] mb-3">All data is stored locally in your browser.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportAllData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#27272A] hover:bg-[#3f3f46] rounded transition-colors text-[#A1A1AA]">
              <FileDown className="w-3.5 h-3.5" /> Export All
            </button>
            <button onClick={handleClearProjects} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Clear Projects
            </button>
            <button onClick={handleClearPreferences} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded transition-colors">
              Reset Prefs
            </button>
            <button onClick={handleRevokeConsent} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A855F7] bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded transition-colors">
              <Shield className="w-3.5 h-3.5" /> Revoke Consent
            </button>
          </div>
        </div>
      )}

      {showPrivacyPolicy && (
        <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
