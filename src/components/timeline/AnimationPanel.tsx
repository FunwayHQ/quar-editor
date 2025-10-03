/**
 * Animation Panel Component
 *
 * Panel for managing animation settings (name, duration, delete).
 * Sprint 6: Animation System & Timeline
 */

import React, { useState } from 'react';
import { Film, Trash2, Plus, Edit3, ChevronDown, ChevronRight } from 'lucide-react';
import { useAnimationStore } from '../../stores/animationStore';
import { useCommandStore } from '../../stores/commandStore';
import { CreateAnimationCommand, DeleteAnimationCommand, UpdateAnimationCommand } from '../../lib/commands/AnimationCommands';

export function AnimationPanel() {
  const {
    animations,
    activeAnimationId,
    setActiveAnimation,
    createAnimation,
    deleteAnimation,
    updateAnimation,
  } = useAnimationStore();

  const { executeCommand } = useCommandStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeAnimation = activeAnimationId ? animations.get(activeAnimationId) : null;
  const allAnimations = Array.from(animations.values());

  const handleCreateAnimation = () => {
    const animation = createAnimation('New Animation', 5);
    const command = new CreateAnimationCommand(animation);
    executeCommand(command);
  };

  const handleDeleteAnimation = () => {
    if (!activeAnimation) return;
    if (!confirm(`Delete animation "${activeAnimation.name}"?`)) return;

    const command = new DeleteAnimationCommand(activeAnimation);
    executeCommand(command);
  };

  const handleStartEdit = () => {
    if (!activeAnimation) return;
    setEditName(activeAnimation.name);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!activeAnimation || !editName.trim()) {
      setIsEditing(false);
      return;
    }

    const command = new UpdateAnimationCommand(
      activeAnimation.id,
      { name: activeAnimation.name },
      { name: editName.trim() }
    );
    executeCommand(command);
    setIsEditing(false);
  };

  const handleDurationChange = (duration: number) => {
    if (!activeAnimation) return;

    const command = new UpdateAnimationCommand(
      activeAnimation.id,
      { duration: activeAnimation.duration },
      { duration: Math.max(0.1, duration) }
    );
    executeCommand(command);
  };

  return (
    <div className="w-64 border-r border-[#27272A] flex flex-col bg-[#0A0A0B]/50">
      {/* Header */}
      <div className="p-3 border-b border-[#27272A] flex items-center justify-between">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
          )}
          <Film className="w-4 h-4 text-[#7C3AED]" />
          <h3 className="text-xs font-medium text-[#FAFAFA]">Animations</h3>
        </button>
        <button
          onClick={handleCreateAnimation}
          className="p-1 rounded hover:bg-[#27272A] transition-colors"
          title="Create Animation"
        >
          <Plus className="w-4 h-4 text-[#7C3AED]" />
        </button>
      </div>

      {/* Animation List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto min-h-0">
        {allAnimations.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-[#A1A1AA] mb-2">No animations</p>
            <button
              onClick={handleCreateAnimation}
              className="px-3 py-1.5 bg-[#7C3AED] text-white text-xs rounded hover:bg-[#6D28D9] transition-colors"
            >
              Create First Animation
            </button>
          </div>
        ) : (
          allAnimations.map((anim) => (
            <div
              key={anim.id}
              onClick={() => setActiveAnimation(anim.id)}
              className={`p-3 border-b border-[#27272A]/50 cursor-pointer transition-colors ${
                anim.id === activeAnimationId
                  ? 'bg-[#7C3AED]/20 border-l-2 border-l-[#7C3AED]'
                  : 'hover:bg-[#27272A]/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[#FAFAFA] font-medium">{anim.name}</span>
                {anim.id === activeAnimationId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnimation();
                    }}
                    className="p-1 rounded hover:bg-[#EF4444]/20 transition-colors"
                    title="Delete Animation"
                  >
                    <Trash2 className="w-3 h-3 text-[#EF4444]" />
                  </button>
                )}
              </div>
              <div className="text-xs text-[#A1A1AA]">
                {anim.duration.toFixed(1)}s • {anim.tracks.length} tracks
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {/* Active Animation Settings */}
      {!isCollapsed && activeAnimation && (
        <div className="border-t border-[#27272A] p-3 pb-6">
          <h4 className="text-xs font-medium text-[#FAFAFA] mb-3">Settings</h4>

          {/* Name */}
          <div className="mb-3">
            <label className="block text-xs text-[#A1A1AA] mb-1">Name</label>
            {isEditing ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  autoFocus
                  className="flex-1 px-2 py-1 text-xs bg-[#18181B] border border-[#7C3AED] rounded text-[#FAFAFA] focus:outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="flex-1 px-2 py-1 text-xs bg-[#18181B] border border-[#27272A] rounded text-[#FAFAFA]">
                  {activeAnimation.name}
                </span>
                <button
                  onClick={handleStartEdit}
                  className="p-1 rounded hover:bg-[#27272A] transition-colors"
                  title="Edit Name"
                >
                  <Edit3 className="w-3 h-3 text-[#A1A1AA]" />
                </button>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="mb-6">
            <label className="block text-xs text-[#A1A1AA] mb-1">Duration (seconds)</label>
            <input
              type="number"
              value={activeAnimation.duration || 10}
              onChange={(e) => handleDurationChange(parseFloat(e.target.value) || 10)}
              min="0.1"
              step="0.5"
              className="w-full px-2 py-1 text-xs bg-[#18181B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Stats */}
          <div className="text-xs text-[#71717A] mb-4">
            <div>Tracks: {activeAnimation.tracks.length}</div>
            <div>
              Keyframes: {activeAnimation.tracks.reduce((sum, t) => sum + t.keyframes.length, 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
