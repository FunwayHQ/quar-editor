/**
 * Animation Settings Dialog Component
 *
 * Modal dialog for editing animation properties (name, duration).
 * Sprint 6: Animation System & Timeline
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X } from 'lucide-react';
import { Animation } from '../../types/animation';
import { useAnimationStore } from '../../stores/animationStore';
import { useCommandStore } from '../../stores/commandStore';
import { UpdateAnimationCommand } from '../../lib/commands/AnimationCommands';

interface AnimationSettingsDialogProps {
  isOpen: boolean;
  animation: Animation | null;
  onClose: () => void;
}

export function AnimationSettingsDialog({ isOpen, animation, onClose }: AnimationSettingsDialogProps) {
  const { updateAnimation } = useAnimationStore();
  const { executeCommand } = useCommandStore();

  const [name, setName] = useState('');
  const [duration, setDuration] = useState(5);

  // Initialize form values when animation changes
  useEffect(() => {
    if (animation) {
      setName(animation.name);
      setDuration(animation.duration);
    }
  }, [animation]);

  if (!isOpen || !animation) return null;

  const handleSave = () => {
    // Only update if values have changed
    const changes: Partial<Animation> = {};
    let hasChanges = false;

    if (name !== animation.name) {
      changes.name = name;
      hasChanges = true;
    }

    if (duration !== animation.duration) {
      changes.duration = Math.max(0.1, duration);
      hasChanges = true;
    }

    if (hasChanges) {
      const command = new UpdateAnimationCommand(
        animation.id,
        {
          name: animation.name,
          duration: animation.duration
        },
        changes
      );
      executeCommand(command);
    }

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="relative bg-[#18181B]/95 backdrop-blur-md border border-[#27272A] rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#7C3AED]/20 rounded-lg">
              <Settings className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <h2 className="text-lg font-semibold text-[#FAFAFA]">Animation Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#27272A] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[#A1A1AA]" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
              Animation Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-lg text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/50 transition-colors"
              placeholder="Enter animation name"
              autoFocus
            />
          </div>

          {/* Duration Field */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 0.1)}
              min="0.1"
              step="0.5"
              className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-lg text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/50 transition-colors"
              placeholder="Enter duration"
            />
            <p className="mt-1 text-xs text-[#71717A]">
              Minimum: 0.1s • Recommended: 1-10s
            </p>
          </div>

          {/* Stats */}
          <div className="p-3 bg-[#0A0A0B]/50 rounded-lg border border-[#27272A]">
            <h3 className="text-xs font-medium text-[#A1A1AA] mb-2">Animation Info</h3>
            <div className="space-y-1 text-xs text-[#71717A]">
              <div className="flex justify-between">
                <span>Tracks:</span>
                <span className="text-[#FAFAFA]">{animation.tracks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Keyframes:</span>
                <span className="text-[#FAFAFA]">
                  {animation.tracks.reduce((sum, t) => sum + t.keyframes.length, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="text-[#FAFAFA]">
                  {new Date(animation.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Hook for managing the settings dialog
export function useAnimationSettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [animation, setAnimation] = useState<Animation | null>(null);

  const openSettings = (anim: Animation) => {
    setAnimation(anim);
    setIsOpen(true);
  };

  const closeSettings = () => {
    setIsOpen(false);
    // Don't clear animation immediately to prevent flicker
    setTimeout(() => setAnimation(null), 200);
  };

  return {
    dialogProps: {
      isOpen,
      animation,
      onClose: closeSettings,
    },
    openSettings,
  };
}