/**
 * Boolean Operations Panel
 *
 * CSG operations for combining/modifying meshes.
 */

import { useState } from 'react';
import { Plus, Minus, Circle, AlertCircle } from 'lucide-react';
import { useObjectsStore } from '../../stores/objectsStore';
import { useBooleanOperationsStore, BooleanOperation } from '../../stores/booleanOperationsStore';
import { useCommandStore } from '../../stores/commandStore';
import { meshRegistry } from '../../lib/mesh/MeshRegistry';
import { validateMeshForBoolean } from '../../lib/mesh/BooleanOperations';
import { BooleanOperationCommand } from '../../lib/commands/BooleanCommands';

export function BooleanOperationsPanel() {
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const getObject = useObjectsStore((state) => state.getObject);
  const executeCommand = useCommandStore((state) => state.executeCommand);
  const keepOriginals = useBooleanOperationsStore((state) => state.keepOriginals);
  const setKeepOriginals = useBooleanOperationsStore((state) => state.setKeepOriginals);

  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedIds.length !== 2) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-[#A1A1AA] mx-auto mb-3" />
        <div className="text-[#A1A1AA] text-sm">
          Select exactly 2 objects for boolean operations
        </div>
        <div className="text-xs text-[#71717A] mt-2">
          Currently selected: {selectedIds.length}
        </div>
      </div>
    );
  }

  const object1 = getObject(selectedIds[0]);
  const object2 = getObject(selectedIds[1]);

  if (!object1 || !object2) {
    return <div className="p-6 text-center text-[#A1A1AA] text-sm">Objects not found</div>;
  }

  const performBooleanOperation = async (operation: BooleanOperation) => {
    setIsProcessing(true);

    try {
      // Get meshes from registry for validation
      const mesh1 = meshRegistry.getMesh(object1.id);
      const mesh2 = meshRegistry.getMesh(object2.id);

      if (!mesh1 || !mesh2) {
        throw new Error('Meshes not found in registry');
      }

      // Validate meshes
      const validation1 = validateMeshForBoolean(mesh1);
      const validation2 = validateMeshForBoolean(mesh2);

      if (!validation1.valid) {
        throw new Error(`Object 1: ${validation1.reason}`);
      }
      if (!validation2.valid) {
        throw new Error(`Object 2: ${validation2.reason}`);
      }

      // Create and execute single atomic command
      const command = new BooleanOperationCommand(
        object1.id,
        object2.id,
        operation,
        keepOriginals
      );

      executeCommand(command);

      console.log('[BooleanOps] Operation completed with undo/redo support');
    } catch (error) {
      console.error('[BooleanOps] Operation failed:', error);
      alert(`Boolean operation failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-[#FAFAFA]">Boolean Operations</h3>
        <div className="text-xs text-[#A1A1AA] space-y-1">
          <p>Base: <span className="text-[#FAFAFA]">{object1.name}</span></p>
          <p>Tool: <span className="text-[#FAFAFA]">{object2.name}</span></p>
        </div>
      </div>

      {/* Operation Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {/* Union */}
        <button
          onClick={() => performBooleanOperation('union')}
          disabled={isProcessing}
          className="flex flex-col items-center gap-2 p-4 bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
        >
          <Plus className="w-6 h-6 text-green-400 group-hover:text-green-300" />
          <span className="text-xs font-medium text-[#FAFAFA]">Union</span>
          <span className="text-xs text-[#71717A]">A + B</span>
        </button>

        {/* Subtract */}
        <button
          onClick={() => performBooleanOperation('subtract')}
          disabled={isProcessing}
          className="flex flex-col items-center gap-2 p-4 bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
        >
          <Minus className="w-6 h-6 text-red-400 group-hover:text-red-300" />
          <span className="text-xs font-medium text-[#FAFAFA]">Subtract</span>
          <span className="text-xs text-[#71717A]">A - B</span>
        </button>

        {/* Intersect */}
        <button
          onClick={() => performBooleanOperation('intersect')}
          disabled={isProcessing}
          className="flex flex-col items-center gap-2 p-4 bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
        >
          <div className="relative w-6 h-6">
            <Circle className="w-6 h-6 text-blue-400 group-hover:text-blue-300 absolute" />
            <Circle className="w-6 h-6 text-blue-400 group-hover:text-blue-300 absolute translate-x-1" style={{ opacity: 0.5 }} />
          </div>
          <span className="text-xs font-medium text-[#FAFAFA]">Intersect</span>
          <span className="text-xs text-[#71717A]">A ∩ B</span>
        </button>
      </div>

      {/* Options */}
      <div className="space-y-3 p-3 bg-[#0A0A0B] rounded-lg border border-[#27272A]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={keepOriginals}
            onChange={(e) => setKeepOriginals(e.target.checked)}
            className="w-4 h-4 accent-purple-500"
          />
          <span className="text-sm text-[#FAFAFA]">Keep Original Meshes</span>
        </label>
        <p className="text-xs text-[#A1A1AA] pl-6">
          {keepOriginals
            ? 'Originals will be kept (result added as new object)'
            : 'Originals will be deleted (replaced by result)'}
        </p>
      </div>

      {/* Help Text */}
      <div className="text-xs text-[#A1A1AA] space-y-1 bg-purple-950/20 p-3 rounded border border-purple-500/20">
        <p>• <strong>Union:</strong> Combine meshes into one</p>
        <p>• <strong>Subtract:</strong> Remove Tool from Base</p>
        <p>• <strong>Intersect:</strong> Keep only overlap</p>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="text-center py-4">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-xs text-[#A1A1AA]">Processing...</p>
        </div>
      )}
    </div>
  );
}
