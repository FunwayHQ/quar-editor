/**
 * Environment Panel
 *
 * Panel for editing environment settings (background, fog, ground plane).
 * Sprint 5: Lighting & Environment
 */

import React, { useRef } from 'react';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { Cloud, Square, Zap, Image, Upload } from 'lucide-react';
import { lightingPresets, createLightFromPreset } from '../../lib/lightingPresets';

export function EnvironmentPanel() {
  const {
    backgroundColor,
    hdriEnabled,
    hdriPreset,
    hdriFile,
    hdriIntensity,
    hdriAsBackground,
    backgroundBlur,
    fogEnabled,
    fogType,
    fogColor,
    fogNear,
    fogFar,
    fogDensity,
    groundPlaneEnabled,
    groundPlaneSize,
    groundPlaneColor,
    groundPlaneReceiveShadow,
    setBackgroundColor,
    setHdriEnabled,
    setHdriPreset,
    setHdriFile,
    setHdriIntensity,
    setHdriAsBackground,
    setBackgroundBlur,
    setFogEnabled,
    setFogType,
    setFogColor,
    setFogNear,
    setFogFar,
    setFogDensity,
    setGroundPlaneEnabled,
    setGroundPlaneSize,
    setGroundPlaneColor,
    setGroundPlaneReceiveShadow,
  } = useEnvironmentStore();

  const { objects, addObject, deleteObjects } = useObjectsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyLightingPreset = (presetId: string) => {
    const preset = lightingPresets.find((p) => p.id === presetId);
    if (!preset) return;

    // Remove all existing lights
    const lightTypes = ['pointLight', 'spotLight', 'directionalLight', 'ambientLight'];
    const existingLights = Array.from(objects.values()).filter((obj) =>
      lightTypes.includes(obj.type)
    );
    if (existingLights.length > 0) {
      deleteObjects(existingLights.map((l) => l.id));
    }

    // Add preset lights
    preset.lights.forEach((lightData) => {
      const light = createLightFromPreset(lightData);
      addObject(light);
    });

    // Apply environment settings
    if (preset.environment) {
      if (preset.environment.backgroundColor) {
        setBackgroundColor(preset.environment.backgroundColor);
      }
      if (preset.environment.hdriEnabled !== undefined) {
        setHdriEnabled(preset.environment.hdriEnabled);
      }
      if (preset.environment.hdriPreset) {
        setHdriPreset(preset.environment.hdriPreset);
      }
      if (preset.environment.hdriIntensity !== undefined) {
        setHdriIntensity(preset.environment.hdriIntensity);
      }
      if (preset.environment.hdriAsBackground !== undefined) {
        setHdriAsBackground(preset.environment.hdriAsBackground);
      }
      if (preset.environment.backgroundBlur !== undefined) {
        setBackgroundBlur(preset.environment.backgroundBlur);
      }
      if (preset.environment.fogEnabled !== undefined) {
        setFogEnabled(preset.environment.fogEnabled);
      }
      if (preset.environment.fogType) {
        setFogType(preset.environment.fogType);
      }
      if (preset.environment.fogColor) {
        setFogColor(preset.environment.fogColor);
      }
      if (preset.environment.groundPlaneEnabled !== undefined) {
        setGroundPlaneEnabled(preset.environment.groundPlaneEnabled);
      }
    }
  };

  const handleHdriUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setHdriFile(dataUrl);
      setHdriEnabled(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-[#27272A]">
        <h2 className="text-sm font-medium text-[#FAFAFA]">Environment</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {/* Lighting Presets */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#A1A1AA]" />
            <h3 className="text-xs font-medium text-[#FAFAFA]">Lighting Presets</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {lightingPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyLightingPreset(preset.id)}
                className="p-3 bg-[#18181B] border border-[#27272A] rounded-lg hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all text-left group"
                title={preset.description}
              >
                <div className="text-sm font-medium text-[#FAFAFA] mb-1">
                  {preset.name}
                </div>
                <div className="text-xs text-[#71717A] leading-tight">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-[#27272A] mb-6" />

        {/* HDRI / IBL */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-[#A1A1AA]" />
              <h3 className="text-xs font-medium text-[#FAFAFA]">HDRI / IBL</h3>
            </div>
            <button
              onClick={() => setHdriEnabled(!hdriEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                hdriEnabled ? 'bg-[#7C3AED]' : 'bg-[#27272A]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  hdriEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {hdriEnabled && (
            <div className="space-y-3 mt-3">
              {/* HDRI Preset Selector */}
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Preset</label>
                <select
                  value={hdriPreset || ''}
                  onChange={(e) => setHdriPreset(e.target.value || null)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA] outline-none focus:border-[#7C3AED]"
                >
                  <option value="">None (Custom)</option>
                  <option value="sunset">Sunset</option>
                  <option value="dawn">Dawn</option>
                  <option value="night">Night</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="forest">Forest</option>
                  <option value="apartment">Apartment</option>
                  <option value="studio">Studio</option>
                  <option value="city">City</option>
                  <option value="park">Park</option>
                  <option value="lobby">Lobby</option>
                </select>
                <p className="text-xs text-[#71717A] mt-1">Quick presets from HDRI Haven</p>
              </div>

              {/* Custom HDRI Upload */}
              {!hdriPreset && (
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Custom HDRI</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".hdr,.exr"
                    onChange={handleHdriUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded text-sm text-[#FAFAFA] hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {hdriFile ? 'Change HDRI File' : 'Upload HDRI (.hdr, .exr)'}
                  </button>
                  {hdriFile && (
                    <p className="text-xs text-[#10B981] mt-1">✓ Custom HDRI loaded</p>
                  )}
                </div>
              )}

              {/* Environment Intensity */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-[#A1A1AA]">Environment Intensity</label>
                  <span className="text-xs text-[#FAFAFA]">{hdriIntensity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={hdriIntensity}
                  onChange={(e) => setHdriIntensity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                />
                <p className="text-xs text-[#71717A] mt-1">IBL lighting strength</p>
              </div>

              {/* Use as Background */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hdriAsBackground}
                  onChange={(e) => setHdriAsBackground(e.target.checked)}
                  className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                />
                <span className="text-sm text-[#FAFAFA]">Use as Background</span>
              </label>

              {/* Background Blur */}
              {hdriAsBackground && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-[#A1A1AA]">Background Blur</label>
                    <span className="text-xs text-[#FAFAFA]">{backgroundBlur.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={backgroundBlur}
                    onChange={(e) => setBackgroundBlur(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                  />
                  <p className="text-xs text-[#71717A] mt-1">0 = sharp, 1 = very blurred</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full h-px bg-[#27272A] mb-6" />

        {/* Background */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-[#FAFAFA] mb-3">Background</h3>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-12 h-8 rounded border border-[#27272A] bg-[#18181B] cursor-pointer"
            />
            <input
              type="text"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="flex-1 px-2 py-1 text-sm bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] font-mono focus:outline-none focus:border-[#7C3AED]"
              placeholder="#0A0A0B"
            />
          </div>
        </div>

        {/* Fog */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[#A1A1AA]" />
              <h3 className="text-xs font-medium text-[#FAFAFA]">Fog</h3>
            </div>
            <button
              onClick={() => setFogEnabled(!fogEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                fogEnabled ? 'bg-[#7C3AED]' : 'bg-[#27272A]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  fogEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {fogEnabled && (
            <div className="space-y-3 mt-3">
              {/* Fog Type */}
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Type</label>
                <select
                  value={fogType}
                  onChange={(e) => setFogType(e.target.value as 'linear' | 'exponential')}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA] outline-none focus:border-[#7C3AED]"
                >
                  <option value="linear">Linear</option>
                  <option value="exponential">Exponential</option>
                </select>
              </div>

              {/* Fog Color */}
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fogColor}
                    onChange={(e) => setFogColor(e.target.value)}
                    className="w-12 h-8 rounded border border-[#27272A] bg-[#18181B] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={fogColor}
                    onChange={(e) => setFogColor(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] font-mono focus:outline-none focus:border-[#7C3AED]"
                    placeholder="#0A0A0B"
                  />
                </div>
              </div>

              {/* Linear Fog Controls */}
              {fogType === 'linear' && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-[#A1A1AA]">Near</label>
                      <span className="text-xs text-[#FAFAFA]">{fogNear.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={fogNear}
                      onChange={(e) => setFogNear(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-[#A1A1AA]">Far</label>
                      <span className="text-xs text-[#FAFAFA]">{fogFar.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={fogFar}
                      onChange={(e) => setFogFar(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </>
              )}

              {/* Exponential Fog Controls */}
              {fogType === 'exponential' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-[#A1A1AA]">Density</label>
                    <span className="text-xs text-[#FAFAFA]">{fogDensity.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.001"
                    value={fogDensity}
                    onChange={(e) => setFogDensity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ground Plane */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Square className="w-4 h-4 text-[#A1A1AA]" />
              <h3 className="text-xs font-medium text-[#FAFAFA]">Ground Plane</h3>
            </div>
            <button
              onClick={() => setGroundPlaneEnabled(!groundPlaneEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                groundPlaneEnabled ? 'bg-[#7C3AED]' : 'bg-[#27272A]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  groundPlaneEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {groundPlaneEnabled && (
            <div className="space-y-3 mt-3">
              {/* Size */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-[#A1A1AA]">Size</label>
                  <span className="text-xs text-[#FAFAFA]">{groundPlaneSize.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={groundPlaneSize}
                  onChange={(e) => setGroundPlaneSize(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={groundPlaneColor}
                    onChange={(e) => setGroundPlaneColor(e.target.value)}
                    className="w-12 h-8 rounded border border-[#27272A] bg-[#18181B] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={groundPlaneColor}
                    onChange={(e) => setGroundPlaneColor(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] font-mono focus:outline-none focus:border-[#7C3AED]"
                    placeholder="#27272A"
                  />
                </div>
              </div>

              {/* Receive Shadow */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groundPlaneReceiveShadow}
                  onChange={(e) => setGroundPlaneReceiveShadow(e.target.checked)}
                  className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                />
                <span className="text-sm text-[#FAFAFA]">Receive Shadows</span>
              </label>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-2 p-3 bg-[#18181B] border border-[#27272A] rounded-lg">
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Environment settings affect the overall look and feel of your scene.
            Use fog for atmospheric depth and ground plane for a reference surface.
          </p>
        </div>
      </div>
    </div>
  );
}
