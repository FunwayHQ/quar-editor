/**
 * Texture Upload Component
 *
 * Handles texture file uploads and storage in IndexedDB.
 */

import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { useMaterialsStore, generateTextureId } from '../../stores/materialsStore';
import { db } from '../../lib/storage/db';
import { useParams } from 'react-router-dom';

interface TextureUploadProps {
  label: string;
  textureId: string | null;
  onTextureChange: (textureId: string | null) => void;
  textureType: 'albedo' | 'normal' | 'roughness' | 'metallic' | 'emission' | 'ao' | 'displacement';
}

export function TextureUpload({ label, textureId, onTextureChange, textureType }: TextureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { projectId } = useParams();

  const addTexture = useMaterialsStore((state) => state.addTexture);
  const textures = useMaterialsStore((state) => state.textures);
  const removeTexture = useMaterialsStore((state) => state.removeTexture);

  const currentTexture = textureId ? textures.get(textureId) : null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image is too large. Maximum size is 10MB.');
      return;
    }

    try {
      // Create texture ID
      const texId = generateTextureId();

      // Store in IndexedDB
      await db.assets.add({
        id: texId,
        projectId: projectId,
        type: 'texture',
        name: file.name,
        blob: file,
        created: new Date(),
      });

      // Create data URL for Three.js
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;

        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          // Add to materials store
          addTexture({
            id: texId,
            name: file.name,
            type: textureType,
            url: dataUrl,
            width: img.width,
            height: img.height,
            size: file.size,
            format: file.type.replace('image/', ''),
            createdAt: Date.now(),
          });

          // Update material
          onTextureChange(texId);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload texture:', error);
      alert('Failed to upload texture');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!textureId) return;

    try {
      // Remove from IndexedDB
      await db.assets.delete(textureId);

      // Remove from store
      removeTexture(textureId);

      // Update material
      onTextureChange(null);
    } catch (error) {
      console.error('Failed to remove texture:', error);
    }
  };

  return (
    <div className="mb-3">
      <label className="block text-xs text-[#A1A1AA] mb-1">{label}</label>

      {currentTexture ? (
        <div className="relative group">
          <img
            src={currentTexture.url}
            alt={currentTexture.name}
            className="w-full h-20 object-cover rounded border border-[#27272A]"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
            <button
              onClick={handleRemove}
              className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              title="Remove texture"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="text-xs text-[#A1A1AA] mt-1 truncate">{currentTexture.name}</div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-20 bg-[#27272A] hover:bg-[#3F3F46] border border-dashed border-[#7C3AED] rounded flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <Upload className="w-5 h-5 text-[#7C3AED]" />
          <span className="text-xs text-[#A1A1AA]">Upload Image</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
