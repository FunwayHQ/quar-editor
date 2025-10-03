/**
 * Light Properties Panel Component
 *
 * Displays and allows editing of light properties.
 */

import React from 'react';
import { useObjectsStore } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { UpdateObjectCommand } from '../../lib/commands/ObjectCommands';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-[#A1A1AA] mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-8 rounded border border-[#27272A] cursor-pointer"
        />
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA] font-mono outline-none focus:border-[#7C3AED]"
          placeholder="#FFFFFF"
        />
      </div>
    </div>
  );
}

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function SliderInput({ label, value, onChange, min = 0, max = 10, step = 0.1 }: SliderInputProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-[#A1A1AA]">{label}</label>
        <span className="text-xs text-[#FAFAFA] font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer accent-[#F59E0B]"
      />
    </div>
  );
}

export function LightPropertiesPanel() {
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const objects = useObjectsStore((state) => state.objects);
  const executeCommand = useCommandStore((state) => state.executeCommand);

  const selectedObject = selectedIds.length > 0 ? objects.get(selectedIds[0]) : null;
  const isLight = selectedObject && (
    selectedObject.type === 'pointLight' ||
    selectedObject.type === 'spotLight' ||
    selectedObject.type === 'directionalLight' ||
    selectedObject.type === 'ambientLight'
  );

  if (!selectedObject || !isLight || !selectedObject.lightProps) {
    return null; // Show nothing if not a light
  }

  const handleLightPropertyChange = (property: string, value: any) => {
    const oldValue = { lightProps: { ...selectedObject.lightProps } };
    const newValue = {
      lightProps: {
        ...selectedObject.lightProps,
        [property]: value,
      },
    };

    const command = new UpdateObjectCommand(selectedObject.id, oldValue, newValue);
    executeCommand(command);
  };

  const { lightProps } = selectedObject;

  return (
    <div className="border-t border-[#27272A] pt-4">
      <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">Light Properties</h3>

      <ColorPicker
        label="Color"
        value={lightProps.color}
        onChange={(value) => handleLightPropertyChange('color', value)}
      />

      <SliderInput
        label="Intensity"
        value={lightProps.intensity}
        onChange={(value) => handleLightPropertyChange('intensity', value)}
        min={0}
        max={10}
        step={0.1}
      />

      {(selectedObject.type === 'pointLight' || selectedObject.type === 'spotLight') && (
        <>
          <SliderInput
            label="Distance (0 = infinite)"
            value={lightProps.distance}
            onChange={(value) => handleLightPropertyChange('distance', value)}
            min={0}
            max={100}
            step={1}
          />

          <SliderInput
            label="Decay"
            value={lightProps.decay}
            onChange={(value) => handleLightPropertyChange('decay', value)}
            min={0}
            max={5}
            step={0.1}
          />
        </>
      )}

      {selectedObject.type === 'spotLight' && (
        <>
          <SliderInput
            label="Angle (degrees)"
            value={(lightProps.angle || 0) * (180 / Math.PI)}
            onChange={(value) => handleLightPropertyChange('angle', value * (Math.PI / 180))}
            min={0}
            max={90}
            step={1}
          />

          <SliderInput
            label="Penumbra (soft edge)"
            value={lightProps.penumbra || 0}
            onChange={(value) => handleLightPropertyChange('penumbra', value)}
            min={0}
            max={1}
            step={0.01}
          />
        </>
      )}

      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={lightProps.castShadow}
            onChange={(e) => handleLightPropertyChange('castShadow', e.target.checked)}
            className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#F59E0B] focus:ring-[#F59E0B] focus:ring-offset-0"
          />
          <span className="text-sm text-[#FAFAFA]">Cast Shadows</span>
        </label>
      </div>

      {lightProps.castShadow && selectedObject.type !== 'ambientLight' && (
        <div className="mb-4 p-3 bg-[#27272A]/50 rounded">
          <h4 className="text-xs font-medium text-[#FAFAFA] mb-2">Shadow Settings</h4>

          <div className="mb-2">
            <label className="block text-xs text-[#A1A1AA] mb-1">Shadow Map Size</label>
            <select
              value={lightProps.shadowMapSize || 1024}
              onChange={(e) => handleLightPropertyChange('shadowMapSize', parseInt(e.target.value))}
              className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA] outline-none focus:border-[#F59E0B]"
            >
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
            </select>
          </div>

          <SliderInput
            label="Shadow Bias"
            value={lightProps.shadowBias || -0.0001}
            onChange={(value) => handleLightPropertyChange('shadowBias', value)}
            min={-0.01}
            max={0.01}
            step={0.0001}
          />

          <SliderInput
            label="Shadow Radius"
            value={lightProps.shadowRadius || 1}
            onChange={(value) => handleLightPropertyChange('shadowRadius', value)}
            min={0}
            max={10}
            step={0.1}
          />
        </div>
      )}
    </div>
  );
}
