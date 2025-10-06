/**
 * Curve Panel Component
 *
 * Displays list of imported curves (from SVG files).
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { useCurveStore } from '../../stores/curveStore';

export function CurvePanel() {
  const curves = useCurveStore((state) => state.curves);
  const selectedCurveIds = useCurveStore((state) => state.selectedCurveIds);
  const selectCurve = useCurveStore((state) => state.selectCurve);
  const clearSelection = useCurveStore((state) => state.clearSelection);
  const removeCurve = useCurveStore((state) => state.removeCurve);

  const curveArray = Array.from(curves.values());

  if (curveArray.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No curves imported yet.
        <br />
        <span className="text-xs mt-2 block">
          Import an SVG file to get started.
        </span>
      </div>
    );
  }

  const handleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const multiSelect = e.shiftKey || e.metaKey || e.ctrlKey;

    // If clicking already selected curve without multi-select, deselect it
    if (!multiSelect && selectedCurveIds.length === 1 && selectedCurveIds[0] === id) {
      clearSelection();
    } else {
      selectCurve(id, multiSelect);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCurve(id);
  };

  return (
    <div className="flex flex-col h-full">
      {selectedCurveIds.length > 0 && (
        <div className="px-3 py-2 bg-purple-500/10 border-b border-purple-500/20 text-xs text-purple-300">
          {selectedCurveIds.length} curve{selectedCurveIds.length > 1 ? 's' : ''} selected
          {selectedCurveIds.length >= 2 && (
            <span className="ml-2 text-purple-400">→ Loft available</span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {curveArray.map((curve) => {
          const isSelected = selectedCurveIds.includes(curve.id);

          return (
            <div
              key={curve.id}
              onClick={(e) => handleSelect(curve.id, e)}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                transition-colors group
                ${
                  isSelected
                    ? 'bg-purple-500/20 border border-purple-500/40'
                    : 'hover:bg-gray-800/50 border border-transparent'
                }
              `}
            >
              <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-yellow-400" />
              <span className="flex-1 text-sm text-gray-200 truncate">{curve.name}</span>
              <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-800 rounded">
                {curve.closed ? 'Closed' : 'Open'}
              </span>
              <span className="text-xs text-gray-500">
                {curve.points.length} pts
              </span>
              <button
                onClick={(e) => handleDelete(curve.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                title="Delete curve"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-[#27272A] text-xs text-[#A1A1AA]">
        Hold Shift to select multiple curves
      </div>
    </div>
  );
}
