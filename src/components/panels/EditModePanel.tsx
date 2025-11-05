/**
 * Edit Mode Panel Component
 *
 * Right sidebar panel for polygon editing operations.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { useState } from 'react';
import { Maximize2, Trash2, Circle, Minus, Square as SquareIcon } from 'lucide-react';
import { useEditModeStore } from '../../stores/editModeStore';

export function EditModePanel() {
  const {
    isEditMode,
    selectionMode,
    selectedVertices,
    selectedEdges,
    selectedFaces,
    getSelectionCount,
    clearSelection,
  } = useEditModeStore();

  const [extrudeDistance, setExtrudeDistance] = useState(1.0);

  if (!isEditMode) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-[#71717A]">Enter edit mode to modify geometry</p>
        <p className="text-xs text-[#71717A] mt-2">Select an object and press Tab</p>
      </div>
    );
  }

  const selectionCount = getSelectionCount();

  const handleExtrude = () => {
    // TODO: Implement extrude operation
    console.log('Extrude faces by', extrudeDistance);
  };

  const handleDelete = () => {
    // TODO: Implement delete operation
    console.log('Delete selected elements');
  };

  const handleSelectAll = () => {
    // TODO: Implement select all
    console.log('Select all');
  };

  const handleInvertSelection = () => {
    // TODO: Implement invert selection
    console.log('Invert selection');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#27272A]">
        <h3 className="text-sm font-medium text-[#FAFAFA]">Edit Mode</h3>
        <div className="flex items-center gap-2 mt-2">
          {selectionMode === 'vertex' && <Circle className="w-4 h-4 text-[#7C3AED]" />}
          {selectionMode === 'edge' && <Minus className="w-4 h-4 text-[#7C3AED]" />}
          {selectionMode === 'face' && <SquareIcon className="w-4 h-4 text-[#7C3AED]" />}
          <span className="text-xs text-[#A1A1AA] capitalize">{selectionMode} Mode</span>
        </div>
      </div>

      {/* Selection Info */}
      <div className="p-4 border-b border-[#27272A]">
        <h4 className="text-xs font-medium text-[#FAFAFA] mb-3">Selection</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#71717A]">Vertices:</span>
            <span className="text-[#FAFAFA] font-mono">{selectedVertices.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#71717A]">Edges:</span>
            <span className="text-[#FAFAFA] font-mono">{selectedEdges.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#71717A]">Faces:</span>
            <span className="text-[#FAFAFA] font-mono">{selectedFaces.size}</span>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="p-4 border-b border-[#27272A]">
        <h4 className="text-xs font-medium text-[#FAFAFA] mb-3">Operations</h4>

        {/* Extrude (Face mode only) */}
        {selectionMode === 'face' && (
          <div className="space-y-2 mb-3">
            <button
              onClick={handleExtrude}
              disabled={selectedFaces.size === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#7C3AED] text-white text-sm rounded hover:bg-[#6D28D9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Maximize2 className="w-4 h-4" />
              Extrude Faces
            </button>

            <div>
              <label className="block text-xs text-[#71717A] mb-1">Distance</label>
              <input
                type="number"
                value={extrudeDistance}
                onChange={(e) => setExtrudeDistance(parseFloat(e.target.value))}
                step="0.1"
                className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>
        )}

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={selectionCount === 0}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 text-sm rounded hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Delete Selected
        </button>
      </div>

      {/* Tools */}
      <div className="p-4">
        <h4 className="text-xs font-medium text-[#FAFAFA] mb-3">Tools</h4>
        <div className="space-y-2">
          <button
            onClick={handleSelectAll}
            className="w-full px-3 py-1.5 bg-[#27272A] text-[#FAFAFA] text-xs rounded hover:bg-[#3F3F46] transition-colors"
          >
            Select All (A)
          </button>

          <button
            onClick={clearSelection}
            className="w-full px-3 py-1.5 bg-[#27272A] text-[#FAFAFA] text-xs rounded hover:bg-[#3F3F46] transition-colors"
          >
            Deselect All (Alt+A)
          </button>

          <button
            onClick={handleInvertSelection}
            className="w-full px-3 py-1.5 bg-[#27272A] text-[#FAFAFA] text-xs rounded hover:bg-[#3F3F46] transition-colors"
          >
            Invert Selection
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-auto p-4 bg-[#0A0A0B] border-t border-[#27272A]">
        <p className="text-xs text-[#71717A] leading-relaxed">
          <span className="block mb-1"><span className="font-mono text-[#A1A1AA]">1/2/3</span> - Switch modes</span>
          <span className="block mb-1"><span className="font-mono text-[#A1A1AA]">W/E/R</span> - Transform</span>
          <span className="block mb-1"><span className="font-mono text-[#A1A1AA]">Shift</span> - Multi-select</span>
          <span className="block"><span className="font-mono text-[#A1A1AA]">Tab</span> - Exit edit mode</span>
        </p>
      </div>
    </div>
  );
}
