/**
 * PreviewMeshRenderer Component
 *
 * Renders preview meshes from curve operations.
 */

import React from 'react';
import { usePreviewStore } from '../../stores/previewStore';

export function PreviewMeshRenderer() {
  const previewMesh = usePreviewStore((state) => state.previewMesh);

  if (!previewMesh) return null;

  return <primitive object={previewMesh} />;
}
