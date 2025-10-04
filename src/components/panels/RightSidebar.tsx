/**
 * Right Sidebar Component
 *
 * Tabbed interface for Properties and Material panels.
 */

import React, { useState } from 'react';
import { Settings, Palette, Cloud, Edit3, Layers3, Layers } from 'lucide-react';
import { PropertiesPanel } from './PropertiesPanel';
import { MaterialPanel } from './MaterialPanel';
import { EnvironmentPanel } from './EnvironmentPanel';
import { EditModePanel } from './EditModePanel';
import { ShapeKeysPanel } from './ShapeKeysPanel';
import { ModifierPanel } from './ModifierPanel';
import { useEditModeStore } from '../../stores/editModeStore';

type Tab = 'properties' | 'material' | 'environment' | 'edit' | 'shapekeys' | 'modifiers';

export function RightSidebar() {
  const { isEditMode } = useEditModeStore();
  const [activeTab, setActiveTab] = useState<Tab>('properties');

  // Auto-switch to edit tab when entering edit mode
  React.useEffect(() => {
    if (isEditMode) {
      setActiveTab('edit');
    } else {
      if (activeTab === 'edit') {
        setActiveTab('properties');
      }
    }
  }, [isEditMode]);

  return (
    <div className="w-80 h-full bg-[#18181B]/80 backdrop-blur-md border-l border-[#27272A] flex flex-col">
      {/* Tabs - Now scrollable horizontally */}
      <div className="overflow-x-auto border-b border-[#27272A]">
        <div className="flex min-w-full">
          {isEditMode && (
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors whitespace-nowrap ${
                activeTab === 'edit'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('properties')}
            disabled={isEditMode}
            className={`px-4 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors whitespace-nowrap ${
              activeTab === 'properties'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
            } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Settings className="w-4 h-4" />
            <span>Properties</span>
          </button>
          <button
            onClick={() => setActiveTab('material')}
            disabled={isEditMode}
            className={`px-4 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors whitespace-nowrap ${
              activeTab === 'material'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
            } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Palette className="w-4 h-4" />
            <span>Material</span>
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            disabled={isEditMode}
            className={`px-4 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors whitespace-nowrap ${
              activeTab === 'environment'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
            } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Cloud className="w-4 h-4" />
            <span>Environment</span>
          </button>
          <button
            onClick={() => setActiveTab('shapekeys')}
            className={`px-4 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors whitespace-nowrap ${
              activeTab === 'shapekeys'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
            }`}
          >
            <Layers3 className="w-4 h-4" />
            <span>Shape Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('modifiers')}
            className={`px-4 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors whitespace-nowrap ${
              activeTab === 'modifiers'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Modifiers</span>
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'edit' && <EditModePanel />}
        {activeTab === 'properties' && <PropertiesPanel />}
        {activeTab === 'material' && <MaterialPanel />}
        {activeTab === 'environment' && <EnvironmentPanel />}
        {activeTab === 'shapekeys' && <ShapeKeysPanel />}
        {activeTab === 'modifiers' && <ModifierPanel />}
      </div>
    </div>
  );
}
