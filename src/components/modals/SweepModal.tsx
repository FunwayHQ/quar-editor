/**
 * Sweep Modal Component
 *
 * Modal for configuring sweep operation - extrude profile along path.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useMeshOperationsStore, SweepOptions } from '../../stores/meshOperationsStore';
import { useCurveStore } from '../../stores/curveStore';
import { useCommandStore } from '../../stores/commandStore';
import { usePreviewStore } from '../../stores/previewStore';
import { sweepCurve, generateSweepName } from '../../lib/mesh/SweepUtils';
import { CreateObjectCommand } from '../../lib/commands/ObjectCommands';
import * as THREE from 'three';

interface SweepModalProps {
  curveIds: string[]; // [profileId, pathId]
  onClose: () => void;
}

export function SweepModal({ curveIds, onClose }: SweepModalProps) {
  const getCurve = useCurveStore((state) => state.getCurve);
  const sweepOptions = useMeshOperationsStore((state) => state.sweepOptions);
  const updateSweepOptions = useMeshOperationsStore((state) => state.updateSweepOptions);
  const executeCommand = useCommandStore((state) => state.executeCommand);
  const setPreviewMesh = usePreviewStore((state) => state.setPreviewMesh);
  const clearPreview = usePreviewStore((state) => state.clearPreview);

  // User can swap which is profile vs path
  const [profileId, setProfileId] = useState(curveIds[0]);
  const [pathId, setPathId] = useState(curveIds[1]);
  const [localOptions, setLocalOptions] = useState<SweepOptions>({
    ...sweepOptions,
    pathId: curveIds[1]
  });
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Get curves dynamically (will update when profileId/pathId change)
  const profile = React.useMemo(() => {
    const curve = getCurve(profileId);
    console.log('[SweepModal] Profile curve updated:', curve?.name);
    return curve;
  }, [getCurve, profileId]);

  const path = React.useMemo(() => {
    const curve = getCurve(pathId);
    console.log('[SweepModal] Path curve updated:', curve?.name);
    return curve;
  }, [getCurve, pathId]);

  if (!profile || !path) {
    onClose();
    return null;
  }

  // Generate preview mesh
  const generatePreview = useCallback((options: SweepOptions, prof: typeof profile, pth: typeof path) => {
    try {
      if (!prof || !pth) {
        console.warn('[SweepModal] Missing profile or path');
        return;
      }

      console.log('[SweepModal] Generating preview - Profile:', prof.name, 'Path:', pth.name);
      clearPreview();

      const mesh = sweepCurve(prof, pth, options);

      // Make preview semi-transparent
      (mesh.material as THREE.MeshStandardMaterial).transparent = true;
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.6;

      setPreviewMesh(mesh);
      console.log('[SweepModal] Preview generated successfully');
    } catch (error) {
      console.error('[SweepModal] Failed to generate preview:', error);
    }
  }, [setPreviewMesh, clearPreview]);

  // Update preview when options OR profile/path change (debounced)
  useEffect(() => {
    if (!profile || !path) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      generatePreview(localOptions, profile, path);
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = undefined;
      }
    };
  }, [localOptions, profileId, pathId, profile, path, generatePreview]);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      clearPreview();
    };
  }, [clearPreview]);

  const handleOptionChange = (key: keyof SweepOptions, value: any) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    updateSweepOptions({ [key]: value });
  };

  const handleSwapCurves = () => {
    console.log('[SweepModal] Swapping curves - Before:', { profileId, pathId });
    const tempProfile = profileId;
    setProfileId(pathId);
    setPathId(tempProfile);
    console.log('[SweepModal] Swapping curves - After:', { profileId: pathId, pathId: tempProfile });
  };

  const handleApply = () => {
    try {
      clearPreview();

      // Generate final mesh
      const mesh = sweepCurve(profile, path, localOptions);

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
      const objectName = generateSweepName(profile.name, path.name);

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

      console.log('[SweepModal] Created swept object:', objectName);
      onClose();
    } catch (error) {
      console.error('[SweepModal] Failed to sweep curve:', error);
      alert(`Failed to sweep: ${error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl w-[500px] max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272A]">
          <h2 className="text-lg font-medium text-[#FAFAFA]">Sweep</h2>
          <button
            onClick={() => { clearPreview(); onClose(); }}
            className="p-1 hover:bg-[#27272A] rounded transition-colors"
          >
            <X className="w-5 h-5 text-[#A1A1AA]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[45vh]">
          {/* Curve Assignment */}
          <div className="space-y-3 bg-[#0A0A0B] p-4 rounded-lg border border-purple-500/20">
            <div className="text-center mb-2">
              <button
                onClick={handleSwapCurves}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors font-medium"
              >
                ↔ Swap Profile & Path
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 p-3 bg-[#27272A] rounded">
                <label className="block text-xs font-medium text-purple-400">Profile</label>
                <p className="text-sm text-[#FAFAFA] font-medium">{profile.name}</p>
                <p className="text-xs text-[#A1A1AA]">Cross-section shape</p>
              </div>

              <div className="space-y-1 p-3 bg-[#27272A] rounded">
                <label className="block text-xs font-medium text-yellow-400">Path</label>
                <p className="text-sm text-[#FAFAFA] font-medium">{path.name}</p>
                <p className="text-xs text-[#A1A1AA]">Trajectory to follow</p>
              </div>
            </div>

            <div className="text-xs text-[#A1A1AA] bg-purple-950/30 p-2 rounded">
              💡 <strong>Profile</strong> is the shape (e.g., rectangle)<br/>
              💡 <strong>Path</strong> is where it goes (e.g., U-curve)
            </div>
          </div>

          {/* Segments */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Segments Along Path
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={localOptions.segments}
                onChange={(e) => handleOptionChange('segments', parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="5"
                max="100"
                value={localOptions.segments}
                onChange={(e) => handleOptionChange('segments', parseInt(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
            </div>
          </div>

          {/* Twist */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Twist (Rotation Along Path)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="-720"
                max="720"
                step="1"
                value={localOptions.rotation}
                onChange={(e) => handleOptionChange('rotation', parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="-720"
                max="720"
                value={localOptions.rotation}
                onChange={(e) => handleOptionChange('rotation', parseFloat(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
              <span className="text-sm text-[#A1A1AA]">°</span>
            </div>
          </div>

          {/* Taper (Scale Start) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Scale at Start
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={localOptions.scaleStart}
                onChange={(e) => handleOptionChange('scaleStart', parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0.1"
                max="3"
                step="0.1"
                value={localOptions.scaleStart}
                onChange={(e) => handleOptionChange('scaleStart', parseFloat(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
            </div>
          </div>

          {/* Taper (Scale End) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#FAFAFA]">
              Scale at End
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={localOptions.scaleEnd}
                onChange={(e) => handleOptionChange('scaleEnd', parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0.1"
                max="3"
                step="0.1"
                value={localOptions.scaleEnd}
                onChange={(e) => handleOptionChange('scaleEnd', parseFloat(e.target.value))}
                className="w-20 px-2 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[#FAFAFA] text-sm"
              />
            </div>
          </div>

          {/* Close Profile Option */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localOptions.closeProfile}
                onChange={(e) => handleOptionChange('closeProfile', e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="text-sm font-medium text-[#FAFAFA]">Auto-Close Profile</span>
            </label>
            <p className="text-xs text-[#A1A1AA] pl-6">
              Closes open profiles (like U-shapes) to create solid tubes
            </p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localOptions.capEnds}
                onChange={(e) => handleOptionChange('capEnds', e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="text-sm font-medium text-[#FAFAFA]">Cap Ends</span>
            </label>
            <p className="text-xs text-[#A1A1AA] pl-6">
              Adds triangulated caps at start/end of path
            </p>
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
            Apply Sweep
          </button>
        </div>
      </div>
    </div>
  );
}
