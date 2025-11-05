/**
 * Pose Mode Toolbar Component
 *
 * Provides UI controls for entering/exiting pose mode and manipulating bones.
 * Displays pose library and FK manipulation tools.
 */

import React from 'react';
import { Play, Square, RotateCcw, Copy, Clipboard, Plus } from 'lucide-react';
import { useBoneStore } from '../../stores/boneStore';
import { useObjectsStore } from '../../stores/objectsStore';

export function PoseModeToolbar() {
  const {
    isPoseMode,
    poseArmatureId,
    selectedBoneIds,
    enterPoseMode,
    exitPoseMode,
    resetPose,
    copyPose,
    pastePose,
    createBone,
  } = useBoneStore();

  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const objects = useObjectsStore((state) => state.objects);

  // Get the selected armature (if any)
  const selectedArmature = React.useMemo(() => {
    const selected = Array.from(selectedIds)
      .map(id => objects.get(id))
      .find(obj => obj?.type === 'armature');
    return selected;
  }, [selectedIds, objects]);

  // Handle entering pose mode
  const handleEnterPoseMode = () => {
    if (selectedArmature) {
      enterPoseMode(selectedArmature.id);
    }
  };

  // Handle exiting pose mode
  const handleExitPoseMode = () => {
    exitPoseMode();
  };

  // Handle reset pose
  const handleResetPose = () => {
    if (poseArmatureId) {
      resetPose();
    }
  };

  // Handle copy pose
  const handleCopyPose = () => {
    copyPose();
  };

  // Handle paste pose
  const handlePastePose = () => {
    // TODO: Store copied pose in component state
    const copiedPose = copyPose(); // Get current pose as reference
    pastePose(copiedPose);
  };

  // Handle add bone
  const handleAddBone = () => {
    if (poseArmatureId) {
      // If a bone is selected, add as child of that bone
      const parentId = selectedBoneIds.size > 0
        ? Array.from(selectedBoneIds)[0]
        : poseArmatureId;

      // Create bone at origin (user can move it with transform tools)
      createBone(parentId, [0, 0, 0]);
    }
  };

  // Don't show toolbar if no armature selected and not in pose mode
  if (!selectedArmature && !isPoseMode) {
    return null;
  }

  return (
    <div className="absolute top-20 left-4 bg-[#18181B] border border-[#27272A] rounded-lg p-3 shadow-lg z-10">
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="text-sm font-medium text-[#FAFAFA] mb-1">
          {isPoseMode ? 'Pose Mode' : 'Armature'}
        </div>

        {/* Mode Toggle */}
        {!isPoseMode && selectedArmature && (
          <button
            onClick={handleEnterPoseMode}
            className="flex items-center gap-2 px-3 py-2 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
            title="Enter Pose Mode (Tab)"
          >
            <Play className="w-4 h-4" />
            <span className="text-sm">Enter Pose Mode</span>
          </button>
        )}

        {isPoseMode && (
          <>
            {/* Exit Pose Mode */}
            <button
              onClick={handleExitPoseMode}
              className="flex items-center gap-2 px-3 py-2 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-colors"
              title="Exit Pose Mode (Tab)"
            >
              <Square className="w-4 h-4" />
              <span className="text-sm">Exit Pose Mode</span>
            </button>

            {/* Divider */}
            <div className="border-t border-[#27272A] my-1" />

            {/* Bone Tools */}
            <div className="text-xs text-[#A1A1AA] mb-1">Bone Tools</div>

            {/* Add Bone */}
            <button
              onClick={handleAddBone}
              className="flex items-center gap-2 px-3 py-2 rounded bg-[#10B981] hover:bg-[#059669] text-white transition-colors"
              title="Add new bone"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add Bone</span>
            </button>

            {/* Divider */}
            <div className="border-t border-[#27272A] my-1" />

            {/* Pose Controls */}
            <div className="text-xs text-[#A1A1AA] mb-1">Pose Controls</div>

            {/* Reset Pose */}
            <button
              onClick={handleResetPose}
              className="flex items-center gap-2 px-3 py-2 rounded bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] transition-colors"
              title="Reset to rest pose"
              disabled={selectedBoneIds.size === 0}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset Pose</span>
            </button>

            {/* Copy Pose */}
            <button
              onClick={handleCopyPose}
              className="flex items-center gap-2 px-3 py-2 rounded bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] transition-colors"
              title="Copy current pose"
            >
              <Copy className="w-4 h-4" />
              <span className="text-sm">Copy Pose</span>
            </button>

            {/* Paste Pose */}
            <button
              onClick={handlePastePose}
              className="flex items-center gap-2 px-3 py-2 rounded bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] transition-colors"
              title="Paste copied pose"
            >
              <Clipboard className="w-4 h-4" />
              <span className="text-sm">Paste Pose</span>
            </button>

            {/* Selection Info */}
            {selectedBoneIds.size > 0 && (
              <>
                <div className="border-t border-[#27272A] my-1" />
                <div className="text-xs text-[#A1A1AA]">
                  {selectedBoneIds.size} bone{selectedBoneIds.size !== 1 ? 's' : ''} selected
                </div>
              </>
            )}
          </>
        )}

        {/* Instructions */}
        <div className="border-t border-[#27272A] mt-1 pt-2">
          <div className="text-xs text-[#71717A]">
            {isPoseMode ? (
              <>
                <div>• Select bones to pose</div>
                <div>• Use transform tools to rotate/move</div>
                <div>• Press Tab to exit</div>
              </>
            ) : (
              <>
                <div>• Select armature</div>
                <div>• Press Tab or click button</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
