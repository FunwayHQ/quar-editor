/**
 * Animation Panel Component
 *
 * Panel for managing animation settings (name, duration, delete).
 * Sprint 6: Animation System & Timeline
 */

import React, { useState } from 'react';
import { Film, Trash2, Plus, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { useAnimationStore } from '../../stores/animationStore';
import { useCommandStore } from '../../stores/commandStore';
import { useContextMenuStore } from '../../stores/contextMenuStore';
import { CreateAnimationCommand, DeleteAnimationCommand } from '../../lib/commands/AnimationCommands';
import { ConfirmDialog, useConfirmDialog } from '../ConfirmDialog';
import { AnimationSettingsDialog, useAnimationSettingsDialog } from './AnimationSettingsDialog';

export function AnimationPanel() {
  const {
    animations,
    activeAnimationId,
    setActiveAnimation,
    createAnimation,
    updateAnimation,
  } = useAnimationStore();

  const { executeCommand } = useCommandStore();
  const { dialogProps, showConfirm } = useConfirmDialog();
  const { dialogProps: settingsDialogProps, openSettings } = useAnimationSettingsDialog();
  const showContextMenu = useContextMenuStore((state) => state.showContextMenu);

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Listen for animation settings event from context menu
  React.useEffect(() => {
    const handler = (e: Event) => {
      const anim = (e as CustomEvent).detail?.animation;
      if (anim) openSettings(anim);
    };
    window.addEventListener('quar-animation-settings', handler);
    return () => window.removeEventListener('quar-animation-settings', handler);
  }, [openSettings]);

  const activeAnimation = activeAnimationId ? animations.get(activeAnimationId) : null;
  const allAnimations = Array.from(animations.values());

  const handleCreateAnimation = () => {
    const animation = createAnimation('New Animation', 5);
    const command = new CreateAnimationCommand(animation);
    executeCommand(command);
  };


  return (
    <>
      <div className="w-64 border-r border-[#27272A] flex flex-col bg-[#0A0A0B]/50 h-full">
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
        <div className="overflow-y-auto border-b border-[#27272A]" style={{ maxHeight: '200px', minHeight: allAnimations.length > 0 ? 'auto' : '0' }}>
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
          allAnimations.map((anim) => {
            return (
              <div
                key={anim.id}
                className={`group p-3 border-b border-[#27272A]/50 transition-colors ${
                  anim.id === activeAnimationId
                    ? 'bg-[#7C3AED]/20 border-l-2 border-l-[#7C3AED]'
                    : 'hover:bg-[#27272A]/30'
                }`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveAnimation(anim.id);
                  showContextMenu(e.clientX, e.clientY, 'animation-item', anim.id);
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-sm text-[#FAFAFA] font-medium flex-1 cursor-pointer"
                    onClick={() => {
                      console.log('[AnimationPanel] Selecting animation:', anim.name);
                      setActiveAnimation(anim.id);
                    }}
                  >
                    {anim.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSettings(anim);
                      }}
                      className="p-1 rounded hover:bg-[#7C3AED]/20 transition-all"
                      title="Animation Settings"
                    >
                      <Settings className="w-3 h-3 text-[#7C3AED]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirm({
                          title: 'Delete Animation',
                          message: `Are you sure you want to delete "${anim.name}"? This action cannot be undone.`,
                          variant: 'danger',
                          icon: Trash2,
                          confirmLabel: 'Delete',
                          cancelLabel: 'Cancel',
                          onConfirm: () => {
                            // If deleting active animation, clear selection first
                            if (anim.id === activeAnimationId) {
                              setActiveAnimation(null);
                            }
                            const command = new DeleteAnimationCommand(anim);
                            executeCommand(command);
                          },
                        });
                      }}
                      className="p-1 rounded hover:bg-[#EF4444]/20 transition-all"
                      title="Delete Animation"
                    >
                      <Trash2 className="w-3 h-3 text-[#EF4444]" />
                    </button>
                  </div>
                </div>
                <div
                  className="text-xs text-[#A1A1AA] cursor-pointer"
                  onClick={() => setActiveAnimation(anim.id)}
                >
                  {anim.duration.toFixed(1)}s • {anim.tracks.length} tracks
                </div>
              </div>
            );
          })
        )}
        </div>
      )}

      {/* Active Animation Quick Actions */}
      {!isCollapsed && activeAnimation && (
        <div className="border-t border-[#27272A] p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-[#FAFAFA]">Active Animation</h4>
            <button
              onClick={() => openSettings(activeAnimation)}
              className="p-1.5 rounded hover:bg-[#27272A] transition-colors"
              title="Animation Settings"
            >
              <Settings className="w-4 h-4 text-[#7C3AED]" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="text-xs text-[#71717A] space-y-1">
            <div>{activeAnimation.name}</div>
            <div>{activeAnimation.duration.toFixed(1)}s • {activeAnimation.tracks.length} tracks</div>
            <div>{activeAnimation.tracks.reduce((sum, t) => sum + t.keyframes.length, 0)} keyframes</div>
          </div>
        </div>
      )}
    </div>

    <ConfirmDialog {...dialogProps} />
    <AnimationSettingsDialog {...settingsDialogProps} />
    </>
  );
}
