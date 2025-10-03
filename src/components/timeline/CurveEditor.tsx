/**
 * Curve Editor Component
 *
 * Visual bezier curve editor for keyframe interpolation.
 * Sprint 6: Animation System & Timeline
 */

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface CurveEditorProps {
  easing: [number, number, number, number]; // [x1, y1, x2, y2]
  onChange: (easing: [number, number, number, number]) => void;
  onClose: () => void;
}

export function CurveEditor({ easing, onChange, onClose }: CurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingHandle, setDraggingHandle] = useState<1 | 2 | null>(null);
  const [localEasing, setLocalEasing] = useState<[number, number, number, number]>(easing);

  const canvasSize = 200;
  const padding = 20;
  const graphSize = canvasSize - padding * 2;

  // Draw the curve
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Background
    ctx.fillStyle = '#0A0A0B';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Grid
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = padding + (graphSize / 4) * i;
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(pos, padding);
      ctx.lineTo(pos, canvasSize - padding);
      ctx.stroke();
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(padding, pos);
      ctx.lineTo(canvasSize - padding, pos);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, graphSize, graphSize);

    // Bezier curve
    const [x1, y1, x2, y2] = localEasing;

    const p0 = { x: padding, y: canvasSize - padding }; // Start (0, 0)
    const p1 = { x: padding + x1 * graphSize, y: canvasSize - padding - y1 * graphSize }; // Control 1
    const p2 = { x: padding + x2 * graphSize, y: canvasSize - padding - y2 * graphSize }; // Control 2
    const p3 = { x: canvasSize - padding, y: padding }; // End (1, 1)

    // Draw curve
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.stroke();

    // Draw control lines
    ctx.strokeStyle = '#A1A1AA';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw control handles
    const drawHandle = (x: number, y: number, active: boolean) => {
      ctx.fillStyle = active ? '#A855F7' : '#7C3AED';
      ctx.strokeStyle = '#FAFAFA';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    drawHandle(p1.x, p1.y, draggingHandle === 1);
    drawHandle(p2.x, p2.y, draggingHandle === 2);

  }, [localEasing, draggingHandle]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const [x1, y1, x2, y2] = localEasing;
    const p1 = { x: padding + x1 * graphSize, y: canvasSize - padding - y1 * graphSize };
    const p2 = { x: padding + x2 * graphSize, y: canvasSize - padding - y2 * graphSize };

    // Check if clicking on handle 1
    const dist1 = Math.sqrt((x - p1.x) ** 2 + (y - p1.y) ** 2);
    if (dist1 < 10) {
      setDraggingHandle(1);
      return;
    }

    // Check if clicking on handle 2
    const dist2 = Math.sqrt((x - p2.x) ** 2 + (y - p2.y) ** 2);
    if (dist2 < 10) {
      setDraggingHandle(2);
      return;
    }
  };

  useEffect(() => {
    if (draggingHandle === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert to normalized coordinates (0-1)
      const normX = Math.max(0, Math.min(1, (x - padding) / graphSize));
      const normY = Math.max(0, Math.min(1, (canvasSize - padding - y) / graphSize));

      if (draggingHandle === 1) {
        setLocalEasing([normX, normY, localEasing[2], localEasing[3]]);
      } else if (draggingHandle === 2) {
        setLocalEasing([localEasing[0], localEasing[1], normX, normY]);
      }
    };

    const handleMouseUp = () => {
      setDraggingHandle(null);
      onChange(localEasing);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, localEasing, onChange]);

  // Easing presets
  const presets: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
    easeInQuad: [0.55, 0.085, 0.68, 0.53],
    easeOutQuad: [0.25, 0.46, 0.45, 0.94],
    easeInCubic: [0.55, 0.055, 0.675, 0.19],
    easeOutCubic: [0.215, 0.61, 0.355, 1],
  };

  const handlePresetClick = (preset: [number, number, number, number]) => {
    setLocalEasing(preset);
    onChange(preset);
  };

  return createPortal(
    <div className="fixed inset-0 bg-[#0A0A0B]/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl p-4 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#FAFAFA]">Animation Curve Editor</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#27272A] transition-colors"
          >
            <X className="w-4 h-4 text-[#A1A1AA]" />
          </button>
        </div>

        {/* Canvas */}
        <div className="mb-4">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              onMouseDown={handleMouseDown}
              className="border border-[#27272A] rounded cursor-crosshair"
            />
          </div>
          <p className="text-xs text-[#71717A] mt-2 text-center">
            Drag the purple handles to adjust the curve
          </p>
        </div>

        {/* Presets */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-[#FAFAFA] mb-2">Presets</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(presets).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => handlePresetClick(preset)}
                className="px-3 py-1.5 bg-[#0A0A0B] border border-[#27272A] rounded text-xs text-[#FAFAFA] hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Values Display */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[#A1A1AA]">Control 1:</span>{' '}
            <span className="text-[#FAFAFA] font-mono">
              ({localEasing[0].toFixed(2)}, {localEasing[1].toFixed(2)})
            </span>
          </div>
          <div>
            <span className="text-[#A1A1AA]">Control 2:</span>{' '}
            <span className="text-[#FAFAFA] font-mono">
              ({localEasing[2].toFixed(2)}, {localEasing[3].toFixed(2)})
            </span>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#7C3AED] text-white text-sm rounded hover:bg-[#6D28D9] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
