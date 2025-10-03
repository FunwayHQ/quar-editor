/**
 * Storage Adapter Factory
 *
 * Returns the appropriate storage adapter based on environment configuration.
 * OSS version always uses IndexedDB adapter.
 * Cloud version uses API adapter when VITE_CLOUD_ENABLED=true.
 */

import { IStorageAdapter } from './types';
import { indexedDBAdapter } from './adapters/indexdb';

const CLOUD_ENABLED = import.meta.env.VITE_CLOUD_ENABLED === 'true';

/**
 * Get the appropriate storage adapter
 */
export function getStorageAdapter(): IStorageAdapter {
  if (CLOUD_ENABLED) {
    // In cloud version, we would import and return apiAdapter here
    // For OSS version, this will never be true
    throw new Error('Cloud adapter not available in open-source version');
  }

  return indexedDBAdapter;
}

// Re-export types and utilities
export * from './types';
export * from './db';
export { indexedDBAdapter };
