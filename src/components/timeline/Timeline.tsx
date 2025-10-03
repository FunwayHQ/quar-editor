/**
 * Timeline Component
 *
 * Main timeline UI with tracks, keyframes, and scrubber.
 * Sprint 6: Animation System & Timeline
 */

import React, { useRef, useState, useEffect } from 'react';
import { Play, Plus, ChevronDown, ChevronUp, ChevronRight, TrendingUp, Trash2, X } from 'lucide-react';
import { useAnimationStore } from '../../stores/animationStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { PlaybackControls } from './PlaybackControls';
import { AnimationPanel } from './AnimationPanel';
import { CurveEditor } from './CurveEditor';
import { UpdateKeyframeCommand, RemoveTrackCommand } from '../../lib/commands/AnimationCommands';

export function Timeline() {
  const {
    animations,
    activeAnimationId,
    currentTime,
    timelineZoom,
    timelineScroll,
    setCurrentTime,
    createAnimation,
    updateKeyframe,
  } = useAnimationStore();

  const { getAllObjects } = useObjectsStore();
  const { executeCommand } = useCommandStore();

  const activeAnimation = activeAnimationId ? animations.get(activeAnimationId) : null;
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [selectedKeyframe, setSelectedKeyframe] = useState<{ trackId: string; keyframeId: string; } | null>(null);
  const [showCurveEditor, setShowCurveEditor] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync ruler scroll with timeline scroll
  useEffect(() => {
    const timelineEl = timelineRef.current;
    const rulerEl = rulerRef.current;
    if (!timelineEl || !rulerEl) return;

    const handleScroll = () => {
      rulerEl.scrollLeft = timelineEl.scrollLeft;
    };

    timelineEl.addEventListener('scroll', handleScroll);
    return () => timelineEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle scrubber drag
  const handleScrubberMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingScrubber(true);
  };

  useEffect(() => {
    if (!isDraggingScrubber) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !activeAnimation) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineScroll;
      const time = Math.max(0, Math.min(x / timelineZoom, activeAnimation.duration));

      setCurrentTime(time);
    };

    const handleMouseUp = () => {
      setIsDraggingScrubber(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingScrubber, activeAnimation, timelineZoom, timelineScroll]);

  // Handle timeline click to move scrubber
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || !activeAnimation) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineScroll;
    const time = Math.max(0, Math.min(x / timelineZoom, activeAnimation.duration));

    setCurrentTime(time);
  };

  // Create default animation if none exists
  const handleCreateAnimation = () => {
    createAnimation('Animation');
  };

  // Get selected keyframe data for curve editor
  const getSelectedKeyframeData = () => {
    if (!selectedKeyframe || !activeAnimation) return null;

    const track = activeAnimation.tracks.find(t => t.id === selectedKeyframe.trackId);
    if (!track) return null;

    const keyframe = track.keyframes.find(k => k.id === selectedKeyframe.keyframeId);
    return keyframe;
  };

  const selectedKeyframeData = getSelectedKeyframeData();

  // Handle keyframe click
  const handleKeyframeClick = (trackId: string, keyframeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKeyframe({ trackId, keyframeId });
  };

  // Handle track deletion
  const handleDeleteTrack = (trackId: string) => {
    if (!activeAnimationId) return;

    const command = new RemoveTrackCommand(activeAnimationId, trackId);
    executeCommand(command);

    // Clear selection if deleted track was selected
    if (selectedKeyframe?.trackId === trackId) {
      setSelectedKeyframe(null);
    }
  };

  // Handle curve editor change
  const handleCurveChange = (easing: [number, number, number, number]) => {
    if (!selectedKeyframe || !activeAnimation) return;

    const track = activeAnimation.tracks.find(t => t.id === selectedKeyframe.trackId);
    if (!track) return;

    const keyframe = track.keyframes.find(k => k.id === selectedKeyframe.keyframeId);
    if (!keyframe) return;

    const command = new UpdateKeyframeCommand(
      activeAnimation.id,
      track.id,
      keyframe.id,
      { easing: keyframe.easing || [0.42, 0, 0.58, 1] }, // Default easing for undo
      { easing }
    );
    executeCommand(command);
  };

  // Handle interpolation mode change
  const handleInterpolationChange = (mode: 'linear' | 'bezier' | 'step') => {
    if (!selectedKeyframe || !activeAnimation) return;

    const track = activeAnimation.tracks.find(t => t.id === selectedKeyframe.trackId);
    if (!track) return;

    const keyframe = track.keyframes.find(k => k.id === selectedKeyframe.keyframeId);
    if (!keyframe) return;

    // When switching to bezier, initialize easing if it doesn't exist
    const updates: Partial<typeof keyframe> = { interpolation: mode };
    if (mode === 'bezier' && !keyframe.easing) {
      updates.easing = [0.42, 0, 0.58, 1]; // Default easeInOut
    }

    const command = new UpdateKeyframeCommand(
      activeAnimation.id,
      track.id,
      keyframe.id,
      { interpolation: keyframe.interpolation, easing: keyframe.easing },
      updates
    );
    executeCommand(command);

    // If switching to bezier, show curve editor
    if (mode === 'bezier') {
      setShowCurveEditor(true);
    }
  };

  const scrubberPosition = currentTime * timelineZoom - timelineScroll;

  return (
    <div className={`bg-[#18181B]/80 backdrop-blur-md border-t border-[#27272A] flex flex-col relative transition-all duration-300 ${isCollapsed ? 'h-auto' : 'h-80'}`}>
      {/* Playback Controls */}
      <div className="relative">
        <PlaybackControls />
        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-[#27272A] transition-colors"
          title={isCollapsed ? 'Expand Timeline' : 'Collapse Timeline'}
        >
          {isCollapsed ? (
            <ChevronUp className="w-4 h-4 text-[#A1A1AA]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
          )}
        </button>
      </div>

      {/* Timeline Content */}
      {!isCollapsed && <div className="flex-1 flex overflow-hidden">
        {/* Animation Panel (Far Left) */}
        <AnimationPanel />

        {/* Track List (Left Side) */}
        <div className="w-48 border-r border-[#27272A] flex flex-col">
          {/* Header */}
          <div className="p-2 border-b border-[#27272A]">
            <h3 className="text-xs font-medium text-[#FAFAFA]">Tracks</h3>
          </div>

          {/* Tracks */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {!activeAnimation ? (
              <div className="p-4 text-center">
                <p className="text-xs text-[#71717A]">No animation selected</p>
              </div>
            ) : activeAnimation.tracks.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-[#A1A1AA]">No tracks</p>
                <p className="text-xs text-[#71717A] mt-1">
                  Enable REC mode
                </p>
              </div>
            ) : (
              activeAnimation.tracks.map((track) => {
                const obj = getAllObjects().find(o => o.id === track.objectId);
                return (
                  <div
                    key={track.id}
                    className="p-2 border-b border-[#27272A]/50 hover:bg-[#27272A]/30 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: track.color || '#7C3AED' }}
                        />
                        <span className="text-[#FAFAFA] truncate">{obj?.name || 'Unknown'}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all"
                        title="Delete track"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                    <div className="text-xs text-[#71717A] ml-3">{track.property}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Timeline Canvas (Right Side) */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Time Ruler */}
          <div
            ref={rulerRef}
            className="h-8 border-b border-[#27272A] relative bg-[#0A0A0B] overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="relative h-full" style={{ width: `${(activeAnimation?.duration || 10) * timelineZoom}px` }}>
              {activeAnimation && (() => {
                const duration = activeAnimation.duration || 10;
                const safeLength = Math.min(Math.max(Math.ceil(duration) + 1, 1), 1000);
                return [...Array(safeLength)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex flex-col justify-between py-1"
                    style={{ left: `${i * timelineZoom}px` }}
                  >
                    <span className="text-xs text-[#A1A1AA] font-mono">{i}s</span>
                    <div className="w-px h-2 bg-[#27272A]" />
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Track Keyframes Area */}
          <div
            ref={timelineRef}
            className="flex-1 relative overflow-x-auto overflow-y-auto cursor-crosshair"
            onClick={handleTimelineClick}
          >
            {activeAnimation && activeAnimation.tracks?.map((track, trackIndex) => (
              <div
                key={track.id}
                className="h-12 border-b border-[#27272A]/50 relative"
              >
                {/* Keyframe Markers */}
                {track.keyframes?.map((keyframe) => {
                  const isSelected = selectedKeyframe?.trackId === track.id && selectedKeyframe?.keyframeId === keyframe.id;
                  return (
                    <div
                      key={keyframe.id}
                      onClick={(e) => handleKeyframeClick(track.id, keyframe.id, e)}
                      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm border-2 cursor-pointer hover:scale-125 transition-transform ${
                        isSelected ? 'bg-[#A855F7] border-[#A855F7] scale-125' : 'bg-[#7C3AED] border-white'
                      }`}
                      style={{
                        left: `${keyframe.time * timelineZoom - timelineScroll}px`,
                        clipPath: keyframe.interpolation === 'step' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : undefined,
                      }}
                      title={`${keyframe.time.toFixed(2)}s - ${keyframe.interpolation}`}
                    />
                  );
                })}
              </div>
            ))}

            {!activeAnimation && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-[#71717A]">Create an animation to begin</p>
              </div>
            )}
          </div>

          {/* Scrubber/Playhead */}
          {activeAnimation && (
            <div
              className="absolute top-8 bottom-0 w-0.5 bg-[#EF4444] pointer-events-none z-10"
              style={{ left: `${scrubberPosition}px` }}
            >
              {/* Playhead Handle */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#EF4444] pointer-events-auto cursor-ew-resize"
                style={{
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                }}
                onMouseDown={handleScrubberMouseDown}
              />
            </div>
          )}
        </div>
      </div>}

      {/* Keyframe Inspector (when keyframe selected) */}
      {!isCollapsed && selectedKeyframe && selectedKeyframeData && (
        <div className="absolute bottom-0 right-0 m-4 bg-[#18181B] border border-[#27272A] rounded-lg p-3 shadow-xl z-20 w-64">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-[#FAFAFA]">Keyframe</h4>
            <button
              onClick={() => setSelectedKeyframe(null)}
              className="p-1 rounded hover:bg-[#27272A] transition-colors"
            >
              <X className="w-3 h-3 text-[#A1A1AA]" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[#A1A1AA]">Time:</span>{' '}
              <span className="text-[#FAFAFA] font-mono">{selectedKeyframeData.time.toFixed(2)}s</span>
            </div>

            <div>
              <label className="block text-[#A1A1AA] mb-1">Interpolation</label>
              <select
                value={selectedKeyframeData.interpolation}
                onChange={(e) => handleInterpolationChange(e.target.value as any)}
                className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="linear">Linear</option>
                <option value="bezier">Bezier (Smooth)</option>
                <option value="step">Step (Instant)</option>
              </select>
            </div>

            {selectedKeyframeData.interpolation === 'bezier' && (
              <button
                onClick={() => setShowCurveEditor(true)}
                className="w-full px-3 py-2 bg-[#7C3AED] text-white rounded hover:bg-[#6D28D9] transition-colors flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Edit Curve
              </button>
            )}
          </div>
        </div>
      )}

      {/* Curve Editor Modal */}
      {showCurveEditor && selectedKeyframeData?.interpolation === 'bezier' && (
        <CurveEditor
          easing={selectedKeyframeData.easing || [0.42, 0, 0.58, 1]}
          onChange={handleCurveChange}
          onClose={() => setShowCurveEditor(false)}
        />
      )}
    </div>
  );
}
