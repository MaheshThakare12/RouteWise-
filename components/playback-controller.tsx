'use client'

import React, { useEffect, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlaybackControllerProps {
  currentStep: number
  totalSteps: number
  isPlaying: boolean
  onStepChange: (step: number) => void
  onPlayingChange: (playing: boolean) => void
  onReset: () => void
}

export function PlaybackController({
  currentStep,
  totalSteps,
  isPlaying,
  onStepChange,
  onPlayingChange,
  onReset
}: PlaybackControllerProps) {
  const [speed, setSpeed] = useState<number>(1) // 0.5x, 1x, 2x, 5x

  const speedDelays: Record<number, number> = {
    0.5: 800,
    1: 400,
    2: 180,
    5: 60
  }

  // Automatic playback timer
  useEffect(() => {
    if (!isPlaying) return

    if (currentStep >= totalSteps - 1) {
      onPlayingChange(false)
      return
    }

    const interval = setInterval(() => {
      onStepChange(currentStep + 1)
      if (currentStep + 1 >= totalSteps - 1) {
        onPlayingChange(false)
      }
    }, speedDelays[speed] || 400)

    return () => clearInterval(interval)
  }, [isPlaying, currentStep, totalSteps, speed, onStepChange, onPlayingChange])

  const progress = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0

  return (
    <div className="playback-engine-wrap">
      <div className="playback">
        <Button
          size="icon"
          variant="outline"
          aria-label="Step backward"
          disabled={currentStep <= 0}
          onClick={() => {
            onPlayingChange(false)
            onStepChange(Math.max(0, currentStep - 1))
          }}
        >
          <SkipBack size={14} />
        </Button>

        <Button
          size="icon"
          className="play"
          aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
          onClick={() => {
            if (currentStep >= totalSteps - 1) {
              onStepChange(0)
            }
            onPlayingChange(!isPlaying)
          }}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </Button>

        <Button
          size="icon"
          variant="outline"
          aria-label="Step forward"
          disabled={currentStep >= totalSteps - 1}
          onClick={() => {
            onPlayingChange(false)
            onStepChange(Math.min(totalSteps - 1, currentStep + 1))
          }}
        >
          <SkipForward size={14} />
        </Button>

        <div className="timeline">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentStep}
            onChange={e => {
              onPlayingChange(false)
              onStepChange(Number(e.target.value))
            }}
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            aria-label="Playback timeline scrubber"
          />
          <div className="timeline-labels">
            <span>START</span>
            <span>
              STEP {currentStep + 1} / {totalSteps} ({progress.toFixed(0)}%)
            </span>
            <span>FINISH</span>
          </div>
        </div>

        <Button
          size="icon"
          variant="outline"
          aria-label="Reset playback"
          onClick={() => {
            onPlayingChange(false)
            onReset()
          }}
        >
          <RotateCcw size={14} />
        </Button>

        {/* Speed toggle selector */}
        <div className="speed-pills flex items-center gap-1 ml-2">
          {[0.5, 1, 2, 5].map(s => (
            <button
              key={s}
              type="button"
              className={`text-xs px-1.5 py-0.5 rounded border ${
                speed === s
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
