/**
 * Modifier Panel Component
 *
 * UI for managing non-destructive modifier stack
 * Sprint 7: Export System + Polygon Editing MVP - Day 3
 */

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Settings,
  Grid3x3,
  Copy,
  Divide,
  Box,
  Move3d,
} from 'lucide-react';
import { useModifierStore, ModifierType } from '../../stores/modifierStore';
import { useObjectsStore } from '../../stores/objectsStore';

const MODIFIER_ICONS: Record<ModifierType, React.ComponentType<any>> = {
  subdivision: Grid3x3,
  mirror: Copy,
  array: Layers,
  bevel: Divide,
  solidify: Box,
  displace: Move3d,
};

const MODIFIER_DESCRIPTIONS: Record<ModifierType, string> = {
  subdivision: 'Smooth geometry by subdividing faces',
  mirror: 'Mirror geometry across an axis',
  array: 'Create multiple copies in a pattern',
  bevel: 'Round edges and corners',
  solidify: 'Add thickness to surfaces',
  displace: 'Offset vertices along normals',
};

export function ModifierPanel() {
  const { selectedIds } = useObjectsStore();
  const {
    getModifiers,
    addModifier,
    removeModifier,
    updateModifier,
    toggleModifier,
    moveModifierUp,
    moveModifierDown,
  } = useModifierStore();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [expandedModifiers, setExpandedModifiers] = useState<Set<string>>(new Set());

  const currentObjectId = selectedIds[0];
  const modifiers = currentObjectId ? getModifiers(currentObjectId) : [];

  const handleAddModifier = (type: ModifierType) => {
    if (currentObjectId) {
      const modifier = addModifier(currentObjectId, type);
      setExpandedModifiers(new Set([...expandedModifiers, modifier.id]));
    }
    setShowAddMenu(false);
  };

  const toggleExpanded = (modifierId: string) => {
    const newExpanded = new Set(expandedModifiers);
    if (newExpanded.has(modifierId)) {
      newExpanded.delete(modifierId);
    } else {
      newExpanded.add(modifierId);
    }
    setExpandedModifiers(newExpanded);
  };

  if (!currentObjectId) {
    return (
      <div className="p-4 text-sm text-[#71717A]">
        Select an object to add modifiers
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[#27272A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-sm font-medium text-[#FAFAFA]">Modifiers</h3>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="p-1.5 hover:bg-[#27272A] rounded transition-colors"
              title="Add Modifier"
            >
              <Plus className="w-3.5 h-3.5 text-[#A1A1AA]" />
            </button>

            {/* Add Modifier Menu */}
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl z-50">
                <div className="p-2 space-y-1">
                  {(Object.keys(MODIFIER_ICONS) as ModifierType[]).map((type) => {
                    const Icon = MODIFIER_ICONS[type];
                    return (
                      <button
                        key={type}
                        onClick={() => handleAddModifier(type)}
                        className="w-full flex items-start gap-2 px-2 py-1.5 hover:bg-[#27272A] rounded transition-colors text-left"
                      >
                        <Icon className="w-4 h-4 text-[#7C3AED] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[#FAFAFA] capitalize">
                            {type}
                          </div>
                          <div className="text-[10px] text-[#71717A] leading-tight">
                            {MODIFIER_DESCRIPTIONS[type]}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-[#71717A] mt-1">
          {modifiers.length} modifier{modifiers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Modifier Stack */}
      <div className="flex-1 overflow-y-auto">
        {modifiers.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#71717A]">
            <Layers className="w-8 h-8 mx-auto mb-2 text-[#3F3F46]" />
            <p>No modifiers yet</p>
            <p className="mt-1">Click + to add modifiers</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {modifiers.map((modifier, index) => {
              const Icon = MODIFIER_ICONS[modifier.type];
              const isExpanded = expandedModifiers.has(modifier.id);

              return (
                <div
                  key={modifier.id}
                  className={`bg-[#18181B]/50 rounded border transition-colors ${
                    isExpanded ? 'border-[#7C3AED]' : 'border-[#27272A]'
                  }`}
                >
                  {/* Modifier Header */}
                  <div className="flex items-center gap-2 p-2">
                    <button
                      onClick={() => toggleExpanded(modifier.id)}
                      className="flex-1 flex items-center gap-2 hover:bg-[#27272A]/30 rounded px-1 transition-colors text-left"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span className="text-xs font-medium text-[#FAFAFA]">
                        {modifier.name}
                      </span>
                    </button>

                    <div className="flex items-center gap-0.5">
                      {/* Toggle Enabled */}
                      <button
                        onClick={() => toggleModifier(currentObjectId, modifier.id)}
                        className="p-1 hover:bg-[#27272A] rounded transition-colors"
                        title={modifier.enabled ? 'Disable' : 'Enable'}
                      >
                        {modifier.enabled ? (
                          <Eye className="w-3 h-3 text-[#10B981]" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-[#71717A]" />
                        )}
                      </button>

                      {/* Move Up */}
                      <button
                        onClick={() => moveModifierUp(currentObjectId, modifier.id)}
                        disabled={index === 0}
                        className="p-1 hover:bg-[#27272A] rounded transition-colors disabled:opacity-30"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3 h-3 text-[#A1A1AA]" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => moveModifierDown(currentObjectId, modifier.id)}
                        disabled={index === modifiers.length - 1}
                        className="p-1 hover:bg-[#27272A] rounded transition-colors disabled:opacity-30"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => removeModifier(currentObjectId, modifier.id)}
                        className="p-1 hover:bg-[#27272A] rounded transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3 text-[#EF4444] hover:text-[#F87171]" />
                      </button>
                    </div>
                  </div>

                  {/* Modifier Parameters (when expanded) */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-[#27272A] mt-2 pt-2">
                      {modifier.type === 'subdivision' && (
                        <div>
                          <label className="text-[10px] text-[#A1A1AA] block mb-1">
                            Subdivision Levels
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="4"
                            value={modifier.params.levels || 1}
                            onChange={(e) =>
                              updateModifier(currentObjectId, modifier.id, {
                                params: { ...modifier.params, levels: parseInt(e.target.value) },
                              })
                            }
                            className="w-full h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="text-[10px] text-[#71717A] mt-1">
                            {modifier.params.levels || 1}
                          </div>
                        </div>
                      )}

                      {modifier.type === 'mirror' && (
                        <>
                          <div>
                            <label className="text-[10px] text-[#A1A1AA] block mb-1">Axis</label>
                            <select
                              value={modifier.params.mirrorAxis || 'x'}
                              onChange={(e) =>
                                updateModifier(currentObjectId, modifier.id, {
                                  params: {
                                    ...modifier.params,
                                    mirrorAxis: e.target.value as 'x' | 'y' | 'z',
                                  },
                                })
                              }
                              className="w-full px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                            >
                              <option value="x">X Axis</option>
                              <option value="y">Y Axis</option>
                              <option value="z">Z Axis</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-[#A1A1AA] block mb-1">
                              Offset
                            </label>
                            <input
                              type="number"
                              value={modifier.params.mirrorOffset || 0}
                              onChange={(e) =>
                                updateModifier(currentObjectId, modifier.id, {
                                  params: {
                                    ...modifier.params,
                                    mirrorOffset: parseFloat(e.target.value),
                                  },
                                })
                              }
                              step="0.1"
                              className="w-full px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                            />
                          </div>
                        </>
                      )}

                      {modifier.type === 'array' && (
                        <>
                          <div>
                            <label className="text-[10px] text-[#A1A1AA] block mb-1">Count</label>
                            <input
                              type="range"
                              min="2"
                              max="10"
                              value={modifier.params.arrayCount || 3}
                              onChange={(e) =>
                                updateModifier(currentObjectId, modifier.id, {
                                  params: {
                                    ...modifier.params,
                                    arrayCount: parseInt(e.target.value),
                                  },
                                })
                              }
                              className="w-full h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-[10px] text-[#71717A] mt-1">
                              {modifier.params.arrayCount || 3}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-[#A1A1AA] block mb-1">Type</label>
                            <select
                              value={modifier.params.arrayType || 'linear'}
                              onChange={(e) =>
                                updateModifier(currentObjectId, modifier.id, {
                                  params: {
                                    ...modifier.params,
                                    arrayType: e.target.value as 'linear' | 'circular',
                                  },
                                })
                              }
                              className="w-full px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                            >
                              <option value="linear">Linear</option>
                              <option value="circular">Circular</option>
                            </select>
                          </div>
                        </>
                      )}

                      {modifier.type === 'bevel' && (
                        <>
                          <div>
                            <label className="text-[10px] text-[#A1A1AA] block mb-1">
                              Amount
                            </label>
                            <input
                              type="number"
                              value={modifier.params.bevelAmount || 0.1}
                              onChange={(e) =>
                                updateModifier(currentObjectId, modifier.id, {
                                  params: {
                                    ...modifier.params,
                                    bevelAmount: parseFloat(e.target.value),
                                  },
                                })
                              }
                              step="0.01"
                              className="w-full px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#A1A1AA] block mb-1">
                              Segments
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="8"
                              value={modifier.params.bevelSegments || 2}
                              onChange={(e) =>
                                updateModifier(currentObjectId, modifier.id, {
                                  params: {
                                    ...modifier.params,
                                    bevelSegments: parseInt(e.target.value),
                                  },
                                })
                              }
                              className="w-full h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-[10px] text-[#71717A] mt-1">
                              {modifier.params.bevelSegments || 2}
                            </div>
                          </div>
                        </>
                      )}

                      {modifier.type === 'solidify' && (
                        <>
                          <div>
                            <label className="text-[10px] text-[#A1A1AA] block mb-1">
                              Thickness
                            </label>
                            <input
                              type="number"
                              value={modifier.params.thickness || 0.1}
                              onChange={(e) =>
                                updateModifier(currentObjectId, modifier.id, {
                                  params: {
                                    ...modifier.params,
                                    thickness: parseFloat(e.target.value),
                                  },
                                })
                              }
                              step="0.01"
                              className="w-full px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#A1A1AA] block mb-1">
                              Offset
                            </label>
                            <input
                              type="number"
                              value={modifier.params.offset || 0}
                              onChange={(e) =>
                                updateModifier(currentObjectId, modifier.id, {
                                  params: { ...modifier.params, offset: parseFloat(e.target.value) },
                                })
                              }
                              step="0.01"
                              className="w-full px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                            />
                          </div>
                        </>
                      )}

                      {modifier.type === 'displace' && (
                        <div>
                          <label className="text-[10px] text-[#A1A1AA] block mb-1">
                            Strength
                          </label>
                          <input
                            type="number"
                            value={modifier.params.displaceStrength || 1}
                            onChange={(e) =>
                              updateModifier(currentObjectId, modifier.id, {
                                params: {
                                  ...modifier.params,
                                  displaceStrength: parseFloat(e.target.value),
                                },
                              })
                            }
                            step="0.1"
                            className="w-full px-2 py-1 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Help */}
      {modifiers.length > 0 && (
        <div className="p-3 border-t border-[#27272A] text-xs text-[#71717A]">
          <p>Modifiers are applied from top to bottom</p>
          <p className="mt-1">Click modifier name to edit parameters</p>
        </div>
      )}
    </div>
  );
}
