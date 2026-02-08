/**
 * Knife Tool Panel Component
 *
 * UI for the knife cutting tool.
 * Mini-Sprint: Knife Tool Implementation
 */

import React, { useEffect, useRef } from 'react';
import { Scissors, Check, X } from 'lucide-react';
import { useKnifeToolStore } from '../../stores/knifeToolStore';
import { useEditModeStore } from '../../stores/editModeStore';
import { meshRegistry } from '../../lib/mesh/MeshRegistry';
import { MeshOperations } from '../../lib/mesh/MeshOperations';
import { useObjectsStore } from '../../stores/objectsStore';
import { useToastStore } from '../../stores/toastStore';

const { incrementGeometryVersion } = useEditModeStore.getState();

export function KnifeToolPanel() {
  const {
    isActive,
    cutMode,
    setCutMode,
    drawingPath,
    intersectionPoints,
    targetFaceIndex,
    confirmCut,
    cancelCut,
    deactivateTool,
  } = useKnifeToolStore();

  const { editingObjectId, setSelectionMode } = useEditModeStore();

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

    // Get QMesh from object store
    const sceneObject = useObjectsStore.getState().getObject(editingObjectId);
    if (!sceneObject || !sceneObject.qMesh) {
      console.error('[KnifeTool] QMesh not found');
      return;
    }

    const qMesh = sceneObject.qMesh;

    // Map BufferGeometry triangle index to QMesh face ID
    const faceId = qMesh.getFaceIdFromTriangleIndex(targetFaceIndex);
    if (!faceId) {
      console.error(`[KnifeTool] No QMesh face found for triangle ${targetFaceIndex}`);
      return;
    }

    console.log(`[KnifeTool] Cutting QMesh face ${faceId} (triangle index: ${targetFaceIndex})`);

    // Get cut points in world space
    const cutPoint1World = drawingPath[0];
    const cutPoint2World = drawingPath[1];

    // Convert to local space (QMesh vertices are in local space)
    const mesh = meshRegistry.getMesh(editingObjectId);
    if (!mesh) {
      console.error('[KnifeTool] Mesh not found in registry');
      return;
    }

    const cutPoint1Local = cutPoint1World.clone();
    const cutPoint2Local = cutPoint2World.clone();
    mesh.worldToLocal(cutPoint1Local);
    mesh.worldToLocal(cutPoint2Local);

    // Use the new QMesh-based knife cut
    try {
      const result = MeshOperations.knifeCutQMesh(
        editingObjectId,
        faceId,
        cutPoint1Local,
        cutPoint2Local
      );

      if (result.newFaceIds.length > 0) {
        console.log(`[KnifeTool] ✓ Cut successful - created ${result.newFaceIds.length} new faces: ${result.newFaceIds.join(', ')}`);

        // Force EditModeHelpers re-mount with fresh QMesh data
        incrementGeometryVersion();

        // Success - clean up
        confirmCut();
        deactivateTool();
      } else {
        console.warn('[KnifeTool] Cut failed - no new faces created');
        const message = result.error || 'Cut failed. Make sure the cut line crosses different edges.';
        useToastStore.getState().warning(message);
        cancelCut();
      }
    } catch (error) {
      console.error('[KnifeTool] Cut failed:', error);
      useToastStore.getState().error(`Cut failed: ${error}`);
      cancelCut();
    }
  };

  const handleCancel = () => {
    cancelCut();
  };

  const canConfirm = drawingPath.length >= 2 && intersectionPoints.length >= 1;

  // Auto-confirm when 2 points are placed
  const autoConfirmedRef = useRef(false);
  useEffect(() => {
    if (canConfirm && !autoConfirmedRef.current) {
      autoConfirmedRef.current = true;
      // Small delay so the UI briefly shows the 2-point state
      const timer = setTimeout(() => {
        handleConfirm();
      }, 100);
      return () => clearTimeout(timer);
    }
    if (!canConfirm) {
      autoConfirmedRef.current = false;
    }
  }, [canConfirm]);

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

      {/* Sprint Y: Cut Mode Toggle */}
      <div className="px-3 pt-3 pb-2 border-b border-[#27272A]">
        <label className="block text-xs text-[#A1A1AA] mb-2">Cut Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => setCutMode('quad')}
            className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
              cutMode === 'quad'
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#27272A] text-[#FAFAFA] hover:bg-[#3F3F46]'
            }`}
          >
            Quad
          </button>
          <button
            onClick={() => setCutMode('triangle')}
            className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
              cutMode === 'triangle'
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#27272A] text-[#FAFAFA] hover:bg-[#3F3F46]'
            }`}
          >
            Triangle
          </button>
        </div>
        <p className="mt-2 text-xs text-[#71717A]">
          {cutMode === 'quad'
            ? 'Cut will affect whole quad face (both triangles)'
            : 'Cut will affect single triangle only'}
        </p>
      </div>

      {/* Instructions */}
      <div className="p-3 space-y-2">
        <div className="text-xs text-[#A1A1AA]">
          <p className="mb-2">Click two points on the SAME {cutMode === 'quad' ? 'QUAD' : 'TRIANGLE'} to split it</p>
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
