/**
 * Loft Modal Component
 *
 * Modal for configuring loft operation - interpolate between multiple curves.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { useMeshOperationsStore, LoftOptions } from '../../stores/meshOperationsStore';
import { useCurveStore } from '../../stores/curveStore';
import { useCommandStore } from '../../stores/commandStore';
import { usePreviewStore } from '../../stores/previewStore';
import { loftCurves, generateLoftName } from '../../lib/mesh/LoftUtils';
import { CreateObjectCommand } from '../../lib/commands/ObjectCommands';
import * as THREE from 'three';

interface LoftModalProps {
  curveIds: string[];
  onClose: () => void;
}

export function LoftModal({ curveIds, onClose }: LoftModalProps) {
  const getCurve = useCurveStore((state) => state.getCurve);
  const loftOptions = useMeshOperationsStore((state) => state.loftOptions);
  const updateLoftOptions = useMeshOperationsStore((state) => state.updateLoftOptions);
  const executeCommand = useCommandStore((state) => state.executeCommand);
  const setPreviewMesh = usePreviewStore((state) => state.setPreviewMesh);
  const clearPreview = usePreviewStore((state) => state.clearPreview);

  // Local state for curve order (can be reordered)
  const [orderedCurveIds, setOrderedCurveIds] = useState<string[]>(curveIds);
  const [localOptions, setLocalOptions] = useState<LoftOptions>({
    ...loftOptions,
    curveIds: curveIds
  });
  const debounceTimerRef = useRef<number>();

  if (curveIds.length < 2) {
    onClose();
    return null;
  }

  // Get curves in current order
  const curves = orderedCurveIds.map(id => getCurve(id)).filter(c => c !== undefined) as any[];

  if (curves.length < 2) {
    onClose();
    return null;
  }

  // Generate preview mesh
  const generatePreview = useCallback((options: LoftOptions, curveOrder: string[]) => {
    try {
      const orderedCurves = curveOrder.map(id => getCurve(id)).filter(c => c !== undefined) as any[];
      if (orderedCurves.length < 2) return;

      // Clear old preview first to prevent memory leak
      clearPreview();

      const mesh = loftCurves(orderedCurves, options);

      // Make preview semi-transparent
      (mesh.material as THREE.MeshStandardMaterial).transparent = true;
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.6;

      setPreviewMesh(mesh);
    } catch (error) {
      console.error('[LoftModal] Failed to generate preview:', error);
    }
  }, [getCurve, setPreviewMesh, clearPreview]);

  // Update preview when options or order change (debounced)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      generatePreview(localOptions, orderedCurveIds);
    }, 150); // Slightly longer debounce for loft (more complex)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = undefined;
      }
    };
  }, [localOptions, orderedCurveIds, generatePreview]);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      clearPreview();
    };
  }, [clearPreview]);

  const handleOptionChange = (key: keyof LoftOptions, value: any) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    updateLoftOptions({ [key]: value });
  };

  const moveCurveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedCurveIds];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrderedCurveIds(newOrder);
  };

  const moveCurveDown = (index: number) => {
    if (index === orderedCurveIds.length - 1) return;
    const newOrder = [...orderedCurveIds];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrderedCurveIds(newOrder);
  };

  const handleApply = () => {
    try {
      clearPreview();

      // Get curves in final order
      const orderedCurves = orderedCurveIds.map(id => getCurve(id)).filter(c => c !== undefined) as any[];

      // Generate final mesh
      const mesh = loftCurves(orderedCurves, localOptions);

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
      const curveNames = curves.map(c => c.name);
      const objectName = generateLoftName(curveNames);

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

      console.log('[LoftModal] Created lofted object:', objectName);
      onClose();
    } catch (error) {
      console.error('[LoftModal] Failed to loft curves:', error);
      alert(`Failed to loft: ${error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl w-[500px] max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272A]">
          <h2 className="text-lg font-medium text-[#FAFAFA]">Loft: {curves.length} Curves</h2>
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
              Loft Direction
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
            <p className="text-xs text-[#A1A1AA]">
              Curves will be distributed along this axis
            </p>
          </div>

          {/* Curve Order */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Curve Order (Top to Bottom)
            </label>
            <div className="space-y-1 bg-[#0A0A0B] rounded-lg border border-[#27272A] p-2">
              {orderedCurveIds.map((curveId, index) => {
                const curve = getCurve(curveId);
                if (!curve) return null;

                return (
                  <div
                    key={curveId}
                    className="flex items-center gap-2 p-2 bg-[#27272A] rounded"
                  >
                    <span className="text-xs text-[#A1A1AA] w-6">{index + 1}.</span>
                    <span className="flex-1 text-sm text-[#FAFAFA]">{curve.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveCurveUp(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-[#3F3F46] disabled:opacity-30 rounded transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4 text-[#A1A1AA]" />
                      </button>
                      <button
                        onClick={() => moveCurveDown(index)}
                        disabled={index === orderedCurveIds.length - 1}
                        className="p-1 hover:bg-[#3F3F46] disabled:opacity-30 rounded transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
                min="5"
                max="50"
                step="1"
                value={localOptions.segments}
                onChange={(e) => handleOptionChange('segments', parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="5"
                max="50"
                value={localOptions.segments}
                onChange={(e) => handleOptionChange('segments', parseInt(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localOptions.cap}
                onChange={(e) => handleOptionChange('cap', e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="text-sm font-medium text-[#FAFAFA]">Cap Ends</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localOptions.closed}
                onChange={(e) => handleOptionChange('closed', e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="text-sm font-medium text-[#FAFAFA]">Closed (Tube)</span>
            </label>
          </div>

          {/* Info */}
          <div className="text-xs text-[#A1A1AA] bg-[#0A0A0B] p-3 rounded border border-[#27272A]">
            <p className="mb-1">💡 <strong>Tip:</strong> Reorder curves to control loft direction</p>
            <p>The mesh will interpolate from the first curve to the last curve</p>
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
            Apply Loft
          </button>
        </div>
      </div>
    </div>
  );
}
