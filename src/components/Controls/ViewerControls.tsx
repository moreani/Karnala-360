'use client'

import { cn } from '../../utils/cn'
import { Minus, Plus, RotateCcw, Maximize2, Minimize2, Target, HelpCircle } from 'lucide-react'

interface ViewerControlsProps {
  yaw: number
  pitch: number
  fov: number
  isAutoRotating: boolean
  onAutoRotateToggle: () => void
  isFullscreen: boolean
  onFullscreenToggle: () => void
  onResetView: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

export function ViewerControls({
  yaw,
  pitch,
  fov,
  isAutoRotating,
  onAutoRotateToggle,
  isFullscreen,
  onFullscreenToggle,
  onResetView,
  onZoomIn,
  onZoomOut,
}: ViewerControlsProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 glass rounded-xl p-2 shadow-xl border border-glass-border">
        <button
          onClick={onZoomIn}
          className="btn-icon p-2 rounded-lg transition-colors"
          aria-label="Zoom in"
        >
          <Plus className="w-5 h-5" />
        </button>

        <div className="w-32 h-1.5 bg-surface rounded-full relative mx-1">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-200"
            style={{
              left: '0%',
              width: `${((fov - 30) / 70) * 100}%`,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border border-primary/30"
            style={{
              left: `${((fov - 30) / 70) * 100}%`,
              marginLeft: '-6px',
            }}
          />
        </div>

        <button
          onClick={onZoomOut}
          className="btn-icon p-2 rounded-lg transition-colors"
          aria-label="Zoom out"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 glass rounded-xl p-2 shadow-xl border border-glass-border">
        <button
          onClick={onResetView}
          className="btn-icon p-2 rounded-lg transition-colors"
          aria-label="Reset view"
        >
          <Target className="w-5 h-5" />
        </button>

        <button
          onClick={onAutoRotateToggle}
          className={cn(
            'btn-icon p-2 rounded-lg transition-colors',
            isAutoRotating && 'bg-primary/20 text-primary'
          )}
          aria-label={isAutoRotating ? 'Stop auto rotate' : 'Start auto rotate'}
        >
          {isAutoRotating ? (
            <RotateCcw className="w-5 h-5 animate-spin-slow" />
          ) : (
            <RotateCcw className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={onFullscreenToggle}
          className="btn-icon p-2 rounded-lg transition-colors"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        <button
          className="btn-icon p-2 rounded-lg transition-colors"
          aria-label="Keyboard shortcuts"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="glass rounded-xl px-3 py-1.5 shadow-xl border border-glass-border text-xs font-mono text-text-muted">
        <div className="flex gap-4">
          <span>Yaw: <span className="text-text font-mono">{((yaw * 180) / Math.PI).toFixed(1)}°</span></span>
          <span>Pitch: <span className="text-text font-mono">{((pitch * 180) / Math.PI).toFixed(1)}°</span></span>
          <span>FOV: <span className="text-text font-mono">{Math.round(fov)}°</span></span>
        </div>
      </div>
    </div>
  )
}