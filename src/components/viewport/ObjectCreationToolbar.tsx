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

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
      <div className="flex gap-2 bg-[#18181B]/80 backdrop-blur-md border border-[#27272A] rounded-lg p-2 shadow-lg">
        <div className="text-xs text-[#A1A1AA] px-2 py-1 flex items-center">
          Add Object:
        </div>
        {primitives.map((type) => {
          const Icon = primitiveIcons[type];
          return (
            <button
              key={type}
              onClick={() => handleCreateObject(type)}
              className="p-2 rounded hover:bg-[#27272A] transition-colors group relative"
              title={`Create ${primitiveLabels[type]}`}
            >
              <Icon className="w-5 h-5 text-[#FAFAFA]" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#18181B] border border-[#27272A] rounded text-xs text-[#FAFAFA] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {primitiveLabels[type]}
              </span>
            </button>
          );
        })}

        <div className="w-px h-6 bg-[#27272A]" />

        <div className="text-xs text-[#A1A1AA] px-2 py-1 flex items-center">
          Lights:
        </div>
        {lights.map((type) => {
          const Icon = primitiveIcons[type];
          return (
            <button
              key={type}
              onClick={() => handleCreateObject(type)}
              className="p-2 rounded hover:bg-[#27272A] transition-colors group relative"
              title={`Create ${primitiveLabels[type]}`}
            >
              <Icon className="w-5 h-5 text-[#F59E0B]" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#18181B] border border-[#27272A] rounded text-xs text-[#FAFAFA] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {primitiveLabels[type]}
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
