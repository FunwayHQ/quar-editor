/**
 * Polygon Editing Types
 *
 * Type definitions for polygon-based editing.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { Vector3 } from 'three';

// Selection modes
export type SelectionMode = 'vertex' | 'edge' | 'face';

// Edge identifier (two vertex indices)
export interface Edge {
  v1: number;
  v2: number;
}

// Transform data for edit mode operations
export interface EditModeTransform {
  type: 'translate' | 'rotate' | 'scale';
  delta: Vector3;
  space: 'local' | 'world';
}

// Extrude operation parameters
export interface ExtrudeParams {
  distance: number;
  segments?: number;
}

// Edit operation result
export interface EditOperationResult {
  success: boolean;
  error?: string;
  modifiedVertices?: number[];
  modifiedFaces?: number[];
}
