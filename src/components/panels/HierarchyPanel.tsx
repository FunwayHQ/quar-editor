/**
 * Hierarchy Panel Component
 *
 * Displays the scene hierarchy tree with all objects.
 */

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Edit3,
  Layers,
  Spline,
  Group,
  Ungroup,
} from 'lucide-react';
import { useObjectsStore, SceneObject } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { useEditModeStore } from '../../stores/editModeStore';
import { useCurveStore } from '../../stores/curveStore';
import { DeleteObjectsCommand, DuplicateObjectsCommand, UpdateObjectCommand } from '../../lib/commands/ObjectCommands';
import { GroupObjectsCommand, UngroupObjectsCommand } from '../../lib/commands/GroupCommands';
import { CurvePanel } from './CurvePanel';

interface ObjectTreeItemProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: (id: string, multiSelect: boolean) => void;
  depth: number;
}

function ObjectTreeItem({ object, isSelected, onSelect, depth }: ObjectTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(object.name);

  const updateObject = useObjectsStore((state) => state.updateObject);
  const getChildren = useObjectsStore((state) => state.getChildren);
  const executeCommand = useCommandStore((state) => state.executeCommand);
  const selectedIds = useObjectsStore((state) => state.selectedIds);

  const children = getChildren(object.id);
  const hasChildren = children.length > 0;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(object.id, e.shiftKey || e.ctrlKey || e.metaKey);
  };

  const handleToggleVisible = (e: React.MouseEvent) => {
    e.stopPropagation();
    const oldValue = { visible: object.visible };
    const newValue = { visible: !object.visible };
    const command = new UpdateObjectCommand(object.id, oldValue, newValue);
    executeCommand(command);
  };

  const handleToggleLocked = (e: React.MouseEvent) => {
    e.stopPropagation();
    const oldValue = { locked: object.locked };
    const newValue = { locked: !object.locked };
    const command = new UpdateObjectCommand(object.id, oldValue, newValue);
    executeCommand(command);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleNameChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const oldValue = { name: object.name };
      const newValue = { name: editName };
      const command = new UpdateObjectCommand(object.id, oldValue, newValue);
      executeCommand(command);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditName(object.name);
      setIsEditing(false);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[#27272A] transition-colors ${
          isSelected ? 'bg-[#7C3AED]/20 border-l-2 border-[#7C3AED]' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button onClick={handleToggleExpand} className="p-0.5 hover:bg-[#27272A] rounded">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
            ) : (
              <ChevronRight className="w-3 h-3 text-[#A1A1AA]" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Name */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleNameChange}
            onBlur={() => setIsEditing(false)}
            autoFocus
            className="flex-1 bg-[#18181B] border border-[#7C3AED] rounded px-1 text-sm text-[#FAFAFA] outline-none"
          />
        ) : (
          <span className="flex-1 text-sm text-[#FAFAFA] truncate">{object.name}</span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button
            onClick={handleToggleVisible}
            className="p-0.5 hover:bg-[#27272A] rounded"
            title={object.visible ? 'Hide' : 'Show'}
          >
            {object.visible ? (
              <Eye className="w-3 h-3 text-[#A1A1AA]" />
            ) : (
              <EyeOff className="w-3 h-3 text-[#A1A1AA]" />
            )}
          </button>

          <button
            onClick={handleToggleLocked}
            className="p-0.5 hover:bg-[#27272A] rounded"
            title={object.locked ? 'Unlock' : 'Lock'}
          >
            {object.locked ? (
              <Lock className="w-3 h-3 text-[#A1A1AA]" />
            ) : (
              <Unlock className="w-3 h-3 text-[#A1A1AA]" />
            )}
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <ObjectTreeItem
              key={child.id}
              object={child}
              isSelected={selectedIds.includes(child.id)}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchyPanel() {
  const [activeTab, setActiveTab] = useState<'objects' | 'curves'>('objects');
  const objects = useObjectsStore((state) => state.getAllObjects());
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const toggleSelection = useObjectsStore((state) => state.toggleSelection);
  const clearObjectSelection = useObjectsStore((state) => state.clearSelection);
  const clearCurveSelection = useCurveStore((state) => state.clearSelection);
  const executeCommand = useCommandStore((state) => state.executeCommand);
  const { enterEditMode } = useEditModeStore();

  // Filter to show only root-level objects (no parent)
  const rootObjects = objects.filter((obj) => obj.parentId === null);

  const handleEnterEditMode = () => {
    if (selectedIds.length === 1) {
      enterEditMode(selectedIds[0]);
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    const command = new DeleteObjectsCommand(selectedIds);
    executeCommand(command);
  };

  const handleDuplicate = () => {
    if (selectedIds.length === 0) return;
    const command = new DuplicateObjectsCommand(selectedIds);
    executeCommand(command);
  };

  const handleGroup = () => {
    if (selectedIds.length < 2) return;
    const command = new GroupObjectsCommand(selectedIds);
    executeCommand(command);

    // Clear selection after grouping (group will be created)
    clearObjectSelection();
  };

  const handleUngroup = () => {
    if (selectedIds.length !== 1) return;

    const selectedObject = objects.find(obj => obj.id === selectedIds[0]);
    if (!selectedObject || selectedObject.type !== 'group') return;

    const command = new UngroupObjectsCommand(selectedIds[0]);
    executeCommand(command);

    // Clear selection after ungrouping
    clearObjectSelection();
  };

  // Check if selected object is a group (for ungroup button)
  const selectedIsGroup = selectedIds.length === 1 &&
    objects.find(obj => obj.id === selectedIds[0])?.type === 'group';

  return (
    <div className="w-64 h-full bg-[#18181B]/80 backdrop-blur-md border-r border-[#27272A] flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-[#27272A]">
        <button
          onClick={() => setActiveTab('objects')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'objects'
              ? 'text-[#FAFAFA] border-b-2 border-purple-500'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Objects
        </button>
        <button
          onClick={() => setActiveTab('curves')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'curves'
              ? 'text-[#FAFAFA] border-b-2 border-purple-500'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
          }`}
        >
          <Spline className="w-4 h-4" />
          Curves
        </button>
      </div>

      {/* Objects Tab Content */}
      {activeTab === 'objects' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#27272A]">
            <h2 className="text-sm font-medium text-[#FAFAFA]">Scene</h2>
            <div className="flex items-center gap-1">
          <button
            onClick={handleGroup}
            disabled={selectedIds.length < 2}
            className="p-1.5 rounded hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Group (Ctrl+G)"
          >
            <Group className="w-4 h-4 text-[#A1A1AA]" />
          </button>
          <button
            onClick={handleUngroup}
            disabled={!selectedIsGroup}
            className="p-1.5 rounded hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Ungroup (Ctrl+Shift+G)"
          >
            <Ungroup className="w-4 h-4 text-[#A1A1AA]" />
          </button>
          <button
            onClick={handleEnterEditMode}
            disabled={selectedIds.length !== 1}
            className="p-1.5 rounded hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Edit Mode (Tab)"
          >
            <Edit3 className="w-4 h-4 text-[#A1A1AA]" />
          </button>
          <button
            onClick={handleDuplicate}
            disabled={selectedIds.length === 0}
            className="p-1.5 rounded hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-4 h-4 text-[#A1A1AA]" />
          </button>
          <button
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
            className="p-1.5 rounded hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Delete (Del)"
          >
            <Trash2 className="w-4 h-4 text-[#A1A1AA]" />
          </button>
            </div>
          </div>

          {/* Object Tree */}
          <div
            className="flex-1 overflow-y-auto"
            onClick={(e) => {
              // Deselect when clicking empty space
              if (e.target === e.currentTarget) {
                clearObjectSelection();
              }
            }}
          >
        {rootObjects.length === 0 ? (
          <div className="p-4 text-center text-sm text-[#A1A1AA]">
            No objects in scene
            <br />
            <span className="text-xs">Add objects using the toolbar above</span>
          </div>
        ) : (
          <div className="group">
            {rootObjects.map((object) => (
              <ObjectTreeItem
                key={object.id}
                object={object}
                isSelected={selectedIds.includes(object.id)}
                onSelect={toggleSelection}
                depth={0}
              />
            ))}
          </div>
        )}
          </div>
        </>
      )}

      {/* Curves Tab Content */}
      {activeTab === 'curves' && (
        <div
          className="flex-1 overflow-y-auto"
          onClick={(e) => {
            // Deselect when clicking empty space
            if (e.target === e.currentTarget) {
              clearCurveSelection();
            }
          }}
        >
          <CurvePanel />
        </div>
      )}
    </div>
  );
}
