/**
 * Storage Adapter Interface
 *
 * This interface defines the contract for storage backends.
 * Both IndexedDB (OSS) and API (Cloud) adapters implement this.
 */

export interface ProjectData {
  id: string;
  name: string;
  thumbnail?: string;
  sceneData: object; // Scene JSON
  created: Date;
  lastModified: Date;
}

export interface AssetData {
  id: string;
  projectId: string;
  type: 'texture' | 'model' | 'audio';
  name: string;
  data: Blob | string; // Blob for IndexedDB, URL for API
}

export interface IStorageAdapter {
  // Projects
  getProjects(): Promise<ProjectData[]>;
  getProject(id: string): Promise<ProjectData | null>;
  saveProject(project: ProjectData): Promise<void>;
  deleteProject(id: string): Promise<void>;

  // Assets
  getAsset(id: string): Promise<AssetData | null>;
  saveAsset(asset: AssetData): Promise<void>;
  deleteAsset(id: string): Promise<void>;
  getProjectAssets(projectId: string): Promise<AssetData[]>;

  // Preferences
  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string): Promise<void>;

  // Utility
  clearAll(): Promise<void>;
  isOnline(): boolean;
}
