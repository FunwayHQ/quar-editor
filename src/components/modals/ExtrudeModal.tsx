/**
 * Extrude Modal Component
 *
 * Modal for configuring extrude operation parameters.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useMeshOperationsStore, ExtrudeOptions } from '../../stores/meshOperationsStore';
import { useCurveStore } from '../../stores/curveStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { usePreviewStore } from '../../stores/previewStore';
import { extrudeCurve, generateExtrudeName } from '../../lib/mesh/ExtrudeUtils';
import { CreateObjectCommand } from '../../lib/commands/ObjectCommands';
import * as THREE from 'three';

interface ExtrudeModalProps {
  curveId: string;
  onClose: () => void;
}

export function ExtrudeModal({ curveId, onClose }: ExtrudeModalProps) {
  const curve = useCurveStore((state) => state.getCurve(curveId));
  const extrudeOptions = useMeshOperationsStore((state) => state.extrudeOptions);
  const updateExtrudeOptions = useMeshOperationsStore((state) => state.updateExtrudeOptions);
  const executeCommand = useCommandStore((state) => state.executeCommand);
  const setPreviewMesh = usePreviewStore((state) => state.setPreviewMesh);
  const clearPreview = usePreviewStore((state) => state.clearPreview);

  const [localOptions, setLocalOptions] = useState<ExtrudeOptions>(extrudeOptions);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  if (!curve) {
    onClose();
    return null;
  }

  // Generate preview mesh
  const generatePreview = useCallback((options: ExtrudeOptions) => {
    try {
      // Clear old preview first to prevent memory leak
      clearPreview();

      const mesh = extrudeCurve(curve, options);

      // Make preview semi-transparent
      (mesh.material as THREE.MeshStandardMaterial).transparent = true;
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.6;
      (mesh.material as THREE.MeshStandardMaterial).wireframe = false;

      setPreviewMesh(mesh);
    } catch (error) {
      console.error('[ExtrudeModal] Failed to generate preview:', error);
    }
  }, [curve, setPreviewMesh, clearPreview]);

  // Update preview when options change (debounced)
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      generatePreview(localOptions);
    }, 100); // 100ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = undefined;
      }
    };
  }, [localOptions, generatePreview]);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      clearPreview();
    };
  }, [clearPreview]);

  const handleOptionChange = (key: keyof ExtrudeOptions, value: number | boolean) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    updateExtrudeOptions({ [key]: value });
  };

  const handleApply = () => {
    try {
      // Clear preview before creating final mesh
      clearPreview();

      // Generate mesh
      const mesh = extrudeCurve(curve, localOptions);

      // Extract geometry data
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const positionAttr = geometry.getAttribute('position');
      const normalAttr = geometry.getAttribute('normal');
      const uvAttr = geometry.getAttribute('uv');
      const indexAttr = geometry.getIndex();

      const importedGeometry = {
        vertices: Array.from(positionAttr.array),
        normals: normalAttr ? Array.from(normalAttr.array) : [],
        uvs: uvAttr ? Array.from(uvAttr.array) : [],
        indices: indexAttr ? Array.from(indexAttr.array) : undefined
      };

      // Create scene object
      const now = Date.now();
      const objectName = generateExtrudeName(curve.name);

      const sceneObject = {
        id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: objectName,
        type: 'imported' as const,
        visible: true,
        locked: false,
        position: [mesh.position.x, mesh.position.y, mesh.position.z] as [number, number, number],
        rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z] as [number, number, number],
        scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z] as [number, number, number],
        parentId: null,
        children: [],
        importedGeometry,
        createdAt: now,
        modifiedAt: now
      };

      // Execute command
      const command = new CreateObjectCommand(sceneObject);
      executeCommand(command);

      // Cleanup
      geometry.dispose();
      (mesh.material as THREE.Material).dispose();

      console.log('[ExtrudeModal] Created extruded object:', objectName);
      onClose();
    } catch (error) {
      console.error('[ExtrudeModal] Failed to extrude curve:', error);
      alert(`Failed to extrude: ${error}`);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl w-[500px] max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272A]">
          <h2 className="text-lg font-medium text-[#FAFAFA]">Extrude: {curve.name}</h2>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-[#27272A] rounded transition-colors"
          >
            <X className="w-5 h-5 text-[#A1A1AA]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[45vh]">
          {/* Depth */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Depth
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={localOptions.depth}
                onChange={(e) => handleOptionChange('depth', parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={localOptions.depth}
                onChange={(e) => handleOptionChange('depth', parseFloat(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Steps
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={localOptions.steps}
                onChange={(e) => handleOptionChange('steps', parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="1"
                max="10"
                value={localOptions.steps}
                onChange={(e) => handleOptionChange('steps', parseInt(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
            </div>
          </div>

          {/* Bevel Enabled */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localOptions.bevelEnabled}
                onChange={(e) => handleOptionChange('bevelEnabled', e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="text-sm font-medium text-[#FAFAFA]">Enable Bevel</span>
            </label>

            {/* Bevel options (only show if enabled) */}
            {localOptions.bevelEnabled && (
              <div className="pl-6 space-y-4 border-l-2 border-purple-500/30">
                {/* Bevel Size */}
                <div className="space-y-2">
                  <label className="block text-sm text-[#A1A1AA]">Bevel Size</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={localOptions.bevelSize}
                      onChange={(e) => handleOptionChange('bevelSize', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={localOptions.bevelSize}
                      onChange={(e) => handleOptionChange('bevelSize', parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
                    />
                  </div>
                </div>

                {/* Bevel Segments */}
                <div className="space-y-2">
                  <label className="block text-sm text-[#A1A1AA]">Bevel Segments</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={localOptions.bevelSegments}
                      onChange={(e) => handleOptionChange('bevelSegments', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={localOptions.bevelSegments}
                      onChange={(e) => handleOptionChange('bevelSegments', parseInt(e.target.value))}
                      className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Curve Segments */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Curve Segments
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3"
                max="50"
                step="1"
                value={localOptions.curveSegments}
                onChange={(e) => handleOptionChange('curveSegments', parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="3"
                max="50"
                value={localOptions.curveSegments}
                onChange={(e) => handleOptionChange('curveSegments', parseInt(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#27272A] bg-[#0A0A0B]">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            Apply Extrude
          </button>
        </div>
      </div>
    </div>
  );
}
