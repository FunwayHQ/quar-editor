/**
 * IndexedDB Adapter Tests
 *
 * Tests for the IndexedDB storage adapter.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IndexedDBAdapter } from '../adapters/indexdb';
import type { ProjectData } from '../types';

// Mock the Dexie database
vi.mock('../db', () => ({
  db: {
    projects: {
      orderBy: vi.fn().mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
    assets: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      bulkDelete: vi.fn(),
    },
    preferences: {
      get: vi.fn(),
      put: vi.fn(),
    },
  },
}));

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(() => {
    adapter = new IndexedDBAdapter();
    vi.clearAllMocks();
  });

  describe('Projects', () => {
    it('should get all projects', async () => {
      const projects = await adapter.getProjects();
      expect(Array.isArray(projects)).toBe(true);
    });

    it('should get a single project', async () => {
      const projectData: ProjectData = {
        id: 'test-id',
        name: 'Test Project',
        sceneData: { objects: [] },
        created: new Date(),
        lastModified: new Date(),
      };

      const { db } = await import('../db');
      (db.projects.get as any).mockResolvedValueOnce({
        id: projectData.id,
        name: projectData.name,
        sceneData: JSON.stringify(projectData.sceneData),
        created: projectData.created,
        lastModified: projectData.lastModified,
      });

      const result = await adapter.getProject('test-id');

      expect(result).toBeTruthy();
      expect(result?.id).toBe('test-id');
      expect(result?.name).toBe('Test Project');
    });

    it('should return null for non-existent project', async () => {
      const { db } = await import('../db');
      (db.projects.get as any).mockResolvedValueOnce(undefined);

      const result = await adapter.getProject('non-existent');

      expect(result).toBeNull();
    });

    it('should save a project', async () => {
      const projectData: ProjectData = {
        id: 'test-id',
        name: 'Test Project',
        sceneData: { objects: [] },
        created: new Date(),
        lastModified: new Date(),
      };

      await adapter.saveProject(projectData);

      const { db } = await import('../db');
      expect(db.projects.put).toHaveBeenCalled();
    });

    it('should delete a project and its assets', async () => {
      const { db } = await import('../db');

      await adapter.deleteProject('test-id');

      expect(db.projects.delete).toHaveBeenCalledWith('test-id');
      expect(db.assets.bulkDelete).toHaveBeenCalled();
    });
  });

  describe('Preferences', () => {
    it('should get a preference', async () => {
      const { db } = await import('../db');
      (db.preferences.get as any).mockResolvedValueOnce({
        key: 'theme',
        value: JSON.stringify('dark'),
      });

      const result = await adapter.getPreference('theme');

      expect(result).toBe(JSON.stringify('dark'));
    });

    it('should set a preference', async () => {
      await adapter.setPreference('theme', JSON.stringify('dark'));

      const { db } = await import('../db');
      expect(db.preferences.put).toHaveBeenCalledWith({
        key: 'theme',
        value: JSON.stringify('dark'),
      });
    });

    it('should return null for non-existent preference', async () => {
      const { db } = await import('../db');
      (db.preferences.get as any).mockResolvedValueOnce(undefined);

      const result = await adapter.getPreference('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Online Status', () => {
    it('should return navigator.onLine status', () => {
      // navigator.onLine is mocked in test setup
      const status = adapter.isOnline();
      expect(typeof status).toBe('boolean');
    });
  });
});
