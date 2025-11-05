/**
 * Revolve Modal Component
 *
 * Modal for configuring revolve/lathe operation parameters.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useMeshOperationsStore, RevolveOptions } from '../../stores/meshOperationsStore';
import { useCurveStore } from '../../stores/curveStore';
import { useCommandStore } from '../../stores/commandStore';
import { usePreviewStore } from '../../stores/previewStore';
import { revolveCurve, generateRevolveName } from '../../lib/mesh/RevolveUtils';
import { CreateObjectCommand } from '../../lib/commands/ObjectCommands';
import * as THREE from 'three';

interface RevolveModalProps {
  curveId: string;
  onClose: () => void;
}

export function RevolveModal({ curveId, onClose }: RevolveModalProps) {
  const curve = useCurveStore((state) => state.getCurve(curveId));
  const revolveOptions = useMeshOperationsStore((state) => state.revolveOptions);
  const updateRevolveOptions = useMeshOperationsStore((state) => state.updateRevolveOptions);
  const executeCommand = useCommandStore((state) => state.executeCommand);
  const setPreviewMesh = usePreviewStore((state) => state.setPreviewMesh);
  const clearPreview = usePreviewStore((state) => state.clearPreview);

  const [localOptions, setLocalOptions] = useState<RevolveOptions>(revolveOptions);
  const debounceTimerRef = useRef<number>();

  if (!curve) {
    onClose();
    return null;
  }

  // Generate preview mesh
  const generatePreview = useCallback((options: RevolveOptions) => {
    try {
      // Clear old preview first to prevent memory leak
      clearPreview();

      const mesh = revolveCurve(curve, options);

      // Make preview semi-transparent
      (mesh.material as THREE.MeshStandardMaterial).transparent = true;
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.6;

      setPreviewMesh(mesh);
    } catch (error) {
      console.error('[RevolveModal] Failed to generate preview:', error);
    }
  }, [curve, setPreviewMesh, clearPreview]);

  // Update preview when options change (debounced)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      generatePreview(localOptions);
    }, 100);

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

  const handleOptionChange = (key: keyof RevolveOptions, value: number | string) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    updateRevolveOptions({ [key]: value });
  };

  const handleApply = () => {
    try {
      clearPreview();

      // Generate final mesh
      const mesh = revolveCurve(curve, localOptions);

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
      const objectName = generateRevolveName(curve.name);

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

      const command = new CreateObjectCommand(sceneObject);
      executeCommand(command);

      // Cleanup
      geometry.dispose();
      (mesh.material as THREE.Material).dispose();

      console.log('[RevolveModal] Created revolved object:', objectName);
      onClose();
    } catch (error) {
      console.error('[RevolveModal] Failed to revolve curve:', error);
      alert(`Failed to revolve: ${error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl w-[500px] max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272A]">
          <h2 className="text-lg font-medium text-[#FAFAFA]">Revolve: {curve.name}</h2>
          <button
            onClick={() => { clearPreview(); onClose(); }}
            className="p-1 hover:bg-[#27272A] rounded transition-colors"
          >
            <X className="w-5 h-5 text-[#A1A1AA]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[45vh]">
          {/* Axis Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Rotation Axis
            </label>
            <div className="flex gap-4">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <label key={axis} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="axis"
                    value={axis}
                    checked={localOptions.axis === axis}
                    onChange={(e) => handleOptionChange('axis', e.target.value)}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-[#FAFAFA] uppercase">{axis} Axis</span>
                </label>
              ))}
            </div>
          </div>

          {/* Angle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Angle
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="360"
                step="1"
                value={localOptions.angle}
                onChange={(e) => handleOptionChange('angle', parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="1"
                max="360"
                step="1"
                value={localOptions.angle}
                onChange={(e) => handleOptionChange('angle', parseFloat(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
              <span className="text-sm text-[#A1A1AA]">°</span>
            </div>
          </div>

          {/* Segments */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Segments
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="8"
                max="64"
                step="1"
                value={localOptions.segments}
                onChange={(e) => handleOptionChange('segments', parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="8"
                max="64"
                value={localOptions.segments}
                onChange={(e) => handleOptionChange('segments', parseInt(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
            </div>
          </div>

          {/* Offset */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Offset from Axis
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={localOptions.offset}
                onChange={(e) => handleOptionChange('offset', parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={localOptions.offset}
                onChange={(e) => handleOptionChange('offset', parseFloat(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
            </div>
          </div>

          {/* Start Angle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Start Angle
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={localOptions.phiStart}
                onChange={(e) => handleOptionChange('phiStart', parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max="360"
                step="1"
                value={localOptions.phiStart}
                onChange={(e) => handleOptionChange('phiStart', parseFloat(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
              <span className="text-sm text-[#A1A1AA]">°</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#27272A] bg-[#0A0A0B]">
          <button
            onClick={() => { clearPreview(); onClose(); }}
            className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            Apply Revolve
          </button>
        </div>
      </div>
    </div>
  );
}
