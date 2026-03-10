/**
 * MenuBar Component
 *
 * Application menu bar matching the QUAR Animator/Artist design language.
 * Horizontal menu: Logo | File | Edit | View | Object | Export | Help | [project name]
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { useObjectsStore } from '../stores/objectsStore';
import { useCommandStore } from '../stores/commandStore';
import { useEditModeStore } from '../stores/editModeStore';
import { useSceneStore } from '../stores/sceneStore';
import { useToastStore } from '../stores/toastStore';
import { serializeScene } from '../services/sceneSerializer';
import { getStorageAdapter, ProjectData } from '../lib/storage';

// ── Types ──────────────────────────────────────────────────────────────

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

// ── Props ──────────────────────────────────────────────────────────────

interface MenuBarProps {
  project: ProjectData | null;
  onProjectUpdate?: (project: ProjectData) => void;
  onSave: () => void;
  onExport: () => void;
  onDownloadQuar: () => void;
  onShowAddMenu: () => void;
  isSaving?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function MenuBar({
  project,
  onProjectUpdate,
  onSave,
  onExport,
  onDownloadQuar,
  onShowAddMenu,
  isSaving,
}: MenuBarProps) {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const { undo, redo, canUndo, canRedo } = useCommandStore();
  const { isEditMode, toggleEditMode, setSelectionMode } = useEditModeStore();
  const { selectedIds, clearSelection, selectAll, deleteObjects, duplicateObjects } = useObjectsStore();
  const { showGrid, showAxes, showStats, toggleGrid, toggleAxes, toggleStats, shadingMode, setShadingMode } = useSceneStore();
  const toast = useToastStore();

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // ── Menu definitions ───────────────────────────────────────────────

  const fileMenu: MenuItem[] = [
    { label: 'New Project', shortcut: 'Ctrl+N', action: () => { navigate('/'); } },
    { label: 'Open Project...', shortcut: 'Ctrl+O', action: () => { navigate('/'); } },
    { separator: true, label: '' },
    { label: 'Save', shortcut: 'Ctrl+S', action: onSave, disabled: isSaving },
    { separator: true, label: '' },
    { label: 'Download as .quar', action: onDownloadQuar },
    { label: 'Import .quar...', action: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.quar';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data.version || !data.scene) throw new Error('Invalid .quar format');
          toast.success(`Imported ${file.name}`);
        } catch {
          toast.error('Failed to import .quar file');
        }
      };
      input.click();
    }},
    { label: 'Import 3D Model...', shortcut: 'Ctrl+I', action: () => {
      // Trigger the FileImport component's file picker
      const importBtn = document.querySelector('[data-import-trigger]') as HTMLButtonElement;
      if (importBtn) importBtn.click();
    }},
  ];

  const editMenu: MenuItem[] = [
    { label: 'Undo', shortcut: 'Ctrl+Z', action: undo, disabled: !canUndo() },
    { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: redo, disabled: !canRedo() },
    { separator: true, label: '' },
    { label: 'Select All', shortcut: 'Ctrl+A', action: () => selectAll() },
    { label: 'Deselect All', shortcut: 'Esc', action: clearSelection },
    { separator: true, label: '' },
    { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => {
      if (selectedIds.length > 0) duplicateObjects(selectedIds);
    }, disabled: selectedIds.length === 0 },
    { label: 'Delete', shortcut: 'Del', action: () => {
      if (selectedIds.length > 0) deleteObjects(selectedIds);
    }, disabled: selectedIds.length === 0, danger: true },
  ];

  const viewMenu: MenuItem[] = [
    { label: showGrid ? 'Hide Grid' : 'Show Grid', action: toggleGrid },
    { label: showAxes ? 'Hide Axes' : 'Show Axes', action: toggleAxes },
    { label: showStats ? 'Hide Stats' : 'Show Stats', action: toggleStats },
    { separator: true, label: '' },
    { label: 'Wireframe', action: () => setShadingMode('wireframe'), disabled: shadingMode === 'wireframe' },
    { label: 'Solid', action: () => setShadingMode('solid'), disabled: shadingMode === 'solid' },
    { label: 'Material', action: () => setShadingMode('material'), disabled: shadingMode === 'material' },
  ];

  const objectMenu: MenuItem[] = [
    { label: 'Add...', shortcut: 'Shift+A', action: onShowAddMenu },
    { separator: true, label: '' },
    { label: 'Toggle Edit Mode', shortcut: 'Tab', action: () => {
      if (selectedIds.length > 0) toggleEditMode(selectedIds[0]);
    }, disabled: selectedIds.length === 0 },
    { separator: true, label: '' },
    ...(isEditMode ? [
      { label: 'Vertex Mode', shortcut: '1', action: () => setSelectionMode('vertex') },
      { label: 'Edge Mode', shortcut: '2', action: () => setSelectionMode('edge') },
      { label: 'Face Mode', shortcut: '3', action: () => setSelectionMode('face') },
    ] as MenuItem[] : []),
  ];

  const exportMenu: MenuItem[] = [
    { label: 'Export Scene...', shortcut: 'Ctrl+E', action: onExport },
    { separator: true, label: '' },
    { label: 'Download .quar', action: onDownloadQuar },
  ];

  const helpMenu: MenuItem[] = [
    { label: 'Keyboard Shortcuts', shortcut: '?', action: () => toast.info('Keyboard shortcuts: W/E/R = Move/Rotate/Scale, Tab = Edit Mode, Shift+A = Add, Space = Play') },
    { separator: true, label: '' },
    { label: 'Help & Guide', action: () => navigate('/help') },
    { label: 'About QUAR Editor', action: () => toast.info('QUAR Editor v0.1.0 — Open Source 3D Design Platform') },
  ];

  const menus: MenuGroup[] = [
    { label: 'File', items: fileMenu },
    { label: 'Edit', items: editMenu },
    { label: 'View', items: viewMenu },
    { label: 'Object', items: objectMenu },
    { label: 'Export', items: exportMenu },
    { label: 'Help', items: helpMenu },
  ];

  // ── Handlers ───────────────────────────────────────────────────────

  const handleMenuClick = useCallback((label: string) => {
    setActiveMenu(prev => prev === label ? null : label);
  }, []);

  const handleMenuHover = useCallback((label: string) => {
    if (activeMenu !== null) {
      setActiveMenu(label);
    }
  }, [activeMenu]);

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.disabled || item.separator) return;
    item.action?.();
    setActiveMenu(null);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <header
      ref={menuBarRef}
      className="menu-bar flex items-center h-10 px-2 select-none relative z-50"
      style={{
        backgroundColor: 'rgba(10, 10, 11, 0.97)',
        borderBottom: '1px solid rgba(39, 39, 42, 0.6)',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center mr-1 px-1.5 py-1 rounded hover:bg-white/5 transition-colors"
        title="Back to projects"
      >
        <img src="/logo-dark.svg" alt="QUAR Editor" className="h-6" />
      </button>

      <div className="w-px h-5 bg-[#27272A]/60 mx-1" />

      {/* Menu buttons */}
      <nav className="flex items-center">
        {menus.map((menu) => (
          <div key={menu.label} className="relative">
            <button
              className={`menu-bar-btn px-3 py-1 text-[13px] rounded transition-colors ${
                activeMenu === menu.label
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/5'
              }`}
              onClick={() => handleMenuClick(menu.label)}
              onMouseEnter={() => handleMenuHover(menu.label)}
            >
              {menu.label}
            </button>

            {/* Dropdown */}
            {activeMenu === menu.label && (
              <div
                className="absolute top-full left-0 mt-0.5 min-w-[220px] py-1 rounded-lg border border-[#333] shadow-xl"
                style={{
                  backgroundColor: 'rgba(26, 26, 29, 0.97)',
                  backdropFilter: 'blur(12px)',
                  animation: 'menu-dropdown-appear 0.1s ease-out',
                }}
              >
                {menu.items.map((item, idx) =>
                  item.separator ? (
                    <div key={`sep-${idx}`} className="my-1 mx-2 border-t border-[#333]" />
                  ) : (
                    <button
                      key={item.label}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-[13px] transition-colors ${
                        item.disabled
                          ? 'text-[#52525B] cursor-default'
                          : item.danger
                          ? 'text-[#F87171] hover:bg-red-500/10'
                          : 'text-[#E4E4E7] hover:bg-white/7'
                      }`}
                      onClick={() => handleItemClick(item)}
                      disabled={item.disabled}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[11px] text-[#52525B] ml-6 font-mono">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project name (right side, matching Animator pattern) */}
      {project && (
        <div
          className="px-3 py-1 text-[13px] text-[#71717A] border border-[#27272A]/60 rounded"
          style={{ backgroundColor: 'rgba(24, 24, 27, 0.5)' }}
        >
          <input
            type="text"
            value={project.name}
            onChange={(e) => onProjectUpdate?.({ ...project, name: e.target.value })}
            className="bg-transparent border-none outline-none text-[#A1A1AA] text-[13px] w-[140px] text-center focus:text-[#FAFAFA]"
            title="Click to rename project"
          />
        </div>
      )}
    </header>
  );
}
