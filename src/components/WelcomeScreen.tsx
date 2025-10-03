/**
 * Welcome Screen Component
 *
 * Shows project list and allows creating/opening projects.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, Download } from 'lucide-react';
import { getStorageAdapter, ProjectData } from '../lib/storage';
import { useAppStore } from '../stores/appStore';
import { v4 as uuidv4 } from 'uuid';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { isOffline } = useAppStore();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  const storage = getStorageAdapter();

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-dark.svg" alt="QUAR Editor" className="h-12" />
            {isOffline && (
              <span className="text-sm text-text-secondary px-2 py-1 bg-panel rounded">
                Offline Mode
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Your Projects</h2>
          <p className="text-text-secondary">
            All projects are stored locally on your device
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={createNewProject}
            className="glass p-6 hover:bg-opacity-90 transition-all flex flex-col items-center justify-center gap-3 min-h-[200px] group"
          >
            <Plus className="w-12 h-12 text-accent group-hover:scale-110 transition-transform" />
            <span className="font-medium">New Project</span>
            <span className="text-sm text-text-secondary">Start from scratch</span>
          </button>

          <label className="glass p-6 hover:bg-opacity-90 transition-all flex flex-col items-center justify-center gap-3 min-h-[200px] cursor-pointer group">
            <input
              type="file"
              accept=".quar"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Download className="w-12 h-12 text-accent group-hover:scale-110 transition-transform" />
            <span className="font-medium">Open .quar File</span>
            <span className="text-sm text-text-secondary">Import from file</span>
          </label>

          <div className="glass p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] opacity-50">
            <Folder className="w-12 h-12 text-text-secondary" />
            <span className="font-medium">Sample Projects</span>
            <span className="text-sm text-text-secondary">Coming soon</span>
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Recent Projects</h3>

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
                  className="glass p-4 hover:bg-opacity-90 transition-all text-left group"
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border p-6 text-center text-text-secondary text-sm">
        <p>
          QUAR Editor Open Source v0.1.0 • MIT License •{' '}
          <a
            href="https://github.com/quarteam/quar-editor"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
