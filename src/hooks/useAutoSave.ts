/**
 * useAutoSave Hook
 *
 * Custom hook for auto-saving project data at regular intervals.
 * Handles serialization and storage operations separately from the Editor component.
 */

import { useEffect } from 'react';
import { getStorageAdapter, ProjectData } from '../lib/storage';
import { serializeScene } from '../services/sceneSerializer';
import { useAppStore } from '../stores/appStore';

interface UseAutoSaveOptions {
  project: ProjectData | null;
  interval?: number; // Auto-save interval in milliseconds
  onSaveSuccess?: (project: ProjectData) => void;
  onSaveError?: (error: Error) => void;
}

/**
 * Hook to auto-save project at regular intervals
 */
export function useAutoSave({
  project,
  interval = 30000, // Default: 30 seconds
  onSaveSuccess,
  onSaveError,
}: UseAutoSaveOptions) {
  const storage = getStorageAdapter();
  const setLastSaveTime = useAppStore((state) => state.setLastSaveTime);

  useEffect(() => {
    if (!project) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        const sceneData = serializeScene();

        const updatedProject = {
          ...project,
          sceneData,
          lastModified: new Date(),
        };

        await storage.saveProject(updatedProject);
        setLastSaveTime(new Date());

        console.log('[useAutoSave] Auto-save completed');
        onSaveSuccess?.(updatedProject);

        // Silent auto-save - no toast notification to avoid spam
      } catch (err) {
        console.error('[useAutoSave] Auto-save failed:', err);
        onSaveError?.(err as Error);
      }
    }, interval);

    return () => clearInterval(autoSaveInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- storage and setLastSaveTime are stable refs
  }, [project, interval, onSaveSuccess, onSaveError]);
}
