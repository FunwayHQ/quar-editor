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
import { UpdateKeyframeCommand, RemoveTrackCommand, RemoveKeyframeCommand } from '../../lib/commands/AnimationCommands';
import { getAnimationEngine } from '../../lib/animation/AnimationEngine';
import { ConfirmDialog, useConfirmDialog } from '../ConfirmDialog';

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
  const { dialogProps, showConfirm } = useConfirmDialog();

  const activeAnimation = activeAnimationId ? animations.get(activeAnimationId) : null;
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [selectedKeyframes, setSelectedKeyframes] = useState<Array<{ trackId: string; keyframeId: string; }>>([]);
  const [showCurveEditor, setShowCurveEditor] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Rectangle selection state
  const [isRectSelecting, setIsRectSelecting] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
  const [rectEnd, setRectEnd] = useState<{ x: number; y: number } | null>(null);

  // For backwards compatibility with single selection
  const selectedKeyframe = selectedKeyframes.length === 1 ? selectedKeyframes[0] : null;

  // Apply animation state when animation changes or time changes
  useEffect(() => {
    if (activeAnimation && !isDraggingScrubber) {
      const engine = getAnimationEngine();
      engine.seekTo(activeAnimation, currentTime);
    }
  }, [activeAnimationId, currentTime, activeAnimation, isDraggingScrubber]);

  // Handle rectangle selection drag and release
  useEffect(() => {
    if (!isRectSelecting || !rectStart || !timelineRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setRectEnd({ x, y });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!rectStart || !rectEnd || !activeAnimation || !timelineRef.current) {
        setIsRectSelecting(false);
        setRectStart(null);
        setRectEnd(null);
        return;
      }

      // Calculate selection bounds
      const minX = Math.min(rectStart.x, rectEnd.x) + timelineScroll;
      const maxX = Math.max(rectStart.x, rectEnd.x) + timelineScroll;
      const minY = Math.min(rectStart.y, rectEnd.y);
      const maxY = Math.max(rectStart.y, rectEnd.y);

      // Find keyframes within the rectangle
      const newSelections: Array<{ trackId: string; keyframeId: string }> = [];
      const trackHeight = 48; // Height of each track row

      activeAnimation.tracks.forEach((track, trackIndex) => {
        const trackY = trackIndex * trackHeight;
        const trackCenterY = trackY + trackHeight / 2;

        // Check if track is within Y bounds
        if (trackCenterY >= minY && trackCenterY <= maxY) {
          track.keyframes.forEach(keyframe => {
            const keyframeX = keyframe.time * timelineZoom;

            // Check if keyframe is within X bounds
            if (keyframeX >= minX && keyframeX <= maxX) {
              newSelections.push({ trackId: track.id, keyframeId: keyframe.id });
            }
          });
        }
      });

      // Add to existing selection if holding shift/ctrl
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        const existingKeys = selectedKeyframes.map(k => `${k.trackId}-${k.keyframeId}`);
        const newKeys = newSelections.filter(k =>
          !existingKeys.includes(`${k.trackId}-${k.keyframeId}`)
        );
        setSelectedKeyframes([...selectedKeyframes, ...newKeys]);
      } else {
        setSelectedKeyframes(newSelections);
      }

      setIsRectSelecting(false);
      setRectStart(null);
      setRectEnd(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isRectSelecting, rectStart, rectEnd, activeAnimation, selectedKeyframes, timelineScroll, timelineZoom]);

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
    e.stopPropagation();
    console.log('[Timeline] Scrubber mousedown - starting drag');
    setIsDraggingScrubber(true);
  };

  useEffect(() => {
    if (!isDraggingScrubber) return;
    console.log('[Timeline] Drag started, setting up handlers');

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !activeAnimation) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineScroll;
      const time = Math.max(0, Math.min(x / timelineZoom, activeAnimation.duration));

      console.log('[Timeline] Dragging to time:', time);
      setCurrentTime(time);

      // Update object states when scrubbing
      const engine = getAnimationEngine();
      engine.seekTo(activeAnimation, time);
    };

    const handleMouseUp = () => {
      console.log('[Timeline] Drag ended');
      setIsDraggingScrubber(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingScrubber, activeAnimation, timelineZoom, timelineScroll]);

  // Handle timeline click to move scrubber or start rectangle selection
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current || !activeAnimation) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if we clicked on empty space (not on a keyframe)
    const target = e.target as HTMLElement;
    if (!target.closest('[data-keyframe]')) {
      // Check if shift is held for rectangle selection
      if (e.shiftKey) {
        // Start rectangle selection
        setIsRectSelecting(true);
        setRectStart({ x, y });
        setRectEnd({ x, y });

        // Clear selection if not holding ctrl/cmd as well
        if (!e.ctrlKey && !e.metaKey) {
          setSelectedKeyframes([]);
        }
      } else {
        // Regular click - move scrubber to clicked position
        const scrolledX = x + timelineScroll;
        const time = Math.max(0, Math.min(scrolledX / timelineZoom, activeAnimation.duration));

        setCurrentTime(time);

        // Update object states when clicking timeline
        const engine = getAnimationEngine();
        engine.seekTo(activeAnimation, time);

        // Clear selection if not holding ctrl/cmd
        if (!e.ctrlKey && !e.metaKey) {
          setSelectedKeyframes([]);
        }
      }

      e.preventDefault();
    }
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

  // Handle keyframe click with multi-selection
  const handleKeyframeClick = (trackId: string, keyframeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const keyframe = { trackId, keyframeId };
    const isSelected = selectedKeyframes.some(k => k.trackId === trackId && k.keyframeId === keyframeId);

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Multi-selection with Shift/Ctrl/Cmd
      if (isSelected) {
        // Remove from selection
        setSelectedKeyframes(selectedKeyframes.filter(k => !(k.trackId === trackId && k.keyframeId === keyframeId)));
      } else {
        // Add to selection
        setSelectedKeyframes([...selectedKeyframes, keyframe]);
      }
    } else {
      // Single selection (replace)
      setSelectedKeyframes([keyframe]);
    }
  };

  // Handle track deletion
  const handleDeleteTrack = (trackId: string, trackProperty: string, objectName?: string) => {
    if (!activeAnimationId || !activeAnimation) return;

    // Find the track object
    const track = activeAnimation.tracks.find(t => t.id === trackId);
    if (!track) return;

    const trackDescription = objectName
      ? `"${objectName}" ${trackProperty} track`
      : `${trackProperty} track`;

    showConfirm({
      title: 'Delete Track',
      message: `Are you sure you want to delete the ${trackDescription}? All keyframes in this track will be lost.`,
      variant: 'danger',
      icon: Trash2,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        const command = new RemoveTrackCommand(activeAnimationId, track);
        executeCommand(command);

        // Clear selection if deleted track contains selected keyframes
        setSelectedKeyframes(selectedKeyframes.filter(k => k.trackId !== trackId));
      },
    });
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

  // Handle keyboard shortcuts for keyframe deletion - must be after selectedKeyframeData is defined
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKeyframes.length > 0 && activeAnimation) {
        e.preventDefault();

        // Delete all selected keyframes
        selectedKeyframes.forEach(selected => {
          const track = activeAnimation.tracks.find(t => t.id === selected.trackId);
          if (!track) return;

          const keyframe = track.keyframes.find(k => k.id === selected.keyframeId);
          if (!keyframe) return;

          const command = new RemoveKeyframeCommand(
            activeAnimation.id,
            selected.trackId,
            keyframe
          );
          executeCommand(command);
        });

        // Clear selection after deletion
        setSelectedKeyframes([]);
      }

      // Select all keyframes (Ctrl/Cmd + A)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a' && activeAnimation) {
        e.preventDefault();

        // Collect all keyframes from all tracks
        const allKeyframes: Array<{ trackId: string; keyframeId: string }> = [];
        activeAnimation.tracks.forEach(track => {
          track.keyframes.forEach(keyframe => {
            allKeyframes.push({ trackId: track.id, keyframeId: keyframe.id });
          });
        });

        setSelectedKeyframes(allKeyframes);
      }

      // Deselect all (Escape)
      else if (e.key === 'Escape' && selectedKeyframes.length > 0) {
        e.preventDefault();
        setSelectedKeyframes([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedKeyframes, activeAnimation, executeCommand]);

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
                        onClick={() => handleDeleteTrack(track.id, track.property, obj?.name)}
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
            className="h-8 border-b border-[#27272A] relative bg-[#0A0A0B] overflow-x-auto overflow-y-hidden cursor-pointer"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => {
              if (!activeAnimation || !rulerRef.current) return;

              const rect = rulerRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left + rulerRef.current.scrollLeft;
              const time = Math.max(0, Math.min(x / timelineZoom, activeAnimation.duration));

              setCurrentTime(time);

              // Update object states when clicking ruler
              const engine = getAnimationEngine();
              engine.seekTo(activeAnimation, time);
            }}
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
            onMouseDown={handleTimelineMouseDown}
          >
            {activeAnimation && activeAnimation.tracks?.map((track, trackIndex) => (
              <div
                key={track.id}
                className="h-12 border-b border-[#27272A]/50 relative"
              >
                {/* Keyframe Markers */}
                {track.keyframes?.map((keyframe) => {
                  const isSelected = selectedKeyframes.some(k => k.trackId === track.id && k.keyframeId === keyframe.id);
                  return (
                    <div
                      key={keyframe.id}
                      data-keyframe="true"
                      onClick={(e) => handleKeyframeClick(track.id, keyframe.id, e)}
                      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm border-2 cursor-pointer hover:scale-125 transition-transform ${
                        isSelected ? 'bg-[#A855F7] border-[#A855F7] scale-125 shadow-lg shadow-[#A855F7]/50' : 'bg-[#7C3AED] border-white'
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

            {/* Rectangle Selection Overlay */}
            {isRectSelecting && rectStart && rectEnd && (
              <div
                className="absolute border border-[#7C3AED] bg-[#7C3AED]/20 pointer-events-none z-20"
                style={{
                  left: `${Math.min(rectStart.x, rectEnd.x)}px`,
                  top: `${Math.min(rectStart.y, rectEnd.y)}px`,
                  width: `${Math.abs(rectEnd.x - rectStart.x)}px`,
                  height: `${Math.abs(rectEnd.y - rectStart.y)}px`,
                }}
              />
            )}
          </div>

          {/* Scrubber/Playhead */}
          {activeAnimation && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#EF4444] pointer-events-none z-10"
              style={{ left: `${scrubberPosition}px` }}
            >
              {/* Playhead Handle - Made bigger and more visible */}
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#EF4444] pointer-events-auto cursor-ew-resize hover:scale-110 transition-transform"
                style={{
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                }}
                onMouseDown={handleScrubberMouseDown}
                title="Drag to scrub timeline"
              />
              {/* Vertical line indicator */}
              <div className="absolute top-5 bottom-0 w-0.5 bg-[#EF4444] left-1/2 -translate-x-1/2" />
            </div>
          )}
        </div>
      </div>}

      {/* Keyframe Inspector */}
      {!isCollapsed && selectedKeyframes.length > 0 && (
        <div className="absolute bottom-0 right-0 m-4 bg-[#18181B] border border-[#27272A] rounded-lg p-3 shadow-xl z-20 w-64">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-[#FAFAFA]">
              {selectedKeyframes.length === 1 ? 'Keyframe' : `${selectedKeyframes.length} Keyframes Selected`}
            </h4>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (activeAnimation && selectedKeyframes.length > 0) {
                    // Delete all selected keyframes
                    selectedKeyframes.forEach(selected => {
                      const track = activeAnimation.tracks.find(t => t.id === selected.trackId);
                      if (!track) return;

                      const keyframe = track.keyframes.find(k => k.id === selected.keyframeId);
                      if (!keyframe) return;

                      const command = new RemoveKeyframeCommand(
                        activeAnimation.id,
                        selected.trackId,
                        keyframe
                      );
                      executeCommand(command);
                    });
                    setSelectedKeyframes([]);
                  }
                }}
                className="p-1 rounded hover:bg-[#EF4444]/20 transition-colors"
                title="Delete Selected Keyframes (Del)"
              >
                <Trash2 className="w-3 h-3 text-[#EF4444]" />
              </button>
              <button
                onClick={() => setSelectedKeyframes([])}
                className="p-1 rounded hover:bg-[#27272A] transition-colors"
                title="Close"
              >
                <X className="w-3 h-3 text-[#A1A1AA]" />
              </button>
            </div>
          </div>

          {selectedKeyframes.length === 1 && selectedKeyframeData ? (
            // Single selection - show full controls
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
          ) : (
            // Multi-selection - show summary
            <div className="space-y-2 text-xs">
              <div className="text-[#A1A1AA]">
                <p>Hold Shift/Ctrl/Cmd to select more</p>
                <p>Press Delete to remove all</p>
                <p>Press Escape to deselect</p>
                <p>Press Ctrl/Cmd+A to select all</p>
              </div>
              <div className="pt-2 border-t border-[#27272A]">
                <button
                  onClick={() => {
                    if (activeAnimation) {
                      selectedKeyframes.forEach(selected => {
                        const track = activeAnimation.tracks.find(t => t.id === selected.trackId);
                        if (!track) return;

                        const keyframe = track.keyframes.find(k => k.id === selected.keyframeId);
                        if (!keyframe) return;

                        const command = new RemoveKeyframeCommand(
                          activeAnimation.id,
                          selected.trackId,
                          keyframe
                        );
                        executeCommand(command);
                      });
                      setSelectedKeyframes([]);
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#EF4444] text-white rounded hover:bg-[#DC2626] transition-colors"
                >
                  Delete All Selected
                </button>
              </div>
            </div>
          )}
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

      {/* Confirm Dialog */}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
