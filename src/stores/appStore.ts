/**
 * Application Store
 *
 * Global application state including theme, preferences, and UI state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppState {
  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  propertiesPanelOpen: boolean;
  setPropertiesPanelOpen: (open: boolean) => void;

  timelinePanelOpen: boolean;
  setTimelinePanelOpen: (open: boolean) => void;

  // Workspace layout
  workspaceLayout: 'modeling' | 'animation' | 'lighting' | 'texturing';
  setWorkspaceLayout: (layout: AppState['workspaceLayout']) => void;

  // Status
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;

  lastSaveTime: Date | null;
  setLastSaveTime: (time: Date) => void;

  // Auto-save settings
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // milliseconds
  setAutoSaveInterval: (interval: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // UI State
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      propertiesPanelOpen: true,
      setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),

      timelinePanelOpen: false,
      setTimelinePanelOpen: (open) => set({ timelinePanelOpen: open }),

      // Workspace
      workspaceLayout: 'modeling',
      setWorkspaceLayout: (layout) => set({ workspaceLayout: layout }),

      // Status
      isOffline: !navigator.onLine,
      setIsOffline: (offline) => set({ isOffline: offline }),

      lastSaveTime: null,
      setLastSaveTime: (time) => set({ lastSaveTime: time }),

      // Auto-save
      autoSaveEnabled: true,
      autoSaveInterval: 30000, // 30 seconds
      setAutoSaveInterval: (interval) => set({ autoSaveInterval: interval }),
    }),
    {
      name: 'quar-app-storage', // LocalStorage key
      partialize: (state) => ({
        theme: state.theme,
        workspaceLayout: state.workspaceLayout,
        autoSaveInterval: state.autoSaveInterval,
      }),
    }
  )
);
