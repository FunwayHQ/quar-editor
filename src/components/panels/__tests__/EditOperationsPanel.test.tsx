/**
 * Edit Operations Panel Tests
 *
 * Tests for the edit operations UI panel.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { EditOperationsPanel } from '../EditOperationsPanel';

// Mock stores
const mockEditModeStore = {
  isEditMode: true,
  editingObjectId: 'obj-1',
  selectionMode: 'face' as const,
  selectedVertices: new Set(),
  selectedEdges: new Set(),
  selectedFaces: new Set(['f_0', 'f_1']),
  hasSelection: vi.fn(() => true),
};

vi.mock('../../../stores/editModeStore', () => ({
  useEditModeStore: () => mockEditModeStore,
}));

vi.mock('../../../stores/objectsStore', () => ({
  useObjectsStore: () => ({
    objects: new Map([
      ['obj-1', { id: 'obj-1', name: 'Test Object', type: 'primitive' }],
    ]),
    transformMode: 'translate',
    setTransformMode: vi.fn(),
  }),
}));

vi.mock('../../../stores/commandStore', () => ({
  useCommandStore: () => ({
    executeCommand: vi.fn(),
  }),
}));

// Mock MeshOperations
vi.mock('../../../lib/mesh/MeshOperations', () => ({
  MeshOperations: {
    extrudeFaces: vi.fn(),
    insetFaces: vi.fn(),
    subdivideFaces: vi.fn(),
  },
}));

// Mock MeshRegistry with proper Three.js-like geometry
const createMockGeometry = () => {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  return geo;
};

const mockMesh = {
  geometry: createMockGeometry(),
};

vi.mock('../../../lib/mesh/MeshRegistry', () => ({
  meshRegistry: {
    getMesh: vi.fn(() => mockMesh),
    registerMesh: vi.fn(),
    unregisterMesh: vi.fn(),
  },
}));

// Mock EditCommands
vi.mock('../../../lib/commands/EditCommands', () => ({
  ExtrudeFacesCommand: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  })),
  InsetFacesCommand: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  })),
}));

describe('EditOperationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default store values
    mockEditModeStore.isEditMode = true;
    mockEditModeStore.editingObjectId = 'obj-1';
    mockEditModeStore.selectionMode = 'face';
    mockEditModeStore.selectedVertices = new Set();
    mockEditModeStore.selectedEdges = new Set();
    mockEditModeStore.selectedFaces = new Set(['f_0', 'f_1']);
    // Fix hasSelection to return true when faces are selected
    mockEditModeStore.hasSelection = vi.fn(() => mockEditModeStore.selectedFaces.size > 0 || mockEditModeStore.selectedVertices.size > 0 || mockEditModeStore.selectedEdges.size > 0);
  });

  it('renders when in edit mode with face selection', () => {
    render(<EditOperationsPanel />);

    expect(screen.getByText(/Edit Operations/)).toBeInTheDocument();
    expect(screen.getByText('Extrude')).toBeInTheDocument();
    expect(screen.getByText('Inset')).toBeInTheDocument();
    expect(screen.getByText('Subdivide')).toBeInTheDocument();
  });

  it('does not render when not in edit mode', () => {
    mockEditModeStore.isEditMode = false;
    render(<EditOperationsPanel />);

    expect(screen.queryByText('Edit Operations')).not.toBeInTheDocument();
  });

  it('does not render without editing object', () => {
    mockEditModeStore.editingObjectId = null;
    render(<EditOperationsPanel />);

    expect(screen.queryByText('Edit Operations')).not.toBeInTheDocument();
  });

  it('displays selection mode and count', () => {
    render(<EditOperationsPanel />);

    expect(screen.getByText(/Mode: face/)).toBeInTheDocument();
    expect(screen.getByText(/Selected: 2/)).toBeInTheDocument();
  });

  it('updates extrude distance with slider', () => {
    render(<EditOperationsPanel />);

    const slider = screen.getAllByRole('slider')[0];
    fireEvent.change(slider, { target: { value: '2.5' } });

    const input = screen.getAllByRole('spinbutton')[0] as HTMLInputElement;
    expect(input.value).toBe('2.5');
  });

  it('updates extrude distance with input', () => {
    render(<EditOperationsPanel />);

    const input = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(input, { target: { value: '3' } });

    expect((input as HTMLInputElement).value).toBe('3');
  });

  it('has extrude apply button', () => {
    render(<EditOperationsPanel />);

    const applyButtons = screen.getAllByText('Apply');
    expect(applyButtons.length).toBeGreaterThanOrEqual(1);
    expect(applyButtons[0]).toBeInTheDocument();
  });

  it('does not render without selection', async () => {
    mockEditModeStore.selectedFaces = new Set();
    mockEditModeStore.selectedVertices = new Set();
    mockEditModeStore.hasSelection = vi.fn(() => false);

    await act(async () => {
      render(<EditOperationsPanel />);
    });

    // Panel should not render without selection
    expect(screen.queryByText('Edit Operations')).not.toBeInTheDocument();
  });

  it('renders all operation controls in face mode', async () => {
    await act(async () => {
      render(<EditOperationsPanel />);
    });

    // Should render all three operations
    expect(screen.getByText('Inset')).toBeInTheDocument();
    expect(screen.getByText('Subdivide')).toBeInTheDocument();
  });

  it('shows transform tools when in vertex mode', async () => {
    mockEditModeStore.selectionMode = 'vertex';
    mockEditModeStore.selectedVertices = new Set([0]);
    mockEditModeStore.selectedFaces = new Set();

    await act(async () => {
      render(<EditOperationsPanel />);
    });

    // Should show transform tools
    expect(screen.getByText('Move Tool')).toBeInTheDocument();
    expect(screen.getByText('Rotate Tool')).toBeInTheDocument();
    expect(screen.getByText('Scale Tool')).toBeInTheDocument();
  });
});