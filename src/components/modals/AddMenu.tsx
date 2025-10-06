/**
 * Add Menu Component
 *
 * Professional quick-add menu triggered by Shift+A (Blender standard)
 * Sprint Y: Professional UX & Critical Fixes
 */

import React, { useState, useEffect, useRef } from 'react';
import { useObjectsStore, ObjectType } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { CreateObjectCommand } from '../../lib/commands/ObjectCommands';
import {
  Box,
  Circle,
  Cylinder as CylinderIcon,
  Triangle,
  Torus as TorusIcon,
  Square,
  Lightbulb,
  Zap,
  Sun,
  CloudSun,
  Folder,
  Search,
} from 'lucide-react';

interface AddMenuProps {
  isOpen: boolean;
  onClose: () => void;
  cursorPosition?: { x: number; y: number };
}

interface MenuItem {
  id: string;
  type: ObjectType;
  label: string;
  icon: React.ElementType;
  category: 'mesh' | 'light' | 'empty';
  shortcut?: string;
}

const menuItems: MenuItem[] = [
  // Mesh primitives
  { id: 'box', type: 'box', label: 'Cube', icon: Box, category: 'mesh', shortcut: 'Shift+1' },
  { id: 'sphere', type: 'sphere', label: 'UV Sphere', icon: Circle, category: 'mesh', shortcut: 'Shift+2' },
  { id: 'cylinder', type: 'cylinder', label: 'Cylinder', icon: CylinderIcon, category: 'mesh', shortcut: 'Shift+3' },
  { id: 'cone', type: 'cone', label: 'Cone', icon: Triangle, category: 'mesh', shortcut: 'Shift+4' },
  { id: 'torus', type: 'torus', label: 'Torus', icon: TorusIcon, category: 'mesh', shortcut: 'Shift+5' },
  { id: 'plane', type: 'plane', label: 'Plane', icon: Square, category: 'mesh', shortcut: 'Shift+6' },

  // Lights
  { id: 'pointLight', type: 'pointLight', label: 'Point Light', icon: Lightbulb, category: 'light', shortcut: 'Shift+7' },
  { id: 'spotLight', type: 'spotLight', label: 'Spot Light', icon: Zap, category: 'light', shortcut: 'Shift+8' },
  { id: 'directionalLight', type: 'directionalLight', label: 'Directional Light', icon: Sun, category: 'light', shortcut: 'Shift+9' },
  { id: 'ambientLight', type: 'ambientLight', label: 'Ambient Light', icon: CloudSun, category: 'light', shortcut: 'Shift+0' },

  // Empty
  { id: 'group', type: 'group', label: 'Empty', icon: Folder, category: 'empty' },
];

export function AddMenu({ isOpen, onClose, cursorPosition }: AddMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['mesh', 'light', 'empty']));

  const createPrimitive = useObjectsStore((state) => state.createPrimitive);
  const createEmptyGroup = useObjectsStore((state) => state.createEmptyGroup);
  const executeCommand = useCommandStore((state) => state.executeCommand);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter items by search query
  const filteredItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by category
  const categorizedItems = {
    mesh: filteredItems.filter(item => item.category === 'mesh'),
    light: filteredItems.filter(item => item.category === 'light'),
    empty: filteredItems.filter(item => item.category === 'empty'),
  };

  // Flatten for keyboard navigation
  const flattenedItems: MenuItem[] = [];
  if (expandedCategories.has('mesh')) flattenedItems.push(...categorizedItems.mesh);
  if (expandedCategories.has('light')) flattenedItems.push(...categorizedItems.light);
  if (expandedCategories.has('empty')) flattenedItems.push(...categorizedItems.empty);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flattenedItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flattenedItems.length > 0) {
        e.preventDefault();
        handleAddObject(flattenedItems[selectedIndex].type);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, flattenedItems, onClose]);

  const handleAddObject = (type: ObjectType) => {
    if (type === 'group') {
      const group = createEmptyGroup();
      const command = new CreateObjectCommand(group);
      executeCommand(command);
    } else {
      const object = createPrimitive(type, [0, 0, 0]);
      const command = new CreateObjectCommand(object);
      executeCommand(command);
    }

    onClose();
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (!isOpen) return null;

  // Position menu at cursor or center
  const menuStyle: React.CSSProperties = cursorPosition
    ? {
        position: 'fixed',
        left: cursorPosition.x,
        top: cursorPosition.y,
      }
    : {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className="bg-[#18181B] border border-[#27272A] rounded-lg shadow-2xl z-50 w-80"
        style={menuStyle}
      >
        {/* Header */}
        <div className="p-3 border-b border-[#27272A]">
          <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">Add</h3>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0A0A0B] border border-[#27272A] rounded text-sm text-[#FAFAFA] placeholder-[#A1A1AA] outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-2">
          {/* Mesh Category */}
          {categorizedItems.mesh.length > 0 && (
            <div className="mb-2">
              <button
                onClick={() => toggleCategory('mesh')}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                <span className={`transition-transform ${expandedCategories.has('mesh') ? 'rotate-90' : ''}`}>▶</span>
                Mesh
              </button>

              {expandedCategories.has('mesh') && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {categorizedItems.mesh.map((item, idx) => {
                    const Icon = item.icon;
                    const globalIndex = flattenedItems.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleAddObject(item.type)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                          isSelected
                            ? 'bg-[#7C3AED]/20 text-[#FAFAFA] border-l-2 border-[#7C3AED]'
                            : 'text-[#FAFAFA] hover:bg-[#27272A]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-xs text-[#A1A1AA]">{item.shortcut}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Light Category */}
          {categorizedItems.light.length > 0 && (
            <div className="mb-2">
              <button
                onClick={() => toggleCategory('light')}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                <span className={`transition-transform ${expandedCategories.has('light') ? 'rotate-90' : ''}`}>▶</span>
                Light
              </button>

              {expandedCategories.has('light') && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {categorizedItems.light.map((item) => {
                    const Icon = item.icon;
                    const globalIndex = flattenedItems.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleAddObject(item.type)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                          isSelected
                            ? 'bg-[#7C3AED]/20 text-[#FAFAFA] border-l-2 border-[#7C3AED]'
                            : 'text-[#FAFAFA] hover:bg-[#27272A]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-xs text-[#A1A1AA]">{item.shortcut}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Empty Category */}
          {categorizedItems.empty.length > 0 && (
            <div>
              <button
                onClick={() => toggleCategory('empty')}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                <span className={`transition-transform ${expandedCategories.has('empty') ? 'rotate-90' : ''}`}>▶</span>
                Empty
              </button>

              {expandedCategories.has('empty') && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {categorizedItems.empty.map((item) => {
                    const Icon = item.icon;
                    const globalIndex = flattenedItems.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleAddObject(item.type)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                          isSelected
                            ? 'bg-[#7C3AED]/20 text-[#FAFAFA] border-l-2 border-[#7C3AED]'
                            : 'text-[#FAFAFA] hover:bg-[#27272A]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-sm text-[#A1A1AA]">
              No items found
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-[#27272A] text-xs text-[#A1A1AA]">
          ↑↓ Navigate • Enter Add • Esc Close
        </div>
      </div>
    </>
  );
}
