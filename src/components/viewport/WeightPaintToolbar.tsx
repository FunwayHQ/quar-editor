/**
 * Weight Paint Toolbar Component
 *
 * Toolbar for weight painting mode with brush controls and bone selection.
 * Epic 6: Weight Painting & Skinning Tools
 */

import React from 'react';
import { Paintbrush, Plus, Minus, Droplet, Target, Sliders } from 'lucide-react';
import { useBoneStore } from '../../stores/boneStore';
import { useObjectsStore } from '../../stores/objectsStore';

export function WeightPaintToolbar() {
  const {
    isWeightPaintMode,
    weightPaintMeshId,
    weightPaintBoneId,
    weightPaintBrushSize,
    weightPaintBrushStrength,
    weightPaintMode,
    enterWeightPaintMode,
    exitWeightPaintMode,
    setWeightPaintBone,
    setWeightPaintBrushSize,
    setWeightPaintBrushStrength,
    setWeightPaintMode,
    normalizeWeights,
    smoothWeights,
  } = useBoneStore();

  const { objects, selectedIds } = useObjectsStore();

  // Check if a skinned mesh is selected
  const selectedMesh = Array.from(selectedIds)
    .map(id => objects.get(id))
    .find(obj => obj && obj.type === 'imported' && obj.skinData);

  // Show enter button if skinned mesh is selected but not in weight paint mode
  if (!isWeightPaintMode && selectedMesh) {
    return (
      <div className="absolute top-4 left-4 bg-[#18181B]/95 backdrop-blur-md border border-[#27272A] rounded-lg shadow-xl p-4 z-10">
        <button
          onClick={() => enterWeightPaintMode(selectedMesh.id)}
          className="flex items-center gap-2 px-4 py-2 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
          title="Enter Weight Paint Mode"
        >
          <Paintbrush className="w-4 h-4" />
          <span className="text-sm">Enter Weight Paint Mode</span>
        </button>
      </div>
    );
  }

  if (!isWeightPaintMode || !weightPaintMeshId) return null;

  const mesh = objects.get(weightPaintMeshId);
  if (!mesh || !mesh.skinData) return null;

  // Get bones from the armature
  const armatureId = mesh.skinData.armatureId;
  const bones = Array.from(objects.values()).filter(
    obj => obj.type === 'bone' && obj.parentId === armatureId
  );

  return (
    <div className="absolute top-4 left-4 bg-[#18181B]/95 backdrop-blur-md border border-[#27272A] rounded-lg shadow-xl p-4 space-y-4 z-10 min-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-5 h-5 text-[#7C3AED]" />
          <h3 className="text-sm font-medium text-[#FAFAFA]">Weight Paint</h3>
        </div>
        <button
          onClick={exitWeightPaintMode}
          className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs rounded transition-colors"
        >
          Exit
        </button>
      </div>

      {/* Mesh Info */}
      <div className="text-xs text-[#A1A1AA]">
        <span>Mesh: </span>
        <span className="text-[#FAFAFA]">{mesh.name}</span>
      </div>

      {/* Bone Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#FAFAFA]">Active Bone</label>
        <select
          value={weightPaintBoneId || ''}
          onChange={(e) => setWeightPaintBone(e.target.value || null)}
          className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-sm text-[#FAFAFA] outline-none focus:border-[#7C3AED]"
        >
          <option value="">Select bone...</option>
          {bones.map(bone => (
            <option key={bone.id} value={bone.id}>
              {bone.name}
            </option>
          ))}
        </select>
      </div>

      {/* Paint Mode */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#FAFAFA]">Paint Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setWeightPaintMode('add')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-xs transition-colors ${
              weightPaintMode === 'add'
                ? 'bg-[#10B981] text-white'
                : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
          <button
            onClick={() => setWeightPaintMode('subtract')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-xs transition-colors ${
              weightPaintMode === 'subtract'
                ? 'bg-[#EF4444] text-white'
                : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
            }`}
          >
            <Minus className="w-4 h-4" />
            Subtract
          </button>
          <button
            onClick={() => setWeightPaintMode('smooth')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-xs transition-colors ${
              weightPaintMode === 'smooth'
                ? 'bg-[#F59E0B] text-white'
                : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
            }`}
          >
            <Droplet className="w-4 h-4" />
            Smooth
          </button>
          <button
            onClick={() => setWeightPaintMode('average')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-xs transition-colors ${
              weightPaintMode === 'average'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
            }`}
          >
            <Target className="w-4 h-4" />
            Average
          </button>
        </div>
      </div>

      {/* Brush Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#A1A1AA]" />
          <span className="text-xs font-medium text-[#FAFAFA]">Brush Settings</span>
        </div>

        {/* Brush Size */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-[#A1A1AA]">Size</label>
            <span className="text-xs text-[#FAFAFA] font-mono">{weightPaintBrushSize.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={weightPaintBrushSize}
            onChange={(e) => setWeightPaintBrushSize(parseFloat(e.target.value))}
            className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Brush Strength */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-[#A1A1AA]">Strength</label>
            <span className="text-xs text-[#FAFAFA] font-mono">{weightPaintBrushStrength.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={weightPaintBrushStrength}
            onChange={(e) => setWeightPaintBrushStrength(parseFloat(e.target.value))}
            className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      {/* Tools */}
      <div className="space-y-2 pt-3 border-t border-[#27272A]">
        <div className="text-xs font-medium text-[#FAFAFA] mb-2">Tools</div>
        <button
          onClick={() => normalizeWeights(weightPaintMeshId)}
          className="w-full px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs rounded transition-colors"
        >
          Normalize All Weights
        </button>
        <button
          onClick={() => {
            // Smooth all vertices
            const mesh = objects.get(weightPaintMeshId);
            if (mesh?.importedGeometry) {
              const vertexCount = mesh.importedGeometry.vertices.length / 3;
              const allIndices = Array.from({ length: vertexCount }, (_, i) => i);
              smoothWeights(weightPaintMeshId, allIndices, 1);
            }
          }}
          className="w-full px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs rounded transition-colors"
        >
          Smooth All Weights
        </button>
      </div>

      {/* Instructions */}
      <div className="pt-3 border-t border-[#27272A] text-xs text-[#71717A] space-y-1">
        <p>• Select a bone to paint weights</p>
        <p>• Click on vertices to paint</p>
        <p>• Hold Shift to paint multiple</p>
      </div>
    </div>
  );
}
