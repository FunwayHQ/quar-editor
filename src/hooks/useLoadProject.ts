/**
 * useLoadProject Hook
 *
 * Custom hook for loading project data from storage and deserializing into stores.
 * Handles loading logic separately from the Editor component.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStorageAdapter, ProjectData } from '../lib/storage';
import { deserializeScene } from '../services/sceneSerializer';

interface UseLoadProjectOptions {
  projectId: string | undefined;
  onLoadStart?: () => void;
  onLoadComplete?: (project: ProjectData) => void;
  onLoadError?: (error: Error) => void;
}

/**
 * Hook to load a project and deserialize it into stores
 * Handles StrictMode double-mounting gracefully
 */
export function useLoadProject({
  projectId,
  onLoadStart,
  onLoadComplete,
  onLoadError,
}: UseLoadProjectOptions) {
  const navigate = useNavigate();
  const storage = getStorageAdapter();
  const loadedProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if no projectId or already loaded this project
    if (!projectId || loadedProjectIdRef.current === projectId) {
      return;
    }

    // Mark as loading
    loadedProjectIdRef.current = projectId;

    async function loadProject() {
      try {
        onLoadStart?.();

        const data = await storage.getProject(projectId!);

        if (!data) {
          throw new Error('Project not found');
        }

        // Deserialize scene data into stores
        if (data.sceneData) {
          deserializeScene(data.sceneData);
        }

        onLoadComplete?.(data);
      } catch (error) {
        console.error('[useLoadProject] Failed to load project:', error);
        onLoadError?.(error as Error);

        // Reset the ref so user can retry
        loadedProjectIdRef.current = null;

        // Navigate back to home on error
        navigate('/');
      }
    }

    loadProject();
  }, [projectId]); // Only re-run when projectId changes

  // Reset when projectId changes
  useEffect(() => {
    if (projectId !== loadedProjectIdRef.current) {
      loadedProjectIdRef.current = null;
    }
  }, [projectId]);
}
