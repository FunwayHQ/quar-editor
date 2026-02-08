/**
 * Application Store
 *
 * Global application state including theme, preferences, and UI state.
 */

import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';
import { useConsentStore } from './consentStore';

// Custom storage that checks consent before persisting preferences
const consentAwareStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    // Only persist if user has consented to preferences
    if (useConsentStore.getState().preferencesConsented) {
      try {
        localStorage.setItem(name, value);
      } catch {
        // localStorage full or unavailable
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

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
      storage: consentAwareStorage,
      partialize: (state) => ({
        theme: state.theme,
        workspaceLayout: state.workspaceLayout,
        autoSaveInterval: state.autoSaveInterval,
      }),
    }
  )
);

// Monitor online/offline status at the module level (once only)
if (typeof window !== 'undefined' && !(window as any).__quarOnlineListenersRegistered) {
  (window as any).__quarOnlineListenersRegistered = true;
  window.addEventListener('online', () => useAppStore.getState().setIsOffline(false));
  window.addEventListener('offline', () => useAppStore.getState().setIsOffline(true));
}
