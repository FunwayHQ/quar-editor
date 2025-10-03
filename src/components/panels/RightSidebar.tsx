/**
 * Right Sidebar Component
 *
 * Tabbed interface for Properties and Material panels.
 */

import React, { useState } from 'react';
import { Settings, Palette, Cloud } from 'lucide-react';
import { PropertiesPanel } from './PropertiesPanel';
import { MaterialPanel } from './MaterialPanel';
import { EnvironmentPanel } from './EnvironmentPanel';

type Tab = 'properties' | 'material' | 'environment';

export function RightSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('properties');

  return (
    <div className="w-80 h-full bg-[#18181B]/80 backdrop-blur-md border-l border-[#27272A] flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-[#27272A]">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 px-3 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors ${
            activeTab === 'properties'
              ? 'bg-[#7C3AED] text-white'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="hidden xl:inline">Properties</span>
        </button>
        <button
          onClick={() => setActiveTab('material')}
          className={`flex-1 px-3 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors ${
            activeTab === 'material'
              ? 'bg-[#7C3AED] text-white'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span className="hidden xl:inline">Material</span>
        </button>
        <button
          onClick={() => setActiveTab('environment')}
          className={`flex-1 px-3 py-3 flex items-center justify-center gap-1.5 text-xs transition-colors ${
            activeTab === 'environment'
              ? 'bg-[#7C3AED] text-white'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span className="hidden xl:inline">Environment</span>
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'properties' && <PropertiesPanel />}
        {activeTab === 'material' && <MaterialPanel />}
        {activeTab === 'environment' && <EnvironmentPanel />}
      </div>
    </div>
  );
}
