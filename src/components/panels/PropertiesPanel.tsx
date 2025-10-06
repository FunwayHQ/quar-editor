/**
 * Properties Panel Component
 *
 * Displays and allows editing of properties for selected objects.
 */

import React, { useState, useEffect } from 'react';
import { useObjectsStore } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { UpdateObjectCommand } from '../../lib/commands/ObjectCommands';
import { LightPropertiesPanel } from './LightPropertiesPanel';

interface Vector3InputProps {
  label: string;
  value: [number, number, number];
  onChange: (value: [number, number, number]) => void;
  step?: number;
}

function Vector3Input({ label, value, onChange, step = 0.1 }: Vector3InputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (index: number, newValue: string) => {
    const numValue = parseFloat(newValue) || 0;
    const updated: [number, number, number] = [...localValue] as [number, number, number];
    updated[index] = numValue;
    setLocalValue(updated);
  };

  const handleBlur = () => {
    onChange(localValue);
  };

  // Sprint Y: Add Enter key support for committing changes
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onChange(localValue);
      (e.target as HTMLInputElement).blur(); // Blur to show updated value
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalValue(value); // Revert to original
      (e.target as HTMLInputElement).blur();
    }
  };

  const labels = ['X', 'Y', 'Z'];
  const colors = ['#EF4444', '#10B981', '#3B82F6']; // Red, Green, Blue

  return (
    <div className="mb-3">
      <label className="block text-xs text-[#A1A1AA] mb-1">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {localValue.map((val, index) => (
          <div key={index} className="relative">
            <div
              className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium"
              style={{ color: colors[index] }}
            >
              {labels[index]}
            </div>
            <input
              type="number"
              value={val.toFixed(3)}
              onChange={(e) => handleChange(index, e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              step={step}
              className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2 pl-6 py-1 text-sm text-[#FAFAFA] outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const getObject = useObjectsStore((state) => state.getObject);
  const executeCommand = useCommandStore((state) => state.executeCommand);

  // Get the first selected object (for now, we only edit one at a time)
  const selectedObject = selectedIds.length > 0 ? getObject(selectedIds[0]) : null;

  const handleTransformChange = (
    property: 'position' | 'rotation' | 'scale',
    newValue: [number, number, number]
  ) => {
    if (!selectedObject) return;

    const oldValue = { [property]: selectedObject[property] };
    const command = new UpdateObjectCommand(
      selectedObject.id,
      oldValue,
      { [property]: newValue }
    );
    executeCommand(command);
  };

  const handlePropertyChange = (property: keyof typeof selectedObject, value: any) => {
    if (!selectedObject) return;

    const oldValue = { [property]: selectedObject[property] };
    const command = new UpdateObjectCommand(
      selectedObject.id,
      oldValue,
      { [property]: value }
    );
    executeCommand(command);
  };

  if (!selectedObject) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-[#27272A]">
          <h2 className="text-sm font-medium text-[#FAFAFA]">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          <p className="text-sm text-[#A1A1AA] text-center">
            No object selected
            <br />
            <span className="text-xs">Select an object to view its properties</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-[#27272A]">
        <h2 className="text-sm font-medium text-[#FAFAFA]">Properties</h2>
        <span className="text-xs text-[#A1A1AA]">{selectedObject.name}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {/* Object Info */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">Object</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">Name</label>
              <input
                type="text"
                value={selectedObject.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA] outline-none focus:border-[#7C3AED] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">Type</label>
              <div className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA]">
                {selectedObject.type.charAt(0).toUpperCase() + selectedObject.type.slice(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Transform */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">Transform</h3>

          <Vector3Input
            label="Position"
            value={selectedObject.position}
            onChange={(value) => handleTransformChange('position', value)}
            step={0.1}
          />

          <Vector3Input
            label="Rotation"
            value={selectedObject.rotation}
            onChange={(value) => handleTransformChange('rotation', value)}
            step={0.01}
          />

          <Vector3Input
            label="Scale"
            value={selectedObject.scale}
            onChange={(value) => handleTransformChange('scale', value)}
            step={0.1}
          />
        </div>

        {/* Visibility */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">Display</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedObject.visible}
                onChange={(e) => handlePropertyChange('visible', e.target.checked)}
                className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
              />
              <span className="text-sm text-[#FAFAFA]">Visible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedObject.locked}
                onChange={(e) => handlePropertyChange('locked', e.target.checked)}
                className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
              />
              <span className="text-sm text-[#FAFAFA]">Locked</span>
            </label>
          </div>
        </div>

        {/* Metadata */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">Info</h3>
          <div className="space-y-1 text-xs text-[#A1A1AA]">
            <div>ID: {selectedObject.id.substring(0, 16)}...</div>
            <div>Created: {new Date(selectedObject.createdAt).toLocaleString()}</div>
            <div>Modified: {new Date(selectedObject.modifiedAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Light Properties (if object is a light) */}
        <LightPropertiesPanel />
      </div>
    </div>
  );
}
