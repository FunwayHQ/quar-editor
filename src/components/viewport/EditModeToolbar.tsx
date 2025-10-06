/**
 * Edit Mode Toolbar Component
 *
 * Toolbar for polygon editing mode with selection mode switcher.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import React from 'react';
import { Circle, Minus, Square, LogOut, Scissors, Link } from 'lucide-react';
import { useEditModeStore } from '../../stores/editModeStore';
import { useKnifeToolStore } from '../../stores/knifeToolStore';
import { SelectionMode } from '../../types/polygon';

export function EditModeToolbar() {
  const { isEditMode, selectionMode, setSelectionMode, exitEditMode, mergedVertexMode, setMergedVertexMode } = useEditModeStore();
  const { isActive: isKnifeActive, activateTool, deactivateTool } = useKnifeToolStore();

  if (!isEditMode) return null;

  const toggleKnifeTool = () => {
    if (isKnifeActive) {
      deactivateTool();
    } else {
      activateTool();
    }
  };

  const modes: { mode: SelectionMode; label: string; icon: typeof Circle; shortcut: string }[] = [
    { mode: 'vertex', label: 'Vertex', icon: Circle, shortcut: '1' },
    { mode: 'edge', label: 'Edge', icon: Minus, shortcut: '2' },
    { mode: 'face', label: 'Face', icon: Square, shortcut: '3' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-2 bg-[#18181B]/90 backdrop-blur-md border border-[#27272A] rounded-lg p-2 shadow-xl">
        {/* Exit Edit Mode Button */}
        <button
          onClick={exitEditMode}
          className="flex items-center gap-2 px-3 py-2 rounded bg-[#27272A] hover:bg-[#3F3F46] transition-colors text-[#FAFAFA] text-sm whitespace-nowrap"
          title="Exit Edit Mode (Tab)"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit</span>
        </button>

        <div className="w-px h-6 bg-[#27272A]" />

        {/* Selection Mode Buttons */}
        <div className="flex items-center gap-1">
          {modes.map(({ mode, label, icon: Icon, shortcut }) => (
            <button
              key={mode}
              onClick={() => setSelectionMode(mode)}
              disabled={isKnifeActive}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
                selectionMode === mode && !isKnifeActive
                  ? 'bg-[#7C3AED] text-white shadow-lg'
                  : 'bg-[#0A0A0B] text-[#A1A1AA] hover:bg-[#27272A]'
              } ${isKnifeActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isKnifeActive ? 'Disabled while knife tool is active' : `${label} Mode (${shortcut})`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className="text-xs opacity-60">{shortcut}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-[#27272A]" />

        {/* Knife Tool Button */}
        <button
          onClick={toggleKnifeTool}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
            isKnifeActive
              ? 'bg-[#10B981] text-white shadow-lg'
              : 'bg-[#0A0A0B] text-[#A1A1AA] hover:bg-[#27272A]'
          }`}
          title="Knife Tool (K)"
        >
          <Scissors className="w-4 h-4" />
          <span>Knife</span>
          <span className="text-xs opacity-60">K</span>
        </button>

        {/* Sprint Y: Merged Vertex Mode Toggle (Vertex mode only) */}
        {selectionMode === 'vertex' && (
          <>
            <div className="w-px h-6 bg-[#27272A]" />

            <button
              onClick={() => setMergedVertexMode(!mergedVertexMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
                mergedVertexMode
                  ? 'bg-[#7C3AED] text-white shadow-lg'
                  : 'bg-[#0A0A0B] text-[#A1A1AA] hover:bg-[#27272A]'
              }`}
              title={mergedVertexMode ? 'Merged Vertices (Move connected together)' : 'Individual Vertices (Move separately)'}
            >
              <Link className="w-4 h-4" />
              <span>{mergedVertexMode ? 'Merged' : 'Individual'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
