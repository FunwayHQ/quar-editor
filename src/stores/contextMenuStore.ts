/**
 * Context Menu Store
 *
 * Manages context menu state for right-click menus across the editor.
 */

import { create } from 'zustand';

export type ContextMenuContext =
  | 'viewport-empty'
  | 'viewport-object'
  | 'hierarchy'
  | 'hierarchy-empty'
  | 'animation-item'
  | 'timeline-track'
  | 'timeline-keyframe'
  | 'timeline-empty';

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  context: ContextMenuContext | null;
  targetId: string | null;
  metadata: Record<string, any> | null;
  showContextMenu: (x: number, y: number, context: ContextMenuContext, targetId?: string | null, metadata?: Record<string, any>) => void;
  hideContextMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  x: 0,
  y: 0,
  context: null,
  targetId: null,
  metadata: null,

  showContextMenu: (x, y, context, targetId, metadata) => {
    set({ isOpen: true, x, y, context, targetId: targetId ?? null, metadata: metadata ?? null });
  },

  hideContextMenu: () => {
    set({ isOpen: false, context: null, targetId: null, metadata: null });
  },
}));
