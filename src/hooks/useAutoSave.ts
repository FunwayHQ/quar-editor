/**
 * useAutoSave Hook
 *
 * Auto-saves project data:
 * 1. On store changes (debounced 3s) — catches every edit
 * 2. On interval (30s fallback) — catches anything missed
 * 3. On beforeunload — emergency save before page close/refresh
 */

import { useEffect, useRef, useCallback } from 'react';
import { getStorageAdapter, ProjectData } from '../lib/storage';
import { serializeScene } from '../services/sceneSerializer';
import { useAppStore } from '../stores/appStore';
import { useObjectsStore } from '../stores/objectsStore';
import { useMaterialsStore } from '../stores/materialsStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useAnimationStore } from '../stores/animationStore';

interface UseAutoSaveOptions {
  project: ProjectData | null;
  interval?: number;
  debounce?: number;
  onSaveSuccess?: (project: ProjectData) => void;
  onSaveError?: (error: Error) => void;
}

export function useAutoSave({
  project,
  interval = 30000,
  debounce = 3000,
  onSaveSuccess,
  onSaveError,
}: UseAutoSaveOptions) {
  const storage = getStorageAdapter();
  const setLastSaveTime = useAppStore((state) => state.setLastSaveTime);
  const projectRef = useRef(project);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // Keep project ref current
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const doSave = useCallback(async () => {
    const currentProject = projectRef.current;
    if (!currentProject || isSavingRef.current) return;

    isSavingRef.current = true;
    try {
      const sceneData = serializeScene();
      const updatedProject = {
        ...currentProject,
        sceneData,
        lastModified: new Date(),
      };

      await storage.saveProject(updatedProject);
      setLastSaveTime(new Date());
      console.log('[useAutoSave] Save completed');
      onSaveSuccess?.(updatedProject);
    } catch (err) {
      console.error('[useAutoSave] Save failed:', err);
      onSaveError?.(err as Error);
    } finally {
      isSavingRef.current = false;
    }
  }, [storage, setLastSaveTime, onSaveSuccess, onSaveError]);

  const debouncedSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      doSave();
    }, debounce);
  }, [doSave, debounce]);

  // Subscribe to store changes — debounced save on any edit
  useEffect(() => {
    if (!project) return;

    const unsubObjects = useObjectsStore.subscribe(debouncedSave);
    const unsubMaterials = useMaterialsStore.subscribe(debouncedSave);
    const unsubEnvironment = useEnvironmentStore.subscribe(debouncedSave);
    const unsubAnimations = useAnimationStore.subscribe(debouncedSave);

    return () => {
      unsubObjects();
      unsubMaterials();
      unsubEnvironment();
      unsubAnimations();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [project, debouncedSave]);

  // Interval fallback
  useEffect(() => {
    if (!project) return;

    const timer = setInterval(doSave, interval);
    return () => clearInterval(timer);
  }, [project, interval, doSave]);

  // Emergency save on page unload
  useEffect(() => {
    if (!project) return;

    const handleBeforeUnload = () => {
      // Cancel pending debounce and save immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Synchronous-ish save attempt — browsers give a brief window
      try {
        const sceneData = serializeScene();
        const updatedProject = {
          ...projectRef.current!,
          sceneData,
          lastModified: new Date(),
        };
        // Use sync-compatible storage write
        storage.saveProject(updatedProject);
        console.log('[useAutoSave] beforeunload save attempted');
      } catch (err) {
        console.error('[useAutoSave] beforeunload save failed:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [project, storage]);
}
