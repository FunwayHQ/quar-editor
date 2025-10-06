/**
 * Right Sidebar Component
 *
 * Tabbed interface for Properties and Material panels.
 */

import React, { useState } from 'react';
import { Settings, Palette, Cloud, Edit3, Layers3, Layers, Spline, Combine } from 'lucide-react';
import { PropertiesPanel } from './PropertiesPanel';
import { MaterialPanel } from './MaterialPanel';
import { EnvironmentPanel } from './EnvironmentPanel';
import { EditModePanel } from './EditModePanel';
import { ShapeKeysPanel } from './ShapeKeysPanel';
import { ModifierPanel } from './ModifierPanel';
import { MeshOperationsPanel } from './MeshOperationsPanel';
import { BooleanOperationsPanel } from './BooleanOperationsPanel';
import { useEditModeStore } from '../../stores/editModeStore';
import { useCurveStore } from '../../stores/curveStore';
import { useObjectsStore } from '../../stores/objectsStore';

type Tab = 'properties' | 'material' | 'environment' | 'edit' | 'shapekeys' | 'modifiers' | 'curves' | 'boolean';

export function RightSidebar() {
  const { isEditMode } = useEditModeStore();
  const selectedCurveIds = useCurveStore((state) => state.selectedCurveIds);
  const selectedObjectIds = useObjectsStore((state) => state.selectedIds);
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

  // Auto-switch to boolean tab when exactly 2 objects selected
  React.useEffect(() => {
    if (selectedObjectIds.length === 2 && !isEditMode) {
      setActiveTab('boolean');
    } else if (selectedObjectIds.length !== 2 && activeTab === 'boolean') {
      setActiveTab('properties');
    }
  }, [selectedObjectIds.length, isEditMode]);

  // Auto-switch to curves tab when curve is selected
  React.useEffect(() => {
    if (selectedCurveIds.length > 0 && !isEditMode && selectedObjectIds.length === 0) {
      setActiveTab('curves');
    }
  }, [selectedCurveIds.length, selectedObjectIds.length, isEditMode]);

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
          <button
            onClick={() => setActiveTab('curves')}
            disabled={isEditMode}
            className={`px-4 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors whitespace-nowrap ${
              activeTab === 'curves'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
            } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Spline className="w-4 h-4" />
            <span>Curves</span>
          </button>
          {selectedObjectIds.length === 2 && !isEditMode && (
            <button
              onClick={() => setActiveTab('boolean')}
              className={`px-4 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors whitespace-nowrap ${
                activeTab === 'boolean'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
              }`}
            >
              <Combine className="w-4 h-4" />
              <span>Boolean</span>
            </button>
          )}
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'edit' && <EditModePanel />}
        {activeTab === 'properties' && <PropertiesPanel />}
        {activeTab === 'material' && <MaterialPanel />}
        {activeTab === 'environment' && <EnvironmentPanel />}
        {activeTab === 'shapekeys' && <ShapeKeysPanel />}
        {activeTab === 'modifiers' && <ModifierPanel />}
        {activeTab === 'curves' && <MeshOperationsPanel />}
        {activeTab === 'boolean' && <BooleanOperationsPanel />}
      </div>
    </div>
  );
}
