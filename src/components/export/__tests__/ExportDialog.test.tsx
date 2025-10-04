/**
 * Export Dialog Tests
 *
 * Tests for export UI component.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { describe, test, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportDialog } from '../ExportDialog';
import { useExportStore } from '../../../stores/exportStore';
import { useObjectsStore } from '../../../stores/objectsStore';
import { useToastStore } from '../../../stores/toastStore';

// Mock createPortal to render in place instead of document.body
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: any) => children,
  };
});

describe('ExportDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    // Reset stores
    useExportStore.setState({
      options: {
        format: 'glb',
        includeAnimations: true,
        includeMaterials: true,
        embedTextures: true,
        exportSelectionOnly: false,
        binary: true,
      },
      progress: {
        isExporting: false,
        progress: 0,
        currentStep: '',
        error: null,
      },
    });

    useObjectsStore.setState({ objects: new Map(), selectedIds: [] });
    useToastStore.setState({ toasts: [] });

    // Create a test object
    useObjectsStore.getState().createPrimitive('box', [0, 0, 0]);

    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render export dialog', () => {
      render(<ExportDialog onClose={mockOnClose} />);
      expect(screen.getAllByText('Export Scene')[0]).toBeInTheDocument();
    });

    test('should render all format options', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      expect(screen.getByText('GLB (Binary)')).toBeInTheDocument();
      expect(screen.getByText('GLTF (JSON)')).toBeInTheDocument();
      // FBX removed - not supported in browser
      expect(screen.getByText('OBJ')).toBeInTheDocument();
      expect(screen.getByText('USDZ')).toBeInTheDocument();
    });

    test('should render export options checkboxes', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      expect(screen.getByText('Include Animations')).toBeInTheDocument();
      expect(screen.getByText('Include Materials')).toBeInTheDocument();
      expect(screen.getByText('Embed Textures')).toBeInTheDocument();
      expect(screen.getByText('Export Selection Only')).toBeInTheDocument();
    });

    test('should show object count', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      expect(screen.getByText(/Objects:/)).toBeInTheDocument();
      expect(screen.getByText(/1/)).toBeInTheDocument(); // 1 object created
    });
  });

  describe('Format Selection', () => {
    test('should select GLB format', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      const glbButton = screen.getByText('GLB (Binary)').closest('button');
      fireEvent.click(glbButton!);

      expect(useExportStore.getState().options.format).toBe('glb');
    });

    test('should select GLTF format', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      const gltfButton = screen.getByText('GLTF (JSON)').closest('button');
      fireEvent.click(gltfButton!);

      expect(useExportStore.getState().options.format).toBe('gltf');
      expect(useExportStore.getState().options.binary).toBe(false);
    });

    test('should select OBJ format', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      const objButton = screen.getByText('OBJ').closest('button');
      fireEvent.click(objButton!);

      expect(useExportStore.getState().options.format).toBe('obj');
    });
  });

  describe('Options Toggling', () => {
    test('should toggle includeAnimations', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      const checkbox = screen.getByText('Include Animations')
        .closest('label')
        ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(checkbox.checked).toBe(true);

      fireEvent.click(checkbox);
      expect(useExportStore.getState().options.includeAnimations).toBe(false);
    });

    test('should toggle includeMaterials', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      const checkbox = screen.getByText('Include Materials')
        .closest('label')
        ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      fireEvent.click(checkbox);
      expect(useExportStore.getState().options.includeMaterials).toBe(false);
    });

    test('should disable animations for OBJ format', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      // Switch to OBJ
      const objButton = screen.getByText('OBJ').closest('button');
      fireEvent.click(objButton!);

      const checkbox = screen.getByText('Include Animations')
        .closest('label')
        ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(checkbox.disabled).toBe(true);
    });

    test('should disable embed textures when materials disabled', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      // Disable materials first
      const materialsCheckbox = screen.getByText('Include Materials')
        .closest('label')
        ?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      fireEvent.click(materialsCheckbox);

      const texturesCheckbox = screen.getByText('Embed Textures')
        .closest('label')
        ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(texturesCheckbox.disabled).toBe(true);
    });
  });

  describe('Filename Input', () => {
    test('should allow changing filename', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText('scene') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'my-model' } });

      expect(input.value).toBe('my-model');
    });

    test('should show correct file extension', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      expect(screen.getByText('.glb')).toBeInTheDocument();

      // Change format
      const gltfButton = screen.getByText('GLTF (JSON)').closest('button');
      fireEvent.click(gltfButton!);

      expect(screen.getByText('.gltf')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    test('should call onClose when cancel clicked', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should call onClose when X clicked', () => {
      render(<ExportDialog onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should disable close during export', () => {
      useExportStore.setState({
        progress: {
          isExporting: true,
          progress: 50,
          currentStep: 'Exporting...',
          error: null,
        },
      });

      render(<ExportDialog onClose={mockOnClose} />);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Progress Display', () => {
    test('should show progress bar during export', () => {
      useExportStore.setState({
        progress: {
          isExporting: true,
          progress: 65,
          currentStep: 'Converting to GLTF...',
          error: null,
        },
      });

      render(<ExportDialog onClose={mockOnClose} />);

      expect(screen.getByText('Converting to GLTF...')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    test('should hide options during export', () => {
      useExportStore.setState({
        progress: {
          isExporting: true,
          progress: 50,
          currentStep: 'Exporting...',
          error: null,
        },
      });

      render(<ExportDialog onClose={mockOnClose} />);

      expect(screen.queryByText('Format')).not.toBeInTheDocument();
      expect(screen.queryByText('Options')).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    test('should show error message when export fails', () => {
      useExportStore.setState({
        progress: {
          isExporting: false,
          progress: 0,
          currentStep: '',
          error: 'Export failed: invalid geometry',
        },
      });

      render(<ExportDialog onClose={mockOnClose} />);

      expect(screen.getByText('Export failed: invalid geometry')).toBeInTheDocument();
    });
  });
});
