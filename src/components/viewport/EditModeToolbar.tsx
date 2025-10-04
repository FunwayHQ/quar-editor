/**
 * Edit Mode Toolbar Component
 *
 * Toolbar for polygon editing mode with selection mode switcher.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import React from 'react';
import { Circle, Minus, Square, LogOut } from 'lucide-react';
import { useEditModeStore } from '../../stores/editModeStore';
import { SelectionMode } from '../../types/polygon';

export function EditModeToolbar() {
  const { isEditMode, selectionMode, setSelectionMode, exitEditMode } = useEditModeStore();

  if (!isEditMode) return null;

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
          className="flex items-center gap-2 px-3 py-2 rounded bg-[#27272A] hover:bg-[#3F3F46] transition-colors text-[#FAFAFA] text-sm"
          title="Exit Edit Mode (Tab)"
        >
          <LogOut className="w-4 h-4" />
          Exit Edit Mode
        </button>

        <div className="w-px h-6 bg-[#27272A]" />

        {/* Selection Mode Buttons */}
        <div className="flex items-center gap-1">
          {modes.map(({ mode, label, icon: Icon, shortcut }) => (
            <button
              key={mode}
              onClick={() => setSelectionMode(mode)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
                selectionMode === mode
                  ? 'bg-[#7C3AED] text-white shadow-lg'
                  : 'bg-[#0A0A0B] text-[#A1A1AA] hover:bg-[#27272A]'
              }`}
              title={`${label} Mode (${shortcut})`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className="text-xs opacity-60">{shortcut}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
