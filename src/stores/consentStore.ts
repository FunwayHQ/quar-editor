/**
 * Consent Store
 *
 * Tracks GDPR consent for local storage usage.
 * QUAR Editor stores data 100% locally — no analytics, cookies, or tracking.
 * This store manages user awareness and control over what gets persisted.
 */

import { create } from 'zustand';

const CONSENT_KEY = 'quar-consent';
const CONSENT_VERSION = 1;

export interface ConsentData {
  granted: boolean;
  categories: {
    necessary: true; // Always true — IndexedDB for projects
    preferences: boolean; // Theme, layout persistence in localStorage
  };
  timestamp: string;
  version: number;
}

interface ConsentStore {
  // State
  hasConsented: boolean;
  preferencesConsented: boolean;

  // Actions
  grantAll: () => void;
  grantNecessaryOnly: () => void;
  revokeConsent: () => void;
  loadConsent: () => void;
}

function saveConsent(data: ConsentData) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable — consent works in-memory only
  }
}

function loadConsentFromStorage(): ConsentData | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ConsentData;
    if (data.version !== CONSENT_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

function clearConsentFromStorage() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // ignore
  }
}

const initial = loadConsentFromStorage();

export const useConsentStore = create<ConsentStore>((set) => ({
  hasConsented: initial?.granted ?? false,
  preferencesConsented: initial?.categories.preferences ?? false,

  grantAll: () => {
    const data: ConsentData = {
      granted: true,
      categories: { necessary: true, preferences: true },
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    saveConsent(data);
    set({ hasConsented: true, preferencesConsented: true });
  },

  grantNecessaryOnly: () => {
    const data: ConsentData = {
      granted: true,
      categories: { necessary: true, preferences: false },
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    saveConsent(data);
    set({ hasConsented: true, preferencesConsented: false });
    // Clear any previously persisted preferences
    try {
      localStorage.removeItem('quar-app-storage');
    } catch {
      // ignore
    }
  },

  revokeConsent: () => {
    clearConsentFromStorage();
    set({ hasConsented: false, preferencesConsented: false });
  },

  loadConsent: () => {
    const data = loadConsentFromStorage();
    set({
      hasConsented: data?.granted ?? false,
      preferencesConsented: data?.categories.preferences ?? false,
    });
  },
}));
