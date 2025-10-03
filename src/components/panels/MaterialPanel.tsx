/**
 * Material Panel Component
 *
 * Material editing panel with PBR properties.
 * Replaces Properties panel when editing materials.
 */

import React, { useState } from 'react';
import { Palette, Upload, Trash2, Plus } from 'lucide-react';
import { useMaterialsStore, Material } from '../../stores/materialsStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { TextureUpload } from '../materials/TextureUpload';

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
          placeholder="#888888"
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

function SliderInput({ label, value, onChange, min = 0, max = 1, step = 0.01 }: SliderInputProps) {
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
        className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer accent-[#7C3AED]"
      />
    </div>
  );
}

export function MaterialPanel() {
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const objectMaterials = useMaterialsStore((state) => state.objectMaterials);
  const materials = useMaterialsStore((state) => state.materials);
  const updateMaterial = useMaterialsStore((state) => state.updateMaterial);
  const createMaterial = useMaterialsStore((state) => state.createMaterial);
  const createMaterialFromPreset = useMaterialsStore((state) => state.createMaterialFromPreset);
  const assignMaterialToObject = useMaterialsStore((state) => state.assignMaterialToObject);
  const removeMaterial = useMaterialsStore((state) => state.removeMaterial);
  const getPresets = useMaterialsStore((state) => state.getPresets);

  const [showMaterialLibrary, setShowMaterialLibrary] = useState(false);

  // Get material for selected object
  const selectedObjectId = selectedIds.length > 0 ? selectedIds[0] : null;
  const assignedMaterialId = selectedObjectId ? objectMaterials.get(selectedObjectId) : null;
  const currentMaterial = assignedMaterialId ? materials.get(assignedMaterialId) : null;

  const allMaterials = Array.from(materials.values());
  const presets = getPresets();

  const handleMaterialPropertyChange = (property: keyof Material, value: any) => {
    if (!currentMaterial) return;
    updateMaterial(currentMaterial.id, { [property]: value });
  };

  const handleAssignMaterial = (materialId: string) => {
    if (!selectedObjectId) return;
    assignMaterialToObject(selectedObjectId, materialId);
    setShowMaterialLibrary(false);
  };

  const handleCreateMaterial = () => {
    const newMat = createMaterial();
    if (selectedObjectId) {
      assignMaterialToObject(selectedObjectId, newMat.id);
    }
    setShowMaterialLibrary(false);
  };

  const handleCreateFromPreset = (presetName: string) => {
    const newMat = createMaterialFromPreset(presetName);
    if (selectedObjectId) {
      assignMaterialToObject(selectedObjectId, newMat.id);
    }
    setShowMaterialLibrary(false);
  };

  const handleDeleteMaterial = () => {
    if (!currentMaterial) return;
    if (confirm(`Delete material "${currentMaterial.name}"?`)) {
      removeMaterial(currentMaterial.id);
    }
  };

  if (!selectedObjectId) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-[#27272A]">
          <h2 className="text-sm font-medium text-[#FAFAFA]">Material</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-[#A1A1AA] text-center">
            No object selected
            <br />
            <span className="text-xs">Select an object to edit its material</span>
          </p>
        </div>
      </div>
    );
  }

  if (showMaterialLibrary) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-[#27272A]">
          <h2 className="text-sm font-medium text-[#FAFAFA]">Material Library</h2>
          <button
            onClick={() => setShowMaterialLibrary(false)}
            className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Create New */}
          <button
            onClick={handleCreateMaterial}
            className="w-full p-3 mb-4 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg flex items-center justify-center gap-2 text-sm text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Material
          </button>

          {/* Presets */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-[#FAFAFA] mb-2">Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleCreateFromPreset(preset.name)}
                  className="p-3 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg text-left transition-colors"
                >
                  <div
                    className="w-full h-12 rounded mb-2"
                    style={{ backgroundColor: preset.albedo }}
                  />
                  <div className="text-xs text-[#FAFAFA]">{preset.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Existing Materials */}
          {allMaterials.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-[#FAFAFA] mb-2">Existing Materials</h3>
              <div className="space-y-2">
                {allMaterials.map((material) => (
                  <button
                    key={material.id}
                    onClick={() => handleAssignMaterial(material.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      material.id === assignedMaterialId
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded"
                        style={{ backgroundColor: material.albedo }}
                      />
                      <div>
                        <div className="text-sm">{material.name}</div>
                        <div className="text-xs text-[#A1A1AA]">
                          M:{material.metallic.toFixed(1)} R:{material.roughness.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#27272A]">
        <h2 className="text-sm font-medium text-[#FAFAFA]">Material</h2>
        {currentMaterial && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDeleteMaterial}
              className="p-1.5 rounded hover:bg-[#27272A] transition-colors"
              title="Delete Material"
            >
              <Trash2 className="w-4 h-4 text-[#A1A1AA]" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!currentMaterial ? (
          <div className="text-center py-8">
            <Palette className="w-12 h-12 mx-auto mb-4 text-[#A1A1AA]" />
            <p className="text-sm text-[#A1A1AA] mb-4">No material assigned</p>
            <button
              onClick={() => setShowMaterialLibrary(true)}
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg text-sm text-white transition-colors"
            >
              Assign Material
            </button>
          </div>
        ) : (
          <>
            {/* Material Info */}
            <div className="mb-6">
              <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">Material</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Name</label>
                  <input
                    type="text"
                    value={currentMaterial.name}
                    onChange={(e) => handleMaterialPropertyChange('name', e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA] outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <button
                  onClick={() => setShowMaterialLibrary(true)}
                  className="w-full px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded text-sm text-[#FAFAFA] transition-colors"
                >
                  Change Material
                </button>
              </div>
            </div>

            {/* PBR Properties */}
            <div className="mb-6">
              <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">PBR Properties</h3>

              <ColorPicker
                label="Albedo Color"
                value={currentMaterial.albedo}
                onChange={(value) => handleMaterialPropertyChange('albedo', value)}
              />

              <SliderInput
                label="Metallic"
                value={currentMaterial.metallic}
                onChange={(value) => handleMaterialPropertyChange('metallic', value)}
                min={0}
                max={1}
                step={0.01}
              />

              <SliderInput
                label="Roughness"
                value={currentMaterial.roughness}
                onChange={(value) => handleMaterialPropertyChange('roughness', value)}
                min={0}
                max={1}
                step={0.01}
              />

              <ColorPicker
                label="Emission Color"
                value={currentMaterial.emission}
                onChange={(value) => handleMaterialPropertyChange('emission', value)}
              />

              <SliderInput
                label="Emission Intensity"
                value={currentMaterial.emissionIntensity}
                onChange={(value) => handleMaterialPropertyChange('emissionIntensity', value)}
                min={0}
                max={10}
                step={0.1}
              />

              <SliderInput
                label="Opacity"
                value={currentMaterial.opacity}
                onChange={(value) => handleMaterialPropertyChange('opacity', value)}
                min={0}
                max={1}
                step={0.01}
              />
            </div>

            {/* Additional Properties */}
            <div className="mb-6">
              <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">Options</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentMaterial.transparent}
                    onChange={(e) => handleMaterialPropertyChange('transparent', e.target.checked)}
                    className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                  />
                  <span className="text-sm text-[#FAFAFA]">Transparent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentMaterial.doubleSided}
                    onChange={(e) => handleMaterialPropertyChange('doubleSided', e.target.checked)}
                    className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                  />
                  <span className="text-sm text-[#FAFAFA]">Double Sided</span>
                </label>
              </div>
            </div>

            {/* Texture Maps */}
            <div className="mb-6">
              <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">Texture Maps</h3>

              <TextureUpload
                label="Albedo Map"
                textureId={currentMaterial.albedoMap}
                onTextureChange={(texId) => handleMaterialPropertyChange('albedoMap', texId)}
                textureType="albedo"
              />

              <TextureUpload
                label="Normal Map"
                textureId={currentMaterial.normalMap}
                onTextureChange={(texId) => handleMaterialPropertyChange('normalMap', texId)}
                textureType="normal"
              />

              <TextureUpload
                label="Roughness Map"
                textureId={currentMaterial.roughnessMap}
                onTextureChange={(texId) => handleMaterialPropertyChange('roughnessMap', texId)}
                textureType="roughness"
              />

              <TextureUpload
                label="Metallic Map"
                textureId={currentMaterial.metallicMap}
                onTextureChange={(texId) => handleMaterialPropertyChange('metallicMap', texId)}
                textureType="metallic"
              />

              <TextureUpload
                label="Emission Map"
                textureId={currentMaterial.emissionMap}
                onTextureChange={(texId) => handleMaterialPropertyChange('emissionMap', texId)}
                textureType="emission"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
