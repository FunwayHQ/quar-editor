/**
 * Modal Mode Store
 *
 * Manages modal interaction modes (Grab, Rotate, Scale) with axis constraints.
 * Sprint Y: Blender-standard shortcuts (G/R/S with X/Y/Z constraints)
 */

import { create } from 'zustand';

export type ModalMode = 'grab' | 'rotate' | 'scale' | null;
export type AxisConstraint = 'x' | 'y' | 'z' | null;

export interface ModalModeState {
  // Current modal mode
  mode: ModalMode;
  setMode: (mode: ModalMode) => void;

  // Axis constraint
  axisConstraint: AxisConstraint;
  setAxisConstraint: (axis: AxisConstraint) => void;

  // Enter/exit modal modes
  enterGrabMode: () => void;
  enterRotateMode: () => void;
  enterScaleMode: () => void;
  exitModalMode: () => void;

  // Confirm/cancel
  confirmOperation: () => void;
  cancelOperation: () => void;

  // UI state
  showAxisHint: boolean;
}

export const useModalModeStore = create<ModalModeState>((set) => ({
  // Initial state
  mode: null,
  axisConstraint: null,
  showAxisHint: false,

  // Mode management
  setMode: (mode) => set({ mode }),

  setAxisConstraint: (axis) => set({
    axisConstraint: axis,
    showAxisHint: axis !== null,
  }),

  // Enter modes
  enterGrabMode: () => set({
    mode: 'grab',
    axisConstraint: null,
    showAxisHint: true,
  }),

  enterRotateMode: () => set({
    mode: 'rotate',
    axisConstraint: null,
    showAxisHint: true,
  }),

  enterScaleMode: () => set({
    mode: 'scale',
    axisConstraint: null,
    showAxisHint: true,
  }),

  // Exit modal mode
  exitModalMode: () => set({
    mode: null,
    axisConstraint: null,
    showAxisHint: false,
  }),

  // Operations
  confirmOperation: () => set({
    mode: null,
    axisConstraint: null,
    showAxisHint: false,
  }),

  cancelOperation: () => set({
    mode: null,
    axisConstraint: null,
    showAxisHint: false,
  }),
}));
