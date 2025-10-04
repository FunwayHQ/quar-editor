/**
 * Export Presets
 *
 * Common export configurations for different platforms and use cases.
 * Sprint 7: Export System + Polygon Editing MVP - Day 4
 */

import { ExportOptions } from '../../stores/exportStore';

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  options: Partial<ExportOptions>;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'web-optimized',
    name: 'Web Optimized',
    description: 'Draco compressed GLB for fast web loading',
    icon: '🌐',
    options: {
      format: 'glb',
      binary: true,
      includeAnimations: true,
      includeMaterials: true,
      includeMorphTargets: true,
      embedTextures: true,
      useDracoCompression: true,
      dracoCompressionLevel: 10, // Maximum compression for web
    },
  },
  {
    id: 'mobile-ar',
    name: 'Mobile AR',
    description: 'USDZ for iOS AR Quick Look',
    icon: '📱',
    options: {
      format: 'usdz',
      includeAnimations: false, // USDZ animation support limited
      includeMaterials: true,
      includeMorphTargets: false,
      embedTextures: true,
      useDracoCompression: false, // USDZ doesn't use Draco
      dracoCompressionLevel: 0,
    },
  },
  {
    id: 'desktop-editing',
    name: 'Desktop Editing',
    description: 'Uncompressed GLTF for Blender, Maya, etc.',
    icon: '🖥️',
    options: {
      format: 'gltf',
      binary: false, // JSON format for readability
      includeAnimations: true,
      includeMaterials: true,
      includeMorphTargets: true,
      embedTextures: false, // Separate texture files
      useDracoCompression: false, // No compression for editing
      dracoCompressionLevel: 0,
    },
  },
  {
    id: 'game-engine',
    name: 'Game Engine',
    description: 'GLB for Unity, Unreal, Godot (FBX not available in browser)',
    icon: '🎮',
    options: {
      format: 'glb',
      binary: true,
      includeAnimations: true,
      includeMaterials: true,
      includeMorphTargets: true,
      embedTextures: true,
      useDracoCompression: false, // Game engines can handle uncompressed
      dracoCompressionLevel: 0,
    },
  },
  {
    id: '3d-printing',
    name: '3D Printing',
    description: 'OBJ with no materials for printing',
    icon: '🖨️',
    options: {
      format: 'obj',
      includeAnimations: false,
      includeMaterials: false,
      includeMorphTargets: false,
      embedTextures: false,
      useDracoCompression: false,
      dracoCompressionLevel: 0,
    },
  },
  {
    id: 'high-quality',
    name: 'High Quality',
    description: 'GLB with all features, minimal compression',
    icon: '✨',
    options: {
      format: 'glb',
      binary: true,
      includeAnimations: true,
      includeMaterials: true,
      includeMorphTargets: true,
      embedTextures: true,
      useDracoCompression: true,
      dracoCompressionLevel: 3, // Light compression, preserves quality
    },
  },
  {
    id: 'maximum-compatibility',
    name: 'Maximum Compatibility',
    description: 'GLTF with standard options for all viewers',
    icon: '🔄',
    options: {
      format: 'gltf',
      binary: false,
      includeAnimations: true,
      includeMaterials: true,
      includeMorphTargets: false, // Not all viewers support
      embedTextures: true,
      useDracoCompression: false, // Maximum compatibility
      dracoCompressionLevel: 0,
    },
  },
];

/**
 * Get a preset by ID
 */
export function getPreset(id: string): ExportPreset | undefined {
  return EXPORT_PRESETS.find((p) => p.id === id);
}

/**
 * Apply a preset to current export options
 */
export function applyPreset(
  preset: ExportPreset,
  currentOptions: ExportOptions
): ExportOptions {
  return {
    ...currentOptions,
    ...preset.options,
  };
}
