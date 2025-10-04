/**
 * Export Dialog Component
 *
 * UI for exporting scenes to various 3D formats.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, Box, Database, Zap } from 'lucide-react';
import { useExportStore, ExportFormat } from '../../stores/exportStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useMaterialsStore } from '../../stores/materialsStore';
import { useToastStore } from '../../stores/toastStore';
import { getExportManager } from '../../lib/export/ExportManager';
import { EXPORT_PRESETS, applyPreset } from '../../lib/export/ExportPresets';

interface ExportDialogProps {
  onClose: () => void;
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const {
    options,
    progress,
    setFormat,
    setOption,
    setOptions,
    startExport,
    updateProgress,
    completeExport,
    failExport,
    resetProgress,
  } = useExportStore();

  const { getAllObjects, selectedIds } = useObjectsStore();
  const { animations } = useAnimationStore();
  const { success, error } = useToastStore();

  const [filename, setFilename] = useState('scene');
  const [showPresets, setShowPresets] = useState(false);

  const handlePresetSelect = (presetId: string) => {
    const preset = EXPORT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const newOptions = applyPreset(preset, options);
      setOptions(newOptions);
      setShowPresets(false);
      success(`Applied "${preset.name}" preset`);
    }
  };

  const formatInfo: Record<ExportFormat, { name: string; description: string; icon: typeof FileText }> = {
    glb: {
      name: 'GLB (Binary)',
      description: 'Compact binary format, best for web and games',
      icon: Database,
    },
    gltf: {
      name: 'GLTF (JSON)',
      description: 'Human-readable JSON format with separate bins',
      icon: FileText,
    },
    obj: {
      name: 'OBJ',
      description: 'Universal format (no animations)',
      icon: FileText,
    },
    usdz: {
      name: 'USDZ',
      description: 'Apple AR format for iOS devices',
      icon: Box,
    },
  };

  const handleExport = async () => {
    try {
      startExport();

      const objects = options.exportSelectionOnly
        ? getAllObjects().filter((obj) => selectedIds.includes(obj.id))
        : getAllObjects();

      if (objects.length === 0) {
        error('No objects to export');
        resetProgress();
        return;
      }

      const exportManager = getExportManager();
      const result = await exportManager.exportScene(
        objects,
        animations,
        options,
        (progress, step) => updateProgress(progress, step)
      );

      if (result.success && result.data) {
        const finalFilename = `${filename}.${options.format}`;
        exportManager.downloadFile(result.data as Blob, finalFilename);
        completeExport();
        success(`Exported ${finalFilename} successfully`);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        failExport(result.error || 'Export failed');
        error(result.error || 'Export failed. Please try again.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      failExport(errorMsg);
      error(`Export failed: ${errorMsg}`);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-[#0A0A0B]/90 backdrop-blur-md flex items-center justify-center z-[9999]">
      <div className="bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-[#FAFAFA]">Export Scene</h2>
          <button
            onClick={onClose}
            disabled={progress.isExporting}
            className="p-1 rounded hover:bg-[#27272A] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#A1A1AA]" />
          </button>
        </div>

        {/* Progress (if exporting) */}
        {progress.isExporting && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#A1A1AA]">{progress.currentStep}</span>
              <span className="text-sm text-[#FAFAFA] font-mono">{progress.progress}%</span>
            </div>
            <div className="w-full h-2 bg-[#27272A] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Presets */}
        {!progress.isExporting && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[#FAFAFA]">Quick Presets</label>
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="text-xs text-[#7C3AED] hover:text-[#A855F7] transition-colors"
                >
                  {showPresets ? 'Hide' : 'Show'} Presets
                </button>
              </div>

              {showPresets && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {EXPORT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset.id)}
                      className="flex flex-col items-start gap-1 p-2 rounded-lg border border-[#27272A] hover:border-[#7C3AED] bg-[#0A0A0B] hover:bg-[#7C3AED]/5 transition-all text-left"
                      title={preset.description}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{preset.icon}</span>
                        <span className="text-xs font-medium text-[#FAFAFA]">{preset.name}</span>
                      </div>
                      <span className="text-[10px] text-[#71717A] leading-tight line-clamp-2">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Format Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#FAFAFA] mb-3">Format</label>
              <div className="space-y-2">
                {(Object.keys(formatInfo) as ExportFormat[]).map((format) => {
                  const info = formatInfo[format];
                  const Icon = info.icon;
                  return (
                    <button
                      key={format}
                      onClick={() => setFormat(format)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        options.format === format
                          ? 'bg-[#7C3AED]/10 border-[#7C3AED]'
                          : 'bg-[#0A0A0B] border-[#27272A] hover:border-[#3F3F46]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        options.format === format ? 'text-[#7C3AED]' : 'text-[#A1A1AA]'
                      }`} />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-[#FAFAFA]">{info.name}</div>
                        <div className="text-xs text-[#71717A] mt-0.5">{info.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#FAFAFA] mb-3">Options</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2 rounded hover:bg-[#27272A]/30 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeAnimations}
                    onChange={(e) => setOption('includeAnimations', e.target.checked)}
                    disabled={options.format === 'obj'} // OBJ doesn't support animations
                    className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-[#FAFAFA]">Include Animations</span>
                    {options.format === 'obj' && (
                      <span className="text-xs text-[#71717A] ml-2">(Not supported)</span>
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2 rounded hover:bg-[#27272A]/30 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeMaterials}
                    onChange={(e) => setOption('includeMaterials', e.target.checked)}
                    className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                  />
                  <span className="text-sm text-[#FAFAFA]">Include Materials</span>
                </label>

                <label className="flex items-center gap-3 p-2 rounded hover:bg-[#27272A]/30 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.embedTextures}
                    onChange={(e) => setOption('embedTextures', e.target.checked)}
                    disabled={!options.includeMaterials}
                    className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-[#FAFAFA]">Embed Textures</span>
                    {!options.includeMaterials && (
                      <span className="text-xs text-[#71717A] ml-2">(Requires materials)</span>
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2 rounded hover:bg-[#27272A]/30 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeMorphTargets}
                    onChange={(e) => setOption('includeMorphTargets', e.target.checked)}
                    className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                  />
                  <span className="text-sm text-[#FAFAFA]">Include Morph Targets</span>
                </label>

                {(options.format === 'glb' || options.format === 'gltf') && (
                  <label className="flex items-center gap-3 p-2 rounded hover:bg-[#27272A]/30 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.useDracoCompression}
                      onChange={(e) => setOption('useDracoCompression', e.target.checked)}
                      className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-[#FAFAFA]">Draco Compression</span>
                      <span className="text-xs text-[#71717A] ml-2">(Reduces file size 90%)</span>
                    </div>
                  </label>
                )}

                <label className="flex items-center gap-3 p-2 rounded hover:bg-[#27272A]/30 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.exportSelectionOnly}
                    onChange={(e) => setOption('exportSelectionOnly', e.target.checked)}
                    disabled={selectedIds.length === 0}
                    className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0B] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-[#FAFAFA]">Export Selection Only</span>
                    {selectedIds.length > 0 && (
                      <span className="text-xs text-[#71717A] ml-2">({selectedIds.length} selected)</span>
                    )}
                    {selectedIds.length === 0 && (
                      <span className="text-xs text-[#71717A] ml-2">(No selection)</span>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Filename */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#FAFAFA] mb-2">Filename</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="flex-1 bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                  placeholder="scene"
                />
                <span className="text-sm text-[#71717A] font-mono">.{options.format}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 p-3 bg-[#0A0A0B] border border-[#27272A] rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#71717A]">Objects:</span>{' '}
                  <span className="text-[#FAFAFA] font-medium">
                    {options.exportSelectionOnly ? selectedIds.length : getAllObjects().length}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A]">Animations:</span>{' '}
                  <span className="text-[#FAFAFA] font-medium">
                    {options.includeAnimations ? animations.size : 0}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={progress.isExporting}
            className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={progress.isExporting || !filename.trim()}
            className="px-4 py-2 bg-[#7C3AED] text-white text-sm rounded hover:bg-[#6D28D9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {progress.isExporting ? 'Exporting...' : 'Export Scene'}
          </button>
        </div>

        {/* Error Display */}
        {progress.error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{progress.error}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
