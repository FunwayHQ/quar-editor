/**
 * Context Menu Component
 *
 * Portal-rendered glassmorphism context menu at cursor position.
 * Supports submenus, keyboard shortcuts, and destructive item styling.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy, Trash2, Box, Circle, Triangle, Square,
  Layers, Eye, EyeOff, Edit3, ChevronRight,
  Clipboard, MousePointer2, Settings, Film,
  Minus, MousePointer,
} from 'lucide-react';
import { useContextMenuStore, ContextMenuContext } from '../stores/contextMenuStore';
import { useObjectsStore, ObjectType } from '../stores/objectsStore';
import { useAnimationStore } from '../stores/animationStore';
import { useCommandStore } from '../stores/commandStore';
import {
  CreateObjectCommand,
  DeleteObjectsCommand,
  DuplicateObjectsCommand,
  UpdateObjectCommand,
} from '../lib/commands/ObjectCommands';
import { GroupObjectsCommand } from '../lib/commands/GroupCommands';
import {
  CreateAnimationCommand,
  DeleteAnimationCommand,
  RemoveTrackCommand,
  RemoveKeyframeCommand,
  UpdateKeyframeCommand,
} from '../lib/commands/AnimationCommands';

interface MenuItem {
  label: string;
  icon?: React.ElementType;
  shortcut?: string;
  danger?: boolean;
  action?: () => void;
  submenu?: MenuItem[];
}

function buildMenuItems(
  context: ContextMenuContext,
  targetId: string | null,
  metadata: Record<string, any> | null,
  actions: {
    createObject: (type: ObjectType) => void;
    duplicateSelected: () => void;
    deleteSelected: () => void;
    groupSelected: () => void;
    selectAll: () => void;
    toggleVisibility: (id: string) => void;
    startRename: (id: string) => void;
    // Animation actions
    openAnimationSettings: (animationId: string) => void;
    duplicateAnimation: (animationId: string) => void;
    deleteAnimation: (animationId: string) => void;
    deleteTrack: (animationId: string, trackId: string) => void;
    setKeyframeInterpolation: (animationId: string, trackId: string, keyframeId: string, mode: 'linear' | 'bezier' | 'step') => void;
    deleteKeyframe: (animationId: string, trackId: string, keyframeId: string) => void;
    createAnimation: () => void;
    selectAllKeyframes: (animationId: string) => void;
  }
): MenuItem[] {
  const addSubmenu: MenuItem[] = [
    { label: 'Cube', icon: Box, action: () => actions.createObject('box') },
    { label: 'Sphere', icon: Circle, action: () => actions.createObject('sphere') },
    { label: 'Cylinder', action: () => actions.createObject('cylinder') },
    { label: 'Cone', icon: Triangle, action: () => actions.createObject('cone') },
    { label: 'Torus', action: () => actions.createObject('torus') },
    { label: 'Plane', icon: Square, action: () => actions.createObject('plane') },
  ];

  switch (context) {
    case 'viewport-empty':
      return [
        { label: 'Add', icon: Box, submenu: addSubmenu },
        { label: 'Select All', icon: MousePointer2, shortcut: 'Ctrl+A', action: actions.selectAll },
      ];

    case 'viewport-object':
      return [
        { label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D', action: actions.duplicateSelected },
        { label: 'Group', icon: Layers, shortcut: 'Ctrl+G', action: actions.groupSelected },
        { label: 'divider' } as any,
        { label: 'Delete', icon: Trash2, shortcut: 'Del', danger: true, action: actions.deleteSelected },
      ];

    case 'hierarchy':
      return [
        { label: 'Rename', icon: Edit3, shortcut: 'F2', action: () => targetId && actions.startRename(targetId) },
        { label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D', action: actions.duplicateSelected },
        {
          label: 'Toggle Visibility',
          icon: Eye,
          action: () => targetId && actions.toggleVisibility(targetId),
        },
        { label: 'divider' } as any,
        { label: 'Delete', icon: Trash2, shortcut: 'Del', danger: true, action: actions.deleteSelected },
      ];

    case 'hierarchy-empty':
      return [
        { label: 'Add', icon: Box, submenu: addSubmenu },
        { label: 'Select All', icon: MousePointer2, shortcut: 'Ctrl+A', action: actions.selectAll },
      ];

    case 'animation-item':
      return [
        { label: 'Settings', icon: Settings, action: () => targetId && actions.openAnimationSettings(targetId) },
        { label: 'Duplicate', icon: Copy, action: () => targetId && actions.duplicateAnimation(targetId) },
        { label: 'divider' } as any,
        { label: 'Delete', icon: Trash2, danger: true, action: () => targetId && actions.deleteAnimation(targetId) },
      ];

    case 'timeline-track':
      return [
        { label: 'Delete Track', icon: Trash2, danger: true, action: () => {
          const animId = metadata?.animationId;
          if (animId && targetId) actions.deleteTrack(animId, targetId);
        }},
      ];

    case 'timeline-keyframe': {
      const animId = metadata?.animationId;
      const trackId = metadata?.trackId;
      return [
        { label: 'Linear', icon: Minus, action: () => {
          if (animId && trackId && targetId) actions.setKeyframeInterpolation(animId, trackId, targetId, 'linear');
        }},
        { label: 'Bezier', action: () => {
          if (animId && trackId && targetId) actions.setKeyframeInterpolation(animId, trackId, targetId, 'bezier');
        }},
        { label: 'Step', action: () => {
          if (animId && trackId && targetId) actions.setKeyframeInterpolation(animId, trackId, targetId, 'step');
        }},
        { label: 'divider' } as any,
        { label: 'Delete Keyframe', icon: Trash2, danger: true, action: () => {
          if (animId && trackId && targetId) actions.deleteKeyframe(animId, trackId, targetId);
        }},
      ];
    }

    case 'timeline-empty':
      return [
        { label: 'Create Animation', icon: Film, action: actions.createAnimation },
        { label: 'Select All Keyframes', icon: MousePointer, action: () => {
          const animId = metadata?.animationId;
          if (animId) actions.selectAllKeyframes(animId);
        }},
      ];

    default:
      return [];
  }
}

function SubmenuPanel({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  return (
    <div className="context-menu absolute left-full top-0 ml-1">
      {items.map((item, i) => (
        <button
          key={i}
          className="context-menu-item w-full text-left"
          onClick={() => {
            item.action?.();
            onClose();
          }}
        >
          {item.icon && <item.icon className="w-4 h-4 text-text-secondary" />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ContextMenu() {
  const { isOpen, x, y, context, targetId, metadata, hideContextMenu } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);

  const createPrimitive = useObjectsStore((state) => state.createPrimitive);
  const executeCommand = useCommandStore((state) => state.executeCommand);
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const objects = useObjectsStore((state) => state.getAllObjects());
  const setSelectedIds = useObjectsStore((state) => state.setSelectedIds);

  const animationStore = useAnimationStore();

  // Rename callback - we just set a flag that the HierarchyPanel can pick up
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);

  const actions = {
    createObject: (type: ObjectType) => {
      const object = createPrimitive(type, [0, 0, 0]);
      const command = new CreateObjectCommand(object);
      executeCommand(command);
    },
    duplicateSelected: () => {
      if (selectedIds.length === 0) return;
      const command = new DuplicateObjectsCommand(selectedIds);
      executeCommand(command);
    },
    deleteSelected: () => {
      if (selectedIds.length === 0 && targetId) {
        const command = new DeleteObjectsCommand([targetId]);
        executeCommand(command);
      } else if (selectedIds.length > 0) {
        const command = new DeleteObjectsCommand(selectedIds);
        executeCommand(command);
      }
    },
    groupSelected: () => {
      if (selectedIds.length < 2) return;
      const command = new GroupObjectsCommand(selectedIds);
      executeCommand(command);
    },
    selectAll: () => {
      const allIds = objects.map((o) => o.id);
      setSelectedIds(allIds);
    },
    toggleVisibility: (id: string) => {
      const obj = objects.find((o) => o.id === id);
      if (!obj) return;
      const command = new UpdateObjectCommand(id, { visible: obj.visible }, { visible: !obj.visible });
      executeCommand(command);
    },
    startRename: (id: string) => {
      // Dispatch a custom event the HierarchyPanel can listen for
      window.dispatchEvent(new CustomEvent('quar-rename-object', { detail: { id } }));
    },

    // Animation actions
    openAnimationSettings: (animationId: string) => {
      const anim = animationStore.animations.get(animationId);
      if (anim) {
        window.dispatchEvent(new CustomEvent('quar-animation-settings', { detail: { animation: anim } }));
      }
    },
    duplicateAnimation: (animationId: string) => {
      const anim = animationStore.animations.get(animationId);
      if (!anim) return;
      const newAnim = animationStore.createAnimation(`${anim.name} (Copy)`, anim.duration);
      // Copy tracks with deep-cloned keyframes
      const tracksClone = anim.tracks.map(t => ({
        ...t,
        id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        keyframes: t.keyframes.map(k => ({
          ...k,
          id: `kf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })),
      }));
      const animWithTracks = { ...newAnim, tracks: tracksClone };
      const command = new CreateAnimationCommand(animWithTracks);
      executeCommand(command);
    },
    deleteAnimation: (animationId: string) => {
      const anim = animationStore.animations.get(animationId);
      if (!anim) return;
      if (animationId === animationStore.activeAnimationId) {
        animationStore.setActiveAnimation(null);
      }
      const command = new DeleteAnimationCommand(anim);
      executeCommand(command);
    },
    deleteTrack: (animationId: string, trackId: string) => {
      const anim = animationStore.animations.get(animationId);
      if (!anim) return;
      const track = anim.tracks.find(t => t.id === trackId);
      if (!track) return;
      const command = new RemoveTrackCommand(animationId, track);
      executeCommand(command);
    },
    setKeyframeInterpolation: (animationId: string, trackId: string, keyframeId: string, mode: 'linear' | 'bezier' | 'step') => {
      const anim = animationStore.animations.get(animationId);
      if (!anim) return;
      const track = anim.tracks.find(t => t.id === trackId);
      if (!track) return;
      const keyframe = track.keyframes.find(k => k.id === keyframeId);
      if (!keyframe) return;
      const updates: Partial<typeof keyframe> = { interpolation: mode };
      if (mode === 'bezier' && !keyframe.easing) {
        updates.easing = [0.42, 0, 0.58, 1];
      }
      const command = new UpdateKeyframeCommand(
        animationId, trackId, keyframeId,
        { interpolation: keyframe.interpolation, easing: keyframe.easing },
        updates
      );
      executeCommand(command);
    },
    deleteKeyframe: (animationId: string, trackId: string, keyframeId: string) => {
      const anim = animationStore.animations.get(animationId);
      if (!anim) return;
      const track = anim.tracks.find(t => t.id === trackId);
      if (!track) return;
      const keyframe = track.keyframes.find(k => k.id === keyframeId);
      if (!keyframe) return;
      const command = new RemoveKeyframeCommand(animationId, trackId, keyframe);
      executeCommand(command);
    },
    createAnimation: () => {
      const newAnim = animationStore.createAnimation('New Animation', 5);
      const command = new CreateAnimationCommand(newAnim);
      executeCommand(command);
    },
    selectAllKeyframes: (animationId: string) => {
      window.dispatchEvent(new CustomEvent('quar-select-all-keyframes', { detail: { animationId } }));
    },
  };

  // Adjust position to stay on screen
  useEffect(() => {
    if (!isOpen || !menuRef.current) {
      setAdjustedPos({ x, y });
      return;
    }

    const rect = menuRef.current.getBoundingClientRect();
    const padding = 8;
    let adjX = x;
    let adjY = y;

    if (x + rect.width > window.innerWidth - padding) {
      adjX = window.innerWidth - rect.width - padding;
    }
    if (y + rect.height > window.innerHeight - padding) {
      adjY = window.innerHeight - rect.height - padding;
    }

    setAdjustedPos({ x: adjX, y: adjY });
  }, [isOpen, x, y]);

  // Close on escape, click-outside, scroll
  const handleClose = useCallback(() => {
    hideContextMenu();
    setActiveSubmenu(null);
  }, [hideContextMenu]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    const handleScroll = () => handleClose();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, handleClose]);

  if (!isOpen || !context) return null;

  const items = buildMenuItems(context, targetId, metadata, actions);

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu fixed z-[9999]"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      {items.map((item, i) => {
        if (item.label === 'divider') {
          return <div key={i} className="context-menu-divider" />;
        }

        if (item.submenu) {
          return (
            <div
              key={i}
              className="relative"
              onMouseEnter={() => setActiveSubmenu(i)}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <div className="context-menu-submenu-trigger">
                {item.icon && <item.icon className="w-4 h-4 text-text-secondary" />}
                <span>{item.label}</span>
                <ChevronRight className="w-3 h-3 ml-auto text-text-tertiary" />
              </div>
              {activeSubmenu === i && (
                <SubmenuPanel items={item.submenu} onClose={handleClose} />
              )}
            </div>
          );
        }

        return (
          <button
            key={i}
            className="context-menu-item w-full text-left"
            data-danger={item.danger || undefined}
            onClick={() => {
              item.action?.();
              handleClose();
            }}
          >
            {item.icon && (
              <item.icon className={`w-4 h-4 ${item.danger ? '' : 'text-text-secondary'}`} />
            )}
            <span>{item.label}</span>
            {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
