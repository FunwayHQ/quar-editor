/**
 * Object Creation Toolbar
 *
 * Toolbar for creating primitive 3D objects.
 */

import React from 'react';
import {
  Box,
  Circle,
  Cylinder as CylinderIcon,
  Triangle,
  Torus as TorusIcon,
  Square,
  Lightbulb,
  Zap,
  Sun,
  CloudSun,
} from 'lucide-react';
import { useObjectsStore, ObjectType } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { CreateObjectCommand } from '../../lib/commands/ObjectCommands';
import { FileImport } from '../import/FileImport';

const primitiveIcons: Record<ObjectType, React.ElementType> = {
  box: Box,
  sphere: Circle,
  cylinder: CylinderIcon,
  cone: Triangle,
  torus: TorusIcon,
  plane: Square,
  group: Box,
  camera: Box,
  imported: Box,
  pointLight: Lightbulb,
  spotLight: Zap,
  directionalLight: Sun,
  ambientLight: CloudSun,
};

const primitiveLabels: Record<ObjectType, string> = {
  box: 'Cube',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  torus: 'Torus',
  plane: 'Plane',
  group: 'Group',
  camera: 'Camera',
  imported: 'Imported',
  pointLight: 'Point Light',
  spotLight: 'Spot Light',
  directionalLight: 'Directional Light',
  ambientLight: 'Ambient Light',
};

export function ObjectCreationToolbar() {
  const createPrimitive = useObjectsStore((state) => state.createPrimitive);
  const executeCommand = useCommandStore((state) => state.executeCommand);

  const handleCreateObject = (type: ObjectType) => {
    // Use the store's createPrimitive which handles lights and primitives properly
    const object = createPrimitive(type, [0, 0, 0]);  // Create at origin
    const command = new CreateObjectCommand(object);
    executeCommand(command);
  };

  const primitives: ObjectType[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'];
  const lights: ObjectType[] = ['pointLight', 'spotLight', 'directionalLight', 'ambientLight'];

  const primitiveShortcuts: Record<ObjectType, string> = {
    box: 'Shift+1',
    sphere: 'Shift+2',
    cylinder: 'Shift+3',
    cone: 'Shift+4',
    torus: 'Shift+5',
    plane: 'Shift+6',
    pointLight: 'Shift+7',
    spotLight: 'Shift+8',
    directionalLight: 'Shift+9',
    ambientLight: 'Shift+0',
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 bg-[#18181B]/80 backdrop-blur-md border border-[#27272A] rounded-lg px-3 py-2 shadow-lg">
        {primitives.map((type, idx) => {
          const Icon = primitiveIcons[type];
          const shortcut = primitiveShortcuts[type];
          return (
            <button
              key={type}
              onClick={() => handleCreateObject(type)}
              className="p-2 rounded hover:bg-surface-2 active:scale-95 transition-all group relative"
              title={shortcut ? `Create ${primitiveLabels[type]} (${shortcut})` : `Create ${primitiveLabels[type]}`}
            >
              <Icon className="w-5 h-5 text-[#FAFAFA]" />
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-[#18181B] border border-[#27272A] rounded text-xs text-[#FAFAFA] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {primitiveLabels[type]}
                {shortcut && <span className="ml-2 text-[#7C3AED]">{shortcut}</span>}
              </span>
            </button>
          );
        })}

        <div className="w-px h-6 bg-[#27272A]" />

        {lights.map((type) => {
          const Icon = primitiveIcons[type];
          const shortcut = primitiveShortcuts[type];
          return (
            <button
              key={type}
              onClick={() => handleCreateObject(type)}
              className="p-2 rounded hover:bg-surface-2 active:scale-95 transition-all group relative"
              title={shortcut ? `Create ${primitiveLabels[type]} (${shortcut})` : `Create ${primitiveLabels[type]}`}
            >
              <Icon className="w-5 h-5 text-[#F59E0B]" />
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-[#18181B] border border-[#27272A] rounded text-xs text-[#FAFAFA] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {primitiveLabels[type]}
                {shortcut && <span className="ml-2 text-[#F59E0B]">{shortcut}</span>}
              </span>
            </button>
          );
        })}

        <div className="w-px h-6 bg-[#27272A]" />

        {/* Import File */}
        <FileImport />
      </div>
    </div>
  );
}
