/**
 * Playback Controls Component
 *
 * Controls for playing, pausing, stopping, and configuring animation playback.
 * Sprint 6: Animation System & Timeline
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Square, RotateCw, Settings, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAnimationStore } from '../../stores/animationStore';
import { getAnimationEngine } from '../../lib/animation/AnimationEngine';

export function PlaybackControls() {
  const {
    animations,
    activeAnimationId,
    isPlaying,
    isPaused,
    currentTime,
    playbackSpeed,
    frameRate,
    autoKeyframe,
    play,
    pause,
    stop,
    setCurrentTime,
    setPlaybackSpeed,
    setFrameRate,
    setAutoKeyframe,
    toggleLoop,
  } = useAnimationStore();

  const activeAnimation = activeAnimationId ? animations.get(activeAnimationId) : null;
  const engine = getAnimationEngine();
  const [showRecordingWarning, setShowRecordingWarning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Handle play button
  const handlePlay = () => {
    if (!activeAnimation) return;

    // Show warning if recording mode is on (only when starting fresh, not resuming)
    if (autoKeyframe && !isPaused) {
      setShowRecordingWarning(true);
      return;
    }

    startPlayback();
  };

  const startPlayback = () => {
    if (!activeAnimation) return;

    play();

    // Start from current time (useful for resuming from pause)
    engine.start(
      activeAnimation,
      currentTime,
      (time) => setCurrentTime(time),
      () => stop(),
      playbackSpeed
    );
  };

  // Handle pause button
  const handlePause = () => {
    pause();
    engine.stop();
  };

  // Handle resume button
  const handleResume = () => {
    if (!activeAnimation) return;
    startPlayback();
  };

  // Handle stop button
  const handleStop = () => {
    stop();
    engine.stop();
    setCurrentTime(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engine.stop();
    };
  }, []);

  // Stop engine if playing but activeAnimation is null
  useEffect(() => {
    if (isPlaying && !activeAnimation) {
      handleStop();
    }
  }, [activeAnimation, isPlaying]);

  // Restart playback when playback speed changes (while playing)
  useEffect(() => {
    if (isPlaying && activeAnimation) {
      engine.stop();
      engine.start(
        activeAnimation,
        currentTime,
        (time) => setCurrentTime(time),
        () => stop(),
        playbackSpeed
      );
    }
  }, [playbackSpeed]);

  return (
    <div className="flex items-center gap-4 p-3 pr-12 bg-[#18181B]/80 backdrop-blur-md border-b border-[#27272A]">
      {/* Play/Pause/Stop */}
      <div className="flex items-center gap-1">
        {isPlaying ? (
          <button
            onClick={handlePause}
            className="p-2 rounded hover:bg-[#27272A] transition-colors"
            title="Pause (Space)"
          >
            <Pause className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
          </button>
        ) : isPaused ? (
          <button
            onClick={handleResume}
            disabled={!activeAnimation}
            className="p-2 rounded hover:bg-[#27272A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Resume (Space)"
          >
            <Play className="w-5 h-5 text-[#10B981] fill-[#10B981]" />
          </button>
        ) : (
          <button
            onClick={handlePlay}
            disabled={!activeAnimation}
            className="p-2 rounded hover:bg-[#27272A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Play (Space)"
          >
            <Play className="w-5 h-5 text-[#10B981] fill-[#10B981]" />
          </button>
        )}

        <button
          onClick={handleStop}
          disabled={!activeAnimation}
          className="p-2 rounded hover:bg-[#27272A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Stop"
        >
          <Square className="w-5 h-5 text-[#EF4444] fill-[#EF4444]" />
        </button>
      </div>

      <div className="w-px h-6 bg-[#27272A]" />

      {/* Current Time Display */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#A1A1AA]">Time:</span>
        <span className="text-sm text-[#FAFAFA] font-mono min-w-[80px]">
          {currentTime.toFixed(2)}s / {activeAnimation?.duration.toFixed(2) || '0.00'}s
        </span>
      </div>

      <div className="w-px h-6 bg-[#27272A]" />

      {/* Loop Toggle */}
      <button
        onClick={toggleLoop}
        disabled={!activeAnimation}
        className={`p-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
          activeAnimation?.loop ? 'bg-[#7C3AED] text-white' : 'hover:bg-[#27272A] text-[#A1A1AA]'
        }`}
        title="Toggle Loop"
      >
        <RotateCw className="w-5 h-5" />
      </button>

      {/* Auto-Keyframe Toggle */}
      <button
        onClick={() => setAutoKeyframe(!autoKeyframe)}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
          autoKeyframe
            ? 'bg-[#EF4444] text-white'
            : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
        }`}
        title="Auto-Keyframe Mode"
      >
        {autoKeyframe ? '● REC' : '○ REC'}
      </button>

      <div className="flex-1" />

      {/* Frame Rate Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#A1A1AA]">FPS:</span>
        <select
          value={frameRate}
          onChange={(e) => setFrameRate(parseInt(e.target.value) as 24 | 30 | 60)}
          className="bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA] outline-none focus:border-[#7C3AED]"
        >
          <option value={24}>24</option>
          <option value={30}>30</option>
          <option value={60}>60</option>
        </select>
      </div>

      {/* Playback Speed */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#A1A1AA]">Speed:</span>
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          className="bg-[#0A0A0B] border border-[#27272A] rounded px-2 py-1 text-sm text-[#FAFAFA] outline-none focus:border-[#7C3AED]"
        >
          <option value={0.25}>0.25x</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>

      {/* Settings */}
      <button
        onClick={() => setShowSettings(true)}
        className="p-2 rounded hover:bg-[#27272A] transition-colors text-[#A1A1AA]"
        title="Animation Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Recording Warning Dialog */}
      {showRecordingWarning && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0B]/90 backdrop-blur-md flex items-center justify-center z-[9999]">
          <div className="bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl p-6 max-w-md">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-[#F59E0B]/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#FAFAFA] mb-2">Recording Mode is On</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Playing the animation while recording mode is active may create multiple keyframes as the playback updates object properties.
                </p>
                <p className="text-sm text-[#A1A1AA] leading-relaxed mt-2">
                  Do you want to turn off recording and play the animation?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowRecordingWarning(false)}
                className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowRecordingWarning(false);
                  startPlayback();
                }}
                className="px-4 py-2 bg-[#27272A] text-[#FAFAFA] text-sm rounded hover:bg-[#3F3F46] transition-colors"
              >
                Play Anyway
              </button>
              <button
                onClick={() => {
                  setAutoKeyframe(false);
                  setShowRecordingWarning(false);
                  startPlayback();
                }}
                className="px-4 py-2 bg-[#7C3AED] text-white text-sm rounded hover:bg-[#6D28D9] transition-colors"
              >
                Turn Off Recording & Play
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Settings Dialog */}
      {showSettings && createPortal(
        <div className="fixed inset-0 bg-[#0A0A0B]/90 backdrop-blur-md flex items-center justify-center z-[9999]">
          <div className="bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-[#FAFAFA]">Animation Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded hover:bg-[#27272A] transition-colors"
              >
                <Settings className="w-5 h-5 text-[#A1A1AA]" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Frame Rate */}
              <div>
                <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                  Frame Rate
                </label>
                <div className="flex gap-2">
                  {[24, 30, 60].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setFrameRate(fps as 24 | 30 | 60)}
                      className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                        frameRate === fps
                          ? 'bg-[#7C3AED] text-white'
                          : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Speed */}
              <div>
                <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                  Playback Speed
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[0.25, 0.5, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-[#7C3AED] text-white'
                          : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Zoom */}
              <div>
                <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                  Timeline Zoom: {useAnimationStore.getState().timelineZoom}px/s
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={useAnimationStore.getState().timelineZoom}
                  onChange={(e) => useAnimationStore.getState().setTimelineZoom(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Auto-Keyframe */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-[#FAFAFA]">
                    Auto-Keyframe Mode
                  </label>
                  <p className="text-xs text-[#71717A] mt-1">
                    Automatically create keyframes when properties change
                  </p>
                </div>
                <button
                  onClick={() => setAutoKeyframe(!autoKeyframe)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoKeyframe ? 'bg-[#7C3AED]' : 'bg-[#27272A]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoKeyframe ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-[#7C3AED] text-white text-sm rounded hover:bg-[#6D28D9] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
