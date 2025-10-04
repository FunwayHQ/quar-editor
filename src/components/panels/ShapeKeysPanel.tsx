/**
 * Shape Keys Panel Component
 *
 * UI panel for managing shape keys/morph targets for vertex animation.
 * Allows creating, editing, and blending shape keys.
 */

import React, { useEffect, useState } from 'react';
import {
  Layers3,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Edit2,
  Save,
  X,
  Sliders,
  Target,
  Lock,
  Unlock,
  Key
} from 'lucide-react';
import { useMorphTargetStore } from '../../stores/morphTargetStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { useEditModeStore } from '../../stores/editModeStore';
import { useAnimationStore } from '../../stores/animationStore';
import { meshRegistry } from '../../lib/mesh/MeshRegistry';
import * as THREE from 'three';

export function ShapeKeysPanel() {
  const {
    shapeKeysByObject,
    activeShapeKeyId,
    createShapeKey,
    updateShapeKey,
    deleteShapeKey,
    setShapeKeyValue,
    setActiveShapeKey,
    captureCurrentAsShapeKey,
    blendShapeKeys,
    storeBasePose,
    getBasePose,
  } = useMorphTargetStore();

  const { selectedIds } = useObjectsStore();
  const { isEditMode, editingObjectId } = useEditModeStore();
  const {
    activeAnimationId,
    currentTime,
    autoKeyframe,
    addKeyframe,
    getActiveAnimation
  } = useAnimationStore();

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  // Get the current object ID (either from edit mode or selection)
  const currentObjectId = editingObjectId || selectedIds[0];

  // Get shape keys for current object
  const shapeKeys = currentObjectId
    ? shapeKeysByObject.get(currentObjectId) || []
    : [];

  // Apply blended shape keys to mesh
  useEffect(() => {
    if (!currentObjectId) return;

    const mesh = meshRegistry.getMesh(currentObjectId);
    if (!mesh || !mesh.geometry) return;

    const blendedPositions = blendShapeKeys(currentObjectId);
    if (blendedPositions) {
      const positions = mesh.geometry.attributes.position;
      positions.array.set(blendedPositions);
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
  }, [currentObjectId, shapeKeys, blendShapeKeys]);

  const handleCreateShapeKey = () => {
    if (!currentObjectId) return;

    const mesh = meshRegistry.getMesh(currentObjectId);
    if (!mesh || !mesh.geometry) return;

    // Store base pose if this is the first shape key
    if (shapeKeys.length === 0) {
      storeBasePose(currentObjectId, mesh.geometry);
    }

    // Capture current state as new shape key
    const shapeKey = captureCurrentAsShapeKey(
      currentObjectId,
      mesh.geometry,
      `Shape Key ${shapeKeys.length + 1}`
    );

    if (shapeKey) {
      console.log('Created shape key:', shapeKey.name);
    }
  };

  const handleCaptureFromEdit = () => {
    if (!currentObjectId || !isEditMode) return;

    const mesh = meshRegistry.getMesh(currentObjectId);
    if (!mesh || !mesh.geometry) return;

    // Store base pose if this is the first shape key
    if (shapeKeys.length === 0) {
      const basePose = getBasePose(currentObjectId);
      if (!basePose) {
        storeBasePose(currentObjectId, mesh.geometry);
      }
    }

    // Capture current edited state
    const shapeKey = captureCurrentAsShapeKey(
      currentObjectId,
      mesh.geometry,
      `Edited Shape ${shapeKeys.length + 1}`
    );

    if (shapeKey) {
      console.log('Captured edited shape as:', shapeKey.name);
    }
  };

  const handleDeleteShapeKey = (id: string) => {
    deleteShapeKey(id);
  };

  const handleValueChange = (id: string, value: number) => {
    setShapeKeyValue(id, value);

    // Auto-keyframe if enabled
    if (autoKeyframe && activeAnimationId && currentObjectId) {
      createShapeKeyframe(id, value);
    }
  };

  const createShapeKeyframe = (shapeKeyId: string, value: number) => {
    if (!activeAnimationId || !currentObjectId) return;

    // Find or create track for this shape key
    const animation = getActiveAnimation();
    if (!animation) return;

    let track = animation.tracks.find(
      t => t.objectId === currentObjectId &&
          t.property === 'shapeKey' &&
          t.shapeKeyId === shapeKeyId
    );

    if (!track) {
      // Create new track for this shape key
      const shapeKey = shapeKeys.find(sk => sk.id === shapeKeyId);
      if (!shapeKey) return;

      track = {
        id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        objectId: currentObjectId,
        property: 'shapeKey',
        propertyPath: ['shapeKey', shapeKeyId],
        shapeKeyId: shapeKeyId,
        keyframes: [],
        enabled: true,
        color: '#FF69B4', // Pink for shape keys
      };

      // Add track to animation
      useAnimationStore.getState().addTrack(activeAnimationId, track);
    }

    // Add keyframe
    addKeyframe(track.id, currentTime, value, 'linear');
  };

  const handleAddKeyframe = (shapeKeyId: string, value: number) => {
    createShapeKeyframe(shapeKeyId, value);
  };

  const handleEditName = (id: string, name: string) => {
    setEditingNameId(id);
    setTempName(name);
  };

  const handleSaveName = () => {
    if (editingNameId) {
      updateShapeKey(editingNameId, { name: tempName });
      setEditingNameId(null);
      setTempName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingNameId(null);
    setTempName('');
  };

  const handleResetToBase = () => {
    // Set all shape key values to 0
    shapeKeys.forEach(sk => {
      setShapeKeyValue(sk.id, 0);
    });
  };

  if (!currentObjectId) {
    return (
      <div className="p-4 text-sm text-[#71717A]">
        Select an object to manage shape keys
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[#27272A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers3 className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-sm font-medium text-[#FAFAFA]">Shape Keys</h3>
          </div>
          <div className="flex gap-1">
            {isEditMode && (
              <button
                onClick={handleCaptureFromEdit}
                className="p-1.5 hover:bg-[#27272A] rounded transition-colors"
                title="Capture from Edit"
              >
                <Save className="w-3.5 h-3.5 text-[#7C3AED]" />
              </button>
            )}
            <button
              onClick={handleCreateShapeKey}
              className="p-1.5 hover:bg-[#27272A] rounded transition-colors"
              title="Add Shape Key"
            >
              <Plus className="w-3.5 h-3.5 text-[#A1A1AA]" />
            </button>
          </div>
        </div>
        <div className="text-xs text-[#71717A] mt-1">
          {shapeKeys.length} shape key{shapeKeys.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Shape Keys List */}
      <div className="flex-1 overflow-y-auto">
        {shapeKeys.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#71717A]">
            <Layers3 className="w-8 h-8 mx-auto mb-2 text-[#3F3F46]" />
            <p>No shape keys yet</p>
            <p className="mt-1">
              {isEditMode
                ? "Modify the mesh and click the save button"
                : "Enter edit mode to create shape keys"}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {/* Base Shape */}
            <div className="p-2 bg-[#18181B]/50 rounded border border-[#27272A]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-[#71717A]" />
                  <span className="text-xs font-medium text-[#A1A1AA]">Base Shape</span>
                </div>
                <button
                  onClick={handleResetToBase}
                  className="text-xs px-2 py-0.5 bg-[#27272A] rounded hover:bg-[#3F3F46] transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Shape Keys */}
            {shapeKeys.map((shapeKey) => (
              <div
                key={shapeKey.id}
                className={`p-2 bg-[#18181B]/50 rounded border transition-colors ${
                  activeShapeKeyId === shapeKey.id
                    ? 'border-[#7C3AED]'
                    : 'border-[#27272A]'
                }`}
              >
                {/* Name and Controls */}
                <div className="flex items-center justify-between mb-2">
                  {editingNameId === shapeKey.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1 px-1 py-0.5 text-xs bg-[#0A0A0B] border border-[#7C3AED] rounded focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        className="p-0.5 hover:bg-[#27272A] rounded"
                      >
                        <Save className="w-3 h-3 text-[#10B981]" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-0.5 hover:bg-[#27272A] rounded"
                      >
                        <X className="w-3 h-3 text-[#EF4444]" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setActiveShapeKey(
                          activeShapeKeyId === shapeKey.id ? null : shapeKey.id
                        )}
                        className="flex items-center gap-1.5 hover:text-[#FAFAFA] transition-colors"
                      >
                        <Target
                          className={`w-3 h-3 ${
                            activeShapeKeyId === shapeKey.id
                              ? 'text-[#7C3AED]'
                              : 'text-[#71717A]'
                          }`}
                        />
                        <span className="text-xs text-[#FAFAFA]">{shapeKey.name}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        {activeAnimationId && (
                          <button
                            onClick={() => handleAddKeyframe(shapeKey.id, shapeKey.value)}
                            className="p-0.5 hover:bg-[#27272A] rounded transition-colors"
                            title="Add Keyframe"
                          >
                            <Key className={`w-3 h-3 ${autoKeyframe ? 'text-[#EF4444]' : 'text-[#71717A]'}`} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditName(shapeKey.id, shapeKey.name)}
                          className="p-0.5 hover:bg-[#27272A] rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-[#71717A]" />
                        </button>
                        <button
                          onClick={() => handleDeleteShapeKey(shapeKey.id)}
                          className="p-0.5 hover:bg-[#27272A] rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-[#71717A] hover:text-[#EF4444]" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Value Slider */}
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={shapeKey.value}
                    onChange={(e) => handleValueChange(shapeKey.id, parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${
                        shapeKey.value * 100
                      }%, #27272A ${shapeKey.value * 100}%, #27272A 100%)`,
                    }}
                  />
                  <input
                    type="number"
                    value={shapeKey.value.toFixed(2)}
                    onChange={(e) => handleValueChange(shapeKey.id, parseFloat(e.target.value) || 0)}
                    min="0"
                    max="1"
                    step="0.01"
                    className="w-12 px-1 py-0.5 text-xs bg-[#0A0A0B] border border-[#27272A] rounded text-[#FAFAFA] text-center focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Help */}
      {shapeKeys.length > 0 && (
        <div className="p-3 border-t border-[#27272A] text-xs text-[#71717A]">
          <p>Adjust sliders to blend shape keys</p>
          <p className="mt-1">Edit mode + Save to capture new shapes</p>
        </div>
      )}
    </div>
  );
}