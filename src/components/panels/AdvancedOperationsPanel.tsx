/**
 * Advanced Operations Panel Component
 *
 * Panel for professional modeling tools enabled by QMesh half-edge architecture:
 * - Loop Cut
 * - Edge Loop Selection
 * - Bevel
 * - Merge Vertices
 * - Dissolve Edges
 * - Spin (Rotational Extrusion)
 */

import { useState } from 'react';
import {
  Scissors,
  GitMerge,
  Circle,
  Repeat,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useEditModeStore } from '../../stores/editModeStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { MeshOperations } from '../../lib/mesh/MeshOperations';
import * as THREE from 'three';

export function AdvancedOperationsPanel() {
  const {
    isEditMode,
    editingObjectId,
    selectionMode,
    selectedVertices,
    selectedEdges,
    selectedFaces,
    hasSelection,
  } = useEditModeStore();

  const { objects } = useObjectsStore();

  // State for each operation
  const [loopCutPosition, setLoopCutPosition] = useState(0.5);
  const [bevelAmount, setBevelAmount] = useState(0.1);
  const [bevelSegments, setBevelSegments] = useState(1);
  const [spinAngle, setSpinAngle] = useState(Math.PI * 2); // 360 degrees
  const [spinSteps, setSpinSteps] = useState(8);
  const [spinAxis, setSpinAxis] = useState<'X' | 'Y' | 'Z'>('Z');

  // Only show in edit mode
  if (!isEditMode || !editingObjectId) return null;

  const editingObject = objects.get(editingObjectId);
  if (!editingObject || !editingObject.qMesh) return null;

  // Handler for Loop Cut
  const handleLoopCut = () => {
    if (selectionMode !== 'edge' || selectedEdges.size === 0) {
      console.warn('Loop Cut requires edge selection');
      return;
    }

    // Get first selected edge
    const firstEdge = Array.from(selectedEdges)[0];

    // Perform loop cut
    const result = MeshOperations.loopCutQMesh(
      editingObjectId,
      firstEdge,
      loopCutPosition
    );

    console.log('Loop cut completed:', result);
  };

  // Handler for Edge Loop Selection
  const handleSelectEdgeLoop = () => {
    if (selectionMode !== 'edge' || selectedEdges.size === 0) {
      console.warn('Edge Loop selection requires edge selection');
      return;
    }

    // Get first selected edge
    const firstEdge = Array.from(selectedEdges)[0];

    // Find edge loop
    const edgeLoop = MeshOperations.findEdgeLoop(editingObjectId, firstEdge);

    // Select entire loop
    setSelectedEdges(new Set(edgeLoop));

    console.log(`Selected edge loop with ${edgeLoop.length} edges`);
  };

  // Handler for Bevel
  const handleBevel = () => {
    if (selectionMode !== 'edge' || selectedEdges.size === 0) {
      console.warn('Bevel requires edge selection');
      return;
    }

    const edgeKeys = Array.from(selectedEdges);

    // Perform bevel
    const result = MeshOperations.bevelEdgesQMesh(
      editingObjectId,
      edgeKeys,
      bevelAmount,
      bevelSegments
    );

    // Select the new bevel faces
    setSelectedFaces(new Set(result.newFaceIds));

    console.log('Bevel completed:', result);
  };

  // Handler for Merge Vertices
  const handleMergeVertices = () => {
    if (selectionMode !== 'vertex' || selectedVertices.size < 2) {
      console.warn('Merge requires at least 2 vertices selected');
      return;
    }

    const vertexIds = Array.from(selectedVertices);

    // Perform merge
    const result = MeshOperations.mergeVerticesQMesh(editingObjectId, vertexIds);

    console.log('Merge completed:', result);
  };

  // Handler for Dissolve Edges
  const handleDissolveEdges = () => {
    if (selectionMode !== 'edge' || selectedEdges.size === 0) {
      console.warn('Dissolve requires edge selection');
      return;
    }

    const edgeKeys = Array.from(selectedEdges);

    // Perform dissolve
    const result = MeshOperations.dissolveEdgesQMesh(editingObjectId, edgeKeys);

    // Select the merged faces
    setSelectedFaces(new Set(result.mergedFaceIds));

    console.log('Dissolve completed:', result);
  };

  // Handler for Spin
  const handleSpin = () => {
    if (selectionMode !== 'face' || selectedFaces.size === 0) {
      console.warn('Spin requires face selection');
      return;
    }

    const faceIds = Array.from(selectedFaces);

    // Get axis vector
    const axisMap = {
      X: new THREE.Vector3(1, 0, 0),
      Y: new THREE.Vector3(0, 1, 0),
      Z: new THREE.Vector3(0, 0, 1),
    };
    const axis = axisMap[spinAxis];

    // Perform spin
    const result = MeshOperations.spinQMesh(
      editingObjectId,
      faceIds,
      axis,
      spinAngle,
      spinSteps
    );

    // Select the new faces
    setSelectedFaces(new Set(result.newFaceIds));

    console.log('Spin completed:', result);
  };

  // Don't show if no selection
  if (!hasSelection()) return null;

  return (
    <div className="absolute top-4 left-4 w-72 bg-[#18181B]/95 backdrop-blur-md border border-[#27272A] rounded-lg shadow-xl z-50">
      {/* Header */}
      <div className="p-3 border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#7C3AED]" />
          <h3 className="text-sm font-medium text-[#FAFAFA]">
            Advanced Tools
            <span className="ml-2 text-[10px] text-[#71717A]">
              ({selectionMode} mode)
            </span>
          </h3>
        </div>
        <div className="text-xs text-[#A1A1AA] mt-1">
          Professional modeling operations powered by Half-Edge topology
        </div>
      </div>

      {/* Operations */}
      <div className="p-3 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">

        {/* EDGE MODE OPERATIONS */}
        {selectionMode === 'edge' && selectedEdges.size > 0 && (
          <>
            {/* Select Edge Loop */}
            <div className="space-y-2 p-3 bg-[#0A0A0B] rounded border border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3 text-[#7C3AED]" />
                  <label className="text-xs font-medium text-[#FAFAFA]">
                    Select Edge Loop
                  </label>
                </div>
                <button
                  onClick={handleSelectEdgeLoop}
                  className="px-2 py-1 text-xs bg-[#7C3AED] text-white rounded hover:bg-[#6D28D9] transition-colors"
                >
                  Select Loop
                </button>
              </div>
              <p className="text-[10px] text-[#71717A]">
                Select all edges in a loop from one selected edge
              </p>
            </div>

            {/* Loop Cut */}
            <div className="space-y-2 p-3 bg-[#0A0A0B] rounded border border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-3 h-3 text-[#7C3AED]" />
                  <label className="text-xs font-medium text-[#FAFAFA]">
                    Loop Cut
                  </label>
                </div>
                <button
                  onClick={handleLoopCut}
                  className="px-2 py-1 text-xs bg-[#7C3AED] text-white rounded hover:bg-[#6D28D9] transition-colors"
                >
                  Apply
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#A1A1AA]">Position:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={loopCutPosition}
                  onChange={(e) => setLoopCutPosition(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                />
                <input
                  type="number"
                  value={loopCutPosition}
                  onChange={(e) => setLoopCutPosition(parseFloat(e.target.value) || 0.5)}
                  min="0"
                  max="1"
                  step="0.05"
                  className="w-14 px-2 py-1 text-xs bg-[#18181B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
              <p className="text-[10px] text-[#71717A]">
                Insert edge loop along selected edge
              </p>
            </div>

            {/* Bevel */}
            <div className="space-y-2 p-3 bg-[#0A0A0B] rounded border border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-3 h-3 text-[#7C3AED]" />
                  <label className="text-xs font-medium text-[#FAFAFA]">
                    Bevel
                  </label>
                </div>
                <button
                  onClick={handleBevel}
                  className="px-2 py-1 text-xs bg-[#7C3AED] text-white rounded hover:bg-[#6D28D9] transition-colors"
                >
                  Apply
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#A1A1AA] w-16">Amount:</span>
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={bevelAmount}
                    onChange={(e) => setBevelAmount(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                  />
                  <input
                    type="number"
                    value={bevelAmount}
                    onChange={(e) => setBevelAmount(parseFloat(e.target.value) || 0.1)}
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    className="w-14 px-2 py-1 text-xs bg-[#18181B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#A1A1AA] w-16">Segments:</span>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={bevelSegments}
                    onChange={(e) => setBevelSegments(parseInt(e.target.value))}
                    className="flex-1 h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                  />
                  <input
                    type="number"
                    value={bevelSegments}
                    onChange={(e) => setBevelSegments(parseInt(e.target.value) || 1)}
                    min="1"
                    max="4"
                    step="1"
                    className="w-14 px-2 py-1 text-xs bg-[#18181B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <p className="text-[10px] text-[#71717A]">
                Create beveled edges with rounded corners
              </p>
            </div>

            {/* Dissolve Edges */}
            <div className="space-y-2 p-3 bg-[#0A0A0B] rounded border border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-3 h-3 text-[#EF4444]" />
                  <label className="text-xs font-medium text-[#FAFAFA]">
                    Dissolve Edges
                  </label>
                </div>
                <button
                  onClick={handleDissolveEdges}
                  className="px-2 py-1 text-xs bg-[#EF4444] text-white rounded hover:bg-[#DC2626] transition-colors"
                >
                  Dissolve
                </button>
              </div>
              <p className="text-[10px] text-[#71717A]">
                Remove edges and merge adjacent faces
              </p>
            </div>
          </>
        )}

        {/* VERTEX MODE OPERATIONS */}
        {selectionMode === 'vertex' && selectedVertices.size >= 2 && (
          <>
            {/* Merge Vertices */}
            <div className="space-y-2 p-3 bg-[#0A0A0B] rounded border border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-3 h-3 text-[#7C3AED]" />
                  <label className="text-xs font-medium text-[#FAFAFA]">
                    Merge Vertices
                  </label>
                </div>
                <button
                  onClick={handleMergeVertices}
                  className="px-2 py-1 text-xs bg-[#7C3AED] text-white rounded hover:bg-[#6D28D9] transition-colors"
                >
                  Merge
                </button>
              </div>
              <p className="text-[10px] text-[#71717A]">
                Combine {selectedVertices.size} vertices into one at average position
              </p>
            </div>
          </>
        )}

        {/* FACE MODE OPERATIONS */}
        {selectionMode === 'face' && selectedFaces.size > 0 && (
          <>
            {/* Spin / Screw */}
            <div className="space-y-2 p-3 bg-[#0A0A0B] rounded border border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-3 h-3 text-[#7C3AED]" />
                  <label className="text-xs font-medium text-[#FAFAFA]">
                    Spin (Rotational Extrude)
                  </label>
                </div>
                <button
                  onClick={handleSpin}
                  className="px-2 py-1 text-xs bg-[#7C3AED] text-white rounded hover:bg-[#6D28D9] transition-colors"
                >
                  Apply
                </button>
              </div>

              <div className="space-y-2">
                {/* Axis Selection */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#A1A1AA] w-16">Axis:</span>
                  <div className="flex gap-1 flex-1">
                    {(['X', 'Y', 'Z'] as const).map((axis) => (
                      <button
                        key={axis}
                        onClick={() => setSpinAxis(axis)}
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                          spinAxis === axis
                            ? 'bg-[#7C3AED] text-white'
                            : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
                        }`}
                      >
                        {axis}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Angle */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#A1A1AA] w-16">Angle:</span>
                  <input
                    type="range"
                    min="0"
                    max={Math.PI * 2}
                    step="0.1"
                    value={spinAngle}
                    onChange={(e) => setSpinAngle(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                  />
                  <input
                    type="number"
                    value={(spinAngle * 180 / Math.PI).toFixed(0)}
                    onChange={(e) => setSpinAngle((parseFloat(e.target.value) || 360) * Math.PI / 180)}
                    min="0"
                    max="360"
                    step="15"
                    className="w-14 px-2 py-1 text-xs bg-[#18181B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                  />
                  <span className="text-[10px] text-[#71717A]">°</span>
                </div>

                {/* Steps */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#A1A1AA] w-16">Steps:</span>
                  <input
                    type="range"
                    min="3"
                    max="24"
                    step="1"
                    value={spinSteps}
                    onChange={(e) => setSpinSteps(parseInt(e.target.value))}
                    className="flex-1 h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                  />
                  <input
                    type="number"
                    value={spinSteps}
                    onChange={(e) => setSpinSteps(parseInt(e.target.value) || 8)}
                    min="3"
                    max="24"
                    step="1"
                    className="w-14 px-2 py-1 text-xs bg-[#18181B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <p className="text-[10px] text-[#71717A]">
                Create rotational extrusion around selected axis
              </p>
            </div>
          </>
        )}

        {/* Help Text */}
        <div className="pt-2 border-t border-[#27272A] text-xs text-[#71717A]">
          <p>💡 These operations use half-edge topology for clean results</p>
        </div>
      </div>

      {/* Slider Styles */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7C3AED;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7C3AED;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
