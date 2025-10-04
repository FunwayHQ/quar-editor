/**
 * Knife Tool Panel Component
 *
 * UI for the knife cutting tool.
 * Mini-Sprint: Knife Tool Implementation
 */

import React from 'react';
import { Scissors, Check, X } from 'lucide-react';
import { useKnifeToolStore } from '../../stores/knifeToolStore';
import { useEditModeStore } from '../../stores/editModeStore';
import { useCommandStore } from '../../stores/commandStore';
import { meshRegistry } from '../../lib/mesh/MeshRegistry';
import { projectCutOntoFace } from '../../lib/geometry/IntersectionUtils';
import { MeshOperations } from '../../lib/mesh/MeshOperations';
import { KnifeCutCommand } from '../../lib/commands/KnifeCutCommand';

export function KnifeToolPanel() {
  const {
    isActive,
    drawingPath,
    intersectionPoints,
    targetFaceIndex,
    confirmCut,
    cancelCut,
    deactivateTool,
  } = useKnifeToolStore();

  const { editingObjectId, setSelectionMode } = useEditModeStore();
  const { executeCommand } = useCommandStore();

  if (!isActive || !editingObjectId) {
    return null;
  }

  const handleConfirm = () => {
    if (drawingPath.length < 2) {
      console.warn('[KnifeTool] Need at least 2 points to cut');
      return;
    }

    if (targetFaceIndex === null) {
      console.warn('[KnifeTool] No target face selected');
      return;
    }

    // Get mesh
    const mesh = meshRegistry.getMesh(editingObjectId);
    if (!mesh || !mesh.geometry) {
      console.error('[KnifeTool] Mesh not found');
      return;
    }

    // Use projection-based cutting
    try {
      // Project cut onto face and find edge intersections
      const edgeIntersections = projectCutOntoFace(
        drawingPath[0],
        drawingPath[1],
        targetFaceIndex,
        mesh.geometry,
        mesh
      );

      if (edgeIntersections.length !== 2) {
        console.warn('[KnifeTool] Cut must cross exactly 2 edges of the face. Found:', edgeIntersections.length);
        alert(`Cut didn't cross the face properly. Try clicking opposite edges of the face.\nFound ${edgeIntersections.length} edge crossings, need 2.`);
        return;
      }

      console.log('[KnifeTool] Applying surface-projected cut...');
      console.log('[KnifeTool] Cut intersects edges:', edgeIntersections.map(e => e.edgeIndex));

      // Apply the cut directly using edge intersections
      // Convert points from world space to local space
      const cutIntersections = edgeIntersections.map(ei => {
        const localPoint = ei.point.clone();
        mesh.worldToLocal(localPoint);
        return {
          point: localPoint,
          faceIndex: targetFaceIndex,
          edgeIndex: ei.edgeIndex,
        };
      });

      console.log('[KnifeTool] Cut points in local space:', cutIntersections.map(c => c.point.toArray()));

      // Create a simple command that stores before/after
      const originalGeo = mesh.geometry.clone();

      MeshOperations.knifeCut(mesh.geometry, cutIntersections);

      // Force update
      mesh.geometry.attributes.position.needsUpdate = true;
      if (mesh.geometry.index) mesh.geometry.index.needsUpdate = true;
      if (mesh.geometry.attributes.normal) mesh.geometry.attributes.normal.needsUpdate = true;

      console.log('[KnifeTool] Knife cut applied successfully');

      // Clear the path
      confirmCut();

      // Deactivate knife tool and switch to edge mode to show new edges
      deactivateTool();
      setSelectionMode('edge');

      console.log('[KnifeTool] Switched to edge mode to show new cut edge');
    } catch (error) {
      console.error('[KnifeTool] Failed to apply knife cut:', error);
      alert('Knife cut failed. See console for details.');
    }
  };

  const handleCancel = () => {
    cancelCut();
  };

  const canConfirm = drawingPath.length >= 2 && intersectionPoints.length >= 1;

  console.log('[KnifeToolPanel] Render - canConfirm:', canConfirm, 'points:', drawingPath.length, 'intersections:', intersectionPoints.length);

  return (
    <div className="absolute top-20 right-4 w-64 bg-[#18181B]/95 backdrop-blur-md border border-[#27272A] rounded-lg shadow-xl">
      {/* Header */}
      <div className="p-3 border-b border-[#27272A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-sm font-medium text-[#FAFAFA]">Knife Tool</h3>
          </div>
          <button
            onClick={deactivateTool}
            className="p-1 rounded hover:bg-[#27272A] transition-colors"
            title="Close Knife Tool"
          >
            <X className="w-3.5 h-3.5 text-[#A1A1AA]" />
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-3 space-y-2">
        <div className="text-xs text-[#A1A1AA]">
          <p className="mb-2">Click two points on the SAME FACE to split it</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
              <span>Green wireframe shows edges</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
              <span>Points snap to edges</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
              <span className="text-[#F59E0B]">Need 2 cuts on same face!</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-2 bg-[#0A0A0B] rounded border border-[#27272A]">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#71717A]">Points:</span>{' '}
              <span className="text-[#FAFAFA] font-medium">{drawingPath.length}</span>
            </div>
            <div>
              <span className="text-[#71717A]">Intersections:</span>{' '}
              <span className="text-[#FAFAFA] font-medium">{intersectionPoints.length}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {drawingPath.length > 0 && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 px-3 py-2 bg-[#10B981] text-white rounded hover:bg-[#059669] disabled:bg-[#27272A] disabled:text-[#71717A] transition-colors flex items-center justify-center gap-2"
              title="Apply knife cut"
            >
              <Check className="w-4 h-4" />
              Confirm
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-2 bg-[#27272A] text-[#FAFAFA] rounded hover:bg-[#3F3F46] transition-colors flex items-center justify-center gap-2"
              title="Cancel cut (Esc)"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div className="p-3 border-t border-[#27272A] text-xs text-[#71717A]">
        <p>Press K to toggle knife tool</p>
        <p className="mt-1">Press Esc to cancel cut</p>
      </div>
    </div>
  );
}
