/**
 * Mesh Operations Panel Component
 *
 * Shows available 2D-to-3D operations for selected curves.
 */

import React, { useState } from 'react';
import { Box, RotateCw, Layers3, Route } from 'lucide-react';
import { useCurveStore } from '../../stores/curveStore';
import { ExtrudeModal } from '../modals/ExtrudeModal';
import { RevolveModal } from '../modals/RevolveModal';
import { LoftModal } from '../modals/LoftModal';
import { SweepModal } from '../modals/SweepModal';

export function MeshOperationsPanel() {
  const selectedCurveIds = useCurveStore((state) => state.selectedCurveIds);
  const curves = useCurveStore((state) => state.curves);

  const [showExtrudeModal, setShowExtrudeModal] = useState(false);
  const [showRevolveModal, setShowRevolveModal] = useState(false);
  const [showLoftModal, setShowLoftModal] = useState(false);
  const [showSweepModal, setShowSweepModal] = useState(false);

  // Get selected curve info
  const selectedCurve = selectedCurveIds.length === 1 ? curves.get(selectedCurveIds[0]) : null;
  const multipleSelected = selectedCurveIds.length > 1;

  if (selectedCurveIds.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-[#A1A1AA] text-sm">
          Select a curve to see available operations
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-[#FAFAFA]">Mesh Operations</h3>
        <p className="text-xs text-[#A1A1AA]">
          {selectedCurveIds.length === 1
            ? `Selected: ${selectedCurve?.name}`
            : `${selectedCurveIds.length} curves selected`}
        </p>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Extrude */}
        <button
          onClick={() => setShowExtrudeModal(true)}
          disabled={selectedCurveIds.length !== 1}
          className="flex flex-col items-center gap-2 p-4 bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
        >
          <Box className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
          <span className="text-xs font-medium text-[#FAFAFA]">Extrude</span>
        </button>

        {/* Revolve */}
        <button
          onClick={() => setShowRevolveModal(true)}
          disabled={selectedCurveIds.length !== 1}
          className="flex flex-col items-center gap-2 p-4 bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
        >
          <RotateCw className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
          <span className="text-xs font-medium text-[#FAFAFA]">Revolve</span>
        </button>

        {/* Loft */}
        <button
          onClick={() => setShowLoftModal(true)}
          disabled={selectedCurveIds.length < 2}
          className="flex flex-col items-center gap-2 p-4 bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
        >
          <Layers3 className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
          <span className="text-xs font-medium text-[#FAFAFA]">Loft</span>
        </button>

        {/* Sweep */}
        <button
          onClick={() => setShowSweepModal(true)}
          disabled={selectedCurveIds.length !== 2}
          className="flex flex-col items-center gap-2 p-4 bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
        >
          <Route className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
          <span className="text-xs font-medium text-[#FAFAFA]">Sweep</span>
        </button>
      </div>

      {/* Curve Info */}
      {selectedCurve && (
        <div className="mt-4 p-3 bg-[#0A0A0B] rounded-lg border border-[#27272A] space-y-2">
          <div className="text-xs font-medium text-[#A1A1AA] uppercase">Curve Properties</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[#A1A1AA]">Type:</span>
              <span className="ml-2 text-[#FAFAFA]">{selectedCurve.closed ? 'Closed' : 'Open'}</span>
            </div>
            <div>
              <span className="text-[#A1A1AA]">Points:</span>
              <span className="ml-2 text-[#FAFAFA]">{selectedCurve.points.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-[#A1A1AA] space-y-1">
        <p>• <strong>Extrude:</strong> Linear depth (1 curve)</p>
        <p>• <strong>Revolve:</strong> Rotate around axis (1 curve)</p>
        <p>• <strong>Loft:</strong> Interpolate between curves (2+ curves)</p>
        <p>• <strong>Sweep:</strong> Extrude profile along path (2 curves)</p>
      </div>

      {/* Modals */}
      {showExtrudeModal && selectedCurve && (
        <ExtrudeModal
          curveId={selectedCurve.id}
          onClose={() => setShowExtrudeModal(false)}
        />
      )}

      {showRevolveModal && selectedCurve && (
        <RevolveModal
          curveId={selectedCurve.id}
          onClose={() => setShowRevolveModal(false)}
        />
      )}

      {showLoftModal && selectedCurveIds.length >= 2 && (
        <LoftModal
          curveIds={selectedCurveIds}
          onClose={() => setShowLoftModal(false)}
        />
      )}

      {showSweepModal && selectedCurveIds.length === 2 && (
        <SweepModal
          curveIds={selectedCurveIds}
          onClose={() => setShowSweepModal(false)}
        />
      )}
    </div>
  );
}
