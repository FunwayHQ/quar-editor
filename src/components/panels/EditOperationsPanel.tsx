/**
 * Edit Operations Panel Component
 *
 * Panel with mesh editing operations like extrude, inset, subdivide.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { useState, useEffect, useRef } from 'react';
import {
  Grid3x3,
  Settings2,
  ArrowUpFromLine,
  ArrowDownToLine,
  Eye,
  EyeOff
} from 'lucide-react';
import { useEditModeStore } from '../../stores/editModeStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { MeshOperations } from '../../lib/mesh/MeshOperations';
import { meshRegistry } from '../../lib/mesh/MeshRegistry';
import { ExtrudeFacesCommand, InsetFacesCommand } from '../../lib/commands/EditCommands';
import * as THREE from 'three';

export function EditOperationsPanel() {
  const {
    isEditMode,
    editingObjectId,
    selectionMode,
    selectedVertices,
    selectedEdges,
    selectedFaces,
    hasSelection,
  } = useEditModeStore();

  const { objects, transformMode, setTransformMode } = useObjectsStore();
  const { executeCommand } = useCommandStore();

  const [extrudeDistance, setExtrudeDistance] = useState(1.0);
  const [insetAmount, setInsetAmount] = useState(0.1);
  const [subdivisions, setSubdivisions] = useState(1);

  // Preview state
  const [previewMode, setPreviewMode] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [activeOperation, setActiveOperation] = useState<'extrude' | 'inset' | null>(null);

  // Store original geometry for preview
  const originalGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const lastPreviewValuesRef = useRef({ extrudeDistance: 1.0, insetAmount: 0.1 });

  // Helper function to store original geometry
  const storeOriginalGeometry = () => {
    if (!editingObjectId) return;
    const mesh = meshRegistry.getMesh(editingObjectId);
    if (mesh && mesh.geometry && !originalGeometryRef.current) {
      originalGeometryRef.current = mesh.geometry.clone();
    }
  };

  // Helper function to restore original geometry
  const restoreOriginalGeometry = () => {
    if (!editingObjectId) return;
    const mesh = meshRegistry.getMesh(editingObjectId);
    if (mesh && originalGeometryRef.current) {
      // Copy attributes from original back to current
      const original = originalGeometryRef.current;
      mesh.geometry.setAttribute('position', original.attributes.position.clone());
      if (original.attributes.normal) {
        mesh.geometry.setAttribute('normal', original.attributes.normal.clone());
      }
      if (original.attributes.uv) {
        mesh.geometry.setAttribute('uv', original.attributes.uv.clone());
      }
      mesh.geometry.setIndex(original.index ? original.index.clone() : null);
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    }
  };

  // Preview effect for extrude
  useEffect(() => {
    if (!previewMode || activeOperation !== 'extrude' || !isPreviewing) return;
    if (selectionMode !== 'face' || selectedFaces.size === 0) return;
    if (!editingObjectId) return;

    const mesh = meshRegistry.getMesh(editingObjectId);
    if (!mesh || !mesh.geometry) return;

    // Store original geometry if not stored
    storeOriginalGeometry();

    // Restore to original state before applying preview
    restoreOriginalGeometry();

    // Apply preview operation
    // Note: Preview mode uses deprecated numeric face indices
    // Convert QMesh face IDs (f_0, f_1, etc.) to indices by extracting the number
    const faceIndices = new Set<number>();
    selectedFaces.forEach(faceId => {
      const match = faceId.match(/f_(\d+)/);
      if (match) {
        faceIndices.add(parseInt(match[1], 10));
      }
    });

    if (mesh && mesh.geometry && faceIndices.size > 0) {
      MeshOperations.extrudeFaces(
        mesh.geometry,
        faceIndices,
        { distance: extrudeDistance }
      );
    }

    lastPreviewValuesRef.current.extrudeDistance = extrudeDistance;
  }, [extrudeDistance, activeOperation, isPreviewing, previewMode, editingObjectId, selectedFaces, selectionMode]);

  // Preview effect for inset
  useEffect(() => {
    if (!previewMode || activeOperation !== 'inset' || !isPreviewing) return;
    if (selectionMode !== 'face' || selectedFaces.size === 0) return;
    if (!editingObjectId) return;

    const mesh = meshRegistry.getMesh(editingObjectId);
    if (!mesh || !mesh.geometry) return;

    // Store original geometry if not stored
    storeOriginalGeometry();

    // Restore to original state before applying preview
    restoreOriginalGeometry();

    // Apply preview operation
    // Convert QMesh face IDs to numeric indices
    const faceIndices = new Set<number>();
    selectedFaces.forEach(faceId => {
      const match = faceId.match(/f_(\d+)/);
      if (match) {
        faceIndices.add(parseInt(match[1], 10));
      }
    });

    if (mesh && mesh.geometry && faceIndices.size > 0) {
      MeshOperations.insetFaces(
        mesh.geometry,
        faceIndices,
        insetAmount
      );
    }

    lastPreviewValuesRef.current.insetAmount = insetAmount;
  }, [insetAmount, activeOperation, isPreviewing, previewMode, editingObjectId, selectedFaces, selectionMode]);

  // Clean up preview when operation changes or component unmounts
  useEffect(() => {
    return () => {
      if (isPreviewing) {
        restoreOriginalGeometry();
        originalGeometryRef.current = null;
      }
    };
  }, [activeOperation]);

  // Only show in edit mode
  if (!isEditMode || !editingObjectId) return null;

  const editingObject = objects.get(editingObjectId);
  if (!editingObject) return null;

  const handleExtrude = () => {
    if (selectionMode !== 'face' || selectedFaces.size === 0) {
      console.warn('Extrude requires face selection');
      return;
    }

    // Get the mesh from registry
    const mesh = meshRegistry.getMesh(editingObjectId);
    if (!mesh || !mesh.geometry) {
      console.warn('Mesh not found in registry');
      return;
    }

    // If we were previewing, the operation is already applied
    // We need to create a command that can undo back to the original
    if (isPreviewing && originalGeometryRef.current) {
      // The geometry is already modified, so we create a command
      // that knows how to undo to the original state
      const command = new ExtrudeFacesCommand(
        editingObjectId,
        selectedFaces,
        extrudeDistance
      );

      // Store the original geometry in the command for undo
      const originalGeo = originalGeometryRef.current;
      command.undo = () => {
        const m = meshRegistry.getMesh(editingObjectId);
        if (m) {
          m.geometry.dispose();
          m.geometry = originalGeo.clone();
        }
      };

      // Store current geometry for redo
      const currentGeo = mesh.geometry.clone();
      command.redo = () => {
        const m = meshRegistry.getMesh(editingObjectId);
        if (m) {
          m.geometry.dispose();
          m.geometry = currentGeo.clone();
        }
      };

      // No-op execute since already applied
      command.execute = () => {};

      executeCommand(command);

      // Clear the original geometry reference
      originalGeometryRef.current = null;
      setIsPreviewing(false);
      setActiveOperation(null);
    } else {
      // Apply operation without preview using command
      const command = new ExtrudeFacesCommand(
        editingObjectId,
        selectedFaces,
        extrudeDistance
      );
      executeCommand(command);
    }

    console.log('Extruded', selectedFaces.size, 'faces');
  };

  const handleExtrudePreviewStart = () => {
    if (previewMode && selectionMode === 'face' && selectedFaces.size > 0) {
      setActiveOperation('extrude');
      setIsPreviewing(true);
    }
  };

  const handleExtrudeChange = (value: number) => {
    setExtrudeDistance(value);
    if (!isPreviewing && previewMode) {
      handleExtrudePreviewStart();
    }
  };

  const handleInset = () => {
    if (selectionMode !== 'face' || selectedFaces.size === 0) {
      console.warn('Inset requires face selection');
      return;
    }

    // Get the mesh from registry
    const mesh = meshRegistry.getMesh(editingObjectId);
    if (!mesh || !mesh.geometry) {
      console.warn('Mesh not found in registry');
      return;
    }

    // If we were previewing, the operation is already applied
    // We need to create a command that can undo back to the original
    if (isPreviewing && originalGeometryRef.current) {
      // The geometry is already modified, so we create a command
      // that knows how to undo to the original state
      const command = new InsetFacesCommand(
        editingObjectId,
        selectedFaces,
        insetAmount
      );

      // Store the original geometry in the command for undo
      const originalGeo = originalGeometryRef.current;
      command.undo = () => {
        const m = meshRegistry.getMesh(editingObjectId);
        if (m) {
          m.geometry.dispose();
          m.geometry = originalGeo.clone();
        }
      };

      // Store current geometry for redo
      const currentGeo = mesh.geometry.clone();
      command.redo = () => {
        const m = meshRegistry.getMesh(editingObjectId);
        if (m) {
          m.geometry.dispose();
          m.geometry = currentGeo.clone();
        }
      };

      // No-op execute since already applied
      command.execute = () => {};

      executeCommand(command);

      // Sprint Y: Save geometry to store
      saveGeometryToStore(mesh);

      // Clear the original geometry reference
      originalGeometryRef.current = null;
      setIsPreviewing(false);
      setActiveOperation(null);
    } else {
      // Apply operation without preview using command
      const command = new InsetFacesCommand(
        editingObjectId,
        selectedFaces,
        insetAmount
      );
      executeCommand(command);

      // Sprint Y: Save geometry to store
      saveGeometryToStore(mesh);
    }

    console.log('Inset', selectedFaces.size, 'faces - geometry saved');
  };

  // Helper: Save geometry to store
  const saveGeometryToStore = (mesh: THREE.Mesh) => {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const uvs = geometry.attributes.uv;
    const index = geometry.index;

    const geometryData = {
      data: {
        attributes: {
          position: {
            array: Array.from(positions.array),
            itemSize: positions.itemSize,
          },
          normal: normals ? {
            array: Array.from(normals.array),
            itemSize: normals.itemSize,
          } : undefined,
          uv: uvs ? {
            array: Array.from(uvs.array),
            itemSize: uvs.itemSize,
          } : undefined,
        },
        index: index ? {
          array: Array.from(index.array),
        } : undefined,
      },
    };

    useObjectsStore.getState().updateObject(editingObjectId, { geometry: geometryData });
  };

  const handleInsetPreviewStart = () => {
    if (previewMode && selectionMode === 'face' && selectedFaces.size > 0) {
      setActiveOperation('inset');
      setIsPreviewing(true);
    }
  };

  const handleInsetChange = (value: number) => {
    setInsetAmount(value);
    if (!isPreviewing && previewMode) {
      handleInsetPreviewStart();
    }
  };

  const handleSubdivide = () => {
    if (selectionMode !== 'face' || selectedFaces.size === 0) {
      console.warn('Subdivide requires face selection');
      return;
    }

    // Get the mesh from registry
    const mesh = meshRegistry.getMesh(editingObjectId);
    if (!mesh || !mesh.geometry) {
      console.warn('Mesh not found in registry');
      return;
    }

    // Store old geometry for undo
    const oldGeometry = mesh.geometry.clone();

    // Perform subdivide operation
    MeshOperations.subdivideFaces(
      mesh.geometry,
      selectedFaces,
      subdivisions
    );

    // Sprint Y: Save geometry back to store (critical!)
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const uvs = geometry.attributes.uv;
    const index = geometry.index;

    const geometryData = {
      data: {
        attributes: {
          position: {
            array: Array.from(positions.array),
            itemSize: positions.itemSize,
          },
          normal: normals ? {
            array: Array.from(normals.array),
            itemSize: normals.itemSize,
          } : undefined,
          uv: uvs ? {
            array: Array.from(uvs.array),
            itemSize: uvs.itemSize,
          } : undefined,
        },
        index: index ? {
          array: Array.from(index.array),
        } : undefined,
      },
    };

    // Update object in store
    useObjectsStore.getState().updateObject(editingObjectId, { geometry: geometryData });

    // Clear selection after subdivision
    clearSelection();

    console.log('Subdivided', selectedFaces.size, 'faces - geometry saved to store');
  };

  const handleCancel = () => {
    if (isPreviewing) {
      restoreOriginalGeometry();
      originalGeometryRef.current = null;
      setIsPreviewing(false);
      setActiveOperation(null);
    }
  };

  // Only show panel if there's a selection
  if (!isEditMode || !editingObjectId || !hasSelection()) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 w-64 bg-[#18181B]/95 backdrop-blur-md border border-[#27272A] rounded-lg shadow-xl z-50">
      {/* Header */}
      <div className="p-3 border-b border-[#27272A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-sm font-medium text-[#FAFAFA]">
              Edit Operations
              <span className="ml-2 text-[10px] text-[#71717A]">
                ({selectionMode} mode)
              </span>
            </h3>
          </div>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="p-1 rounded hover:bg-[#27272A] transition-colors"
            title={previewMode ? "Preview Mode On" : "Preview Mode Off"}
          >
            {previewMode ? (
              <Eye className="w-3 h-3 text-[#7C3AED]" />
            ) : (
              <EyeOff className="w-3 h-3 text-[#71717A]" />
            )}
          </button>
        </div>
        <div className="text-xs text-[#A1A1AA] mt-1">
          Mode: {selectionMode} • Selected: {
            selectionMode === 'vertex' ? selectedVertices.size :
            selectionMode === 'edge' ? selectedEdges.size :
            selectionMode === 'face' ? selectedFaces.size : 0
          }
          {isPreviewing && (
            <span className="ml-2 text-[#7C3AED]">• Previewing</span>
          )}
        </div>
      </div>

      {/* Operations */}
      <div className="p-3 space-y-3">
        {/* Face Operations - Only show in face mode */}
        {selectionMode === 'face' && selectedFaces.size > 0 && (
          <>
        {/* Extrude */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="w-3 h-3 text-[#7C3AED]" />
              <label className="text-xs font-medium text-[#FAFAFA]">Extrude</label>
            </div>
            <div className="flex gap-1">
              {isPreviewing && activeOperation === 'extrude' && (
                <button
                  onClick={handleCancel}
                  className="px-2 py-1 text-xs bg-[#27272A] text-white rounded hover:bg-[#3F3F46] transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleExtrude}
                disabled={selectionMode !== 'face' || selectedFaces.size === 0}
                className="px-2 py-1 text-xs bg-[#7C3AED] text-white rounded hover:bg-[#6D28D9] disabled:bg-[#27272A] disabled:text-[#71717A] transition-colors"
              >
                {isPreviewing && activeOperation === 'extrude' ? 'Confirm' : 'Apply'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={extrudeDistance}
              onChange={(e) => handleExtrudeChange(parseFloat(e.target.value))}
              onMouseDown={() => handleExtrudePreviewStart()}
              className="flex-1 h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
            />
            <input
              type="number"
              value={extrudeDistance}
              onChange={(e) => handleExtrudeChange(parseFloat(e.target.value) || 0.1)}
              onFocus={() => handleExtrudePreviewStart()}
              min="0.1"
              max="5"
              step="0.1"
              className="w-16 px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>

        {/* Inset */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-3 h-3 text-[#7C3AED]" />
              <label className="text-xs font-medium text-[#FAFAFA]">Inset</label>
            </div>
            <div className="flex gap-1">
              {isPreviewing && activeOperation === 'inset' && (
                <button
                  onClick={handleCancel}
                  className="px-2 py-1 text-xs bg-[#27272A] text-white rounded hover:bg-[#3F3F46] transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleInset}
                disabled={selectionMode !== 'face' || selectedFaces.size === 0}
                className="px-2 py-1 text-xs bg-[#7C3AED] text-white rounded hover:bg-[#6D28D9] disabled:bg-[#27272A] disabled:text-[#71717A] transition-colors"
              >
                {isPreviewing && activeOperation === 'inset' ? 'Confirm' : 'Apply'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={insetAmount}
              onChange={(e) => handleInsetChange(parseFloat(e.target.value))}
              onMouseDown={() => handleInsetPreviewStart()}
              className="flex-1 h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
            />
            <input
              type="number"
              value={insetAmount}
              onChange={(e) => handleInsetChange(parseFloat(e.target.value) || 0)}
              onFocus={() => handleInsetPreviewStart()}
              min="0"
              max="1"
              step="0.05"
              className="w-16 px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>

        {/* Subdivide */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-3 h-3 text-[#7C3AED]" />
              <label className="text-xs font-medium text-[#FAFAFA]">Subdivide</label>
            </div>
            <button
              onClick={handleSubdivide}
              disabled={selectionMode !== 'face' || selectedFaces.size === 0}
              className="px-2 py-1 text-xs bg-[#7C3AED] text-white rounded hover:bg-[#6D28D9] disabled:bg-[#27272A] disabled:text-[#71717A] transition-colors"
            >
              Apply
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={subdivisions}
              onChange={(e) => setSubdivisions(parseInt(e.target.value))}
              className="flex-1 h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
            />
            <input
              type="number"
              value={subdivisions}
              onChange={(e) => setSubdivisions(parseInt(e.target.value) || 1)}
              min="1"
              max="4"
              step="1"
              className="w-16 px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>
          </>
        )}

        {/* Vertex/Edge Operations */}
        {(selectionMode === 'vertex' || selectionMode === 'edge') && (
          <div className="space-y-3">
            <div className="text-xs text-[#A1A1AA] mb-3">
              Transform Controls
            </div>

            {/* Move Tool */}
            <button
              onClick={() => setTransformMode('translate')}
              className={`w-full flex items-center gap-2 p-2 rounded border transition-all cursor-pointer ${
                transformMode === 'translate'
                  ? 'bg-[#7C3AED]/20 border-[#7C3AED]'
                  : 'bg-[#0A0A0B] border-[#27272A] hover:border-[#7C3AED]/50'
              }`}
            >
              <div className="flex-1 text-left">
                <div className="text-xs font-medium text-[#FAFAFA] mb-1">Move Tool</div>
                <div className="text-[10px] text-[#71717A]">Click or press W to activate</div>
              </div>
              <div className={`px-3 py-1 rounded text-xs font-mono ${
                transformMode === 'translate'
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#27272A] text-[#A1A1AA]'
              }`}>
                W
              </div>
            </button>

            {/* Rotate Tool */}
            <button
              onClick={() => setTransformMode('rotate')}
              className={`w-full flex items-center gap-2 p-2 rounded border transition-all cursor-pointer ${
                transformMode === 'rotate'
                  ? 'bg-[#7C3AED]/20 border-[#7C3AED]'
                  : 'bg-[#0A0A0B] border-[#27272A] hover:border-[#7C3AED]/50'
              }`}
            >
              <div className="flex-1 text-left">
                <div className="text-xs font-medium text-[#FAFAFA] mb-1">Rotate Tool</div>
                <div className="text-[10px] text-[#71717A]">Click or press E to activate</div>
              </div>
              <div className={`px-3 py-1 rounded text-xs font-mono ${
                transformMode === 'rotate'
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#27272A] text-[#A1A1AA]'
              }`}>
                E
              </div>
            </button>

            {/* Scale Tool */}
            <button
              onClick={() => setTransformMode('scale')}
              className={`w-full flex items-center gap-2 p-2 rounded border transition-all cursor-pointer ${
                transformMode === 'scale'
                  ? 'bg-[#7C3AED]/20 border-[#7C3AED]'
                  : 'bg-[#0A0A0B] border-[#27272A] hover:border-[#7C3AED]/50'
              }`}
            >
              <div className="flex-1 text-left">
                <div className="text-xs font-medium text-[#FAFAFA] mb-1">Scale Tool</div>
                <div className="text-[10px] text-[#71717A]">Click or press R to activate</div>
              </div>
              <div className={`px-3 py-1 rounded text-xs font-mono ${
                transformMode === 'scale'
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#27272A] text-[#A1A1AA]'
              }`}>
                R
              </div>
            </button>

            {/* Help text */}
            <div className="pt-2 border-t border-[#27272A] text-xs text-[#71717A]">
              <p>Click a tool or use keyboard shortcuts (W/E/R)</p>
              <p className="mt-1">Then drag the colored arrows to transform</p>
            </div>
          </div>
        )}

        {/* Help text */}
        {selectionMode === 'face' && selectedFaces.size > 0 && (
        <div className="pt-2 border-t border-[#27272A] text-xs text-[#71717A]">
          <p className="mt-1">
            {previewMode ?
              "Drag sliders to preview changes in real-time." :
              "Toggle preview mode to see changes before applying."}
          </p>
        </div>
        )}
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7C3AED;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7C3AED;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}