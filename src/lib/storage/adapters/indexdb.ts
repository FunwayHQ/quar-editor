/**
 * IndexedDB Storage Adapter
 *
 * This adapter implements local-first storage using IndexedDB.
 * Used by the open-source version of QUAR Editor.
 */

import { db } from '../db';
import { IStorageAdapter, ProjectData, AssetData } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class IndexedDBAdapter implements IStorageAdapter {
  async getProjects(): Promise<ProjectData[]> {
    const projects = await db.projects.orderBy('lastModified').reverse().toArray();

    return projects.map(p => ({
      id: p.id!,
      name: p.name,
      thumbnail: p.thumbnail,
      sceneData: JSON.parse(p.sceneData),
      created: p.created,
      lastModified: p.lastModified
    }));
  }

  async getProject(id: string): Promise<ProjectData | null> {
    const project = await db.projects.get(id);

    if (!project) return null;

    return {
      id: project.id!,
      name: project.name,
      thumbnail: project.thumbnail,
      sceneData: JSON.parse(project.sceneData),
      created: project.created,
      lastModified: project.lastModified
    };
  }

  async saveProject(project: ProjectData): Promise<void> {
    const id = project.id || uuidv4();

    await db.projects.put({
      id,
      name: project.name,
      thumbnail: project.thumbnail,
      sceneData: JSON.stringify(project.sceneData),
      created: project.created || new Date(),
      lastModified: new Date()
    });

    console.log(`[IndexedDB] Project saved: ${id}`);
  }

  async deleteProject(id: string): Promise<void> {
    // Delete project
    await db.projects.delete(id);

    // Delete all associated assets
    const assets = await db.assets.where('projectId').equals(id).toArray();
    const assetIds = assets.map(a => a.id!);
    await db.assets.bulkDelete(assetIds);

    console.log(`[IndexedDB] Project deleted: ${id} (${assetIds.length} assets removed)`);
  }

  async getAsset(id: string): Promise<AssetData | null> {
    const asset = await db.assets.get(id);

    if (!asset) return null;

    return {
      id: asset.id!,
      projectId: asset.projectId,
      type: asset.type,
      name: asset.name,
      data: asset.blob
    };
  }

  async saveAsset(asset: AssetData): Promise<void> {
    const id = asset.id || uuidv4();

    await db.assets.put({
      id,
      projectId: asset.projectId,
      type: asset.type,
      name: asset.name,
      blob: asset.data as Blob,
      created: new Date()
    });

    console.log(`[IndexedDB] Asset saved: ${id}`);
  }

  async deleteAsset(id: string): Promise<void> {
    await db.assets.delete(id);
    console.log(`[IndexedDB] Asset deleted: ${id}`);
  }

  async getProjectAssets(projectId: string): Promise<AssetData[]> {
    const assets = await db.assets.where('projectId').equals(projectId).toArray();

    return assets.map(a => ({
      id: a.id!,
      projectId: a.projectId,
      type: a.type,
      name: a.name,
      data: a.blob
    }));
  }

  async getPreference(key: string): Promise<string | null> {
    const pref = await db.preferences.get(key);
    return pref ? pref.value : null;
  }

  async setPreference(key: string, value: string): Promise<void> {
    await db.preferences.put({ key, value });
    console.log(`[IndexedDB] Preference set: ${key}`);
  }

  async clearAll(): Promise<void> {
    await db.projects.clear();
    await db.assets.clear();
    console.log('[IndexedDB] All data cleared');
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

// Export singleton instance
export const indexedDBAdapter = new IndexedDBAdapter();
