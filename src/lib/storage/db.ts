/**
 * IndexedDB Database Schema using Dexie.js
 *
 * This is the local storage layer for the open-source version.
 * All scene data, projects, and assets are stored here.
 */

import Dexie, { Table } from 'dexie';

// Database version from environment or default
const DB_NAME = import.meta.env.VITE_INDEXEDDB_NAME || 'quar_editor_db';
const DB_VERSION = Number(import.meta.env.VITE_INDEXEDDB_VERSION) || 1;

// Type definitions for database tables
export interface Project {
  id?: string;
  name: string;
  thumbnail?: string; // Base64 encoded image
  sceneData: string; // JSON stringified scene
  created: Date;
  lastModified: Date;
}

export interface Asset {
  id?: string;
  projectId: string;
  type: 'texture' | 'model' | 'audio';
  name: string;
  blob: Blob;
  created: Date;
}

export interface Preference {
  key: string;
  value: string; // JSON stringified value
}

// Database class
export class QuarEditorDB extends Dexie {
  projects!: Table<Project, string>;
  assets!: Table<Asset, string>;
  preferences!: Table<Preference, string>;

  constructor() {
    super(DB_NAME);

    this.version(DB_VERSION).stores({
      projects: 'id, name, lastModified',
      assets: 'id, projectId, type',
      preferences: 'key'
    });
  }
}

// Singleton instance
export const db = new QuarEditorDB();

// Initialize database and set default preferences
export async function initializeDatabase(): Promise<void> {
  try {
    await db.open();
    console.log('[DB] IndexedDB initialized:', DB_NAME);

    // Check if this is first run
    const prefCount = await db.preferences.count();
    if (prefCount === 0) {
      // Set default preferences
      await db.preferences.bulkAdd([
        { key: 'theme', value: JSON.stringify('dark') },
        { key: 'workspaceLayout', value: JSON.stringify('default') },
        { key: 'gridSize', value: JSON.stringify(1) },
        { key: 'autoSaveInterval', value: JSON.stringify(30000) }, // 30 seconds
      ]);
      console.log('[DB] Default preferences set');
    }
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    throw new Error('Database initialization failed');
  }
}

// Helper functions
export async function getProjectCount(): Promise<number> {
  return await db.projects.count();
}

export async function getAssetCount(): Promise<number> {
  return await db.assets.count();
}

export async function clearAllData(): Promise<void> {
  await db.projects.clear();
  await db.assets.clear();
  console.log('[DB] All project data cleared');
}
