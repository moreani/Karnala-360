'use client'

import { useEffect, useState, useRef } from 'react'
import type { Hotspot } from '../../types'
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, ExternalLink } from 'lucide-react'

interface InfoPanelProps {
  hotspot: Hotspot
  onClose: () => void
  onNavigate: (hotspot: Hotspot) => void
}

export function InfoPanel({ hotspot, onClose, onNavigate }: InfoPanelProps) {
  const [imageIndex, setImageIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentImage = Array.isArray(hotspot.image) ? hotspot.image[imageIndex] : hotspot.image

  const handlePrevImage = () => {
    if (Array.isArray(hotspot.image)) {
      setImageIndex((prev) => (prev - 1 + hotspot.image!.length) % hotspot.image!.length)
    }
  }

  const handleNextImage = () => {
    if (Array.isArray(hotspot.image)) {
      setImageIndex((prev) => (prev + 1) % hotspot.image!.length)
    }
  }

  const handleAudioToggle = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(console.error)
    }
    setIsPlaying(!isPlaying)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) audioRef.current.volume = newVolume
  }

  useEffect(() => {
    return () => {
      videoRef.current?.pause()
      audioRef.current?.pause()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-panel-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] glass-strong rounded-2xl overflow-hidden shadow-xl border border-glass-border animate-scale-in">
        <div className="flex items-start justify-between p-4 border-b border-glass-border">
          <div className="flex-1 pr-4 min-w-0">
            <h3 id="info-panel-title" className="text-lg font-semibold text-text truncate">
              {hotspot.title}
            </h3>
            {hotspot.description && (
              <p className="text-text-muted text-sm mt-1 truncate">{hotspot.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn-icon p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {hotspot.type === 'info' && hotspot.content && (
            <div className="prose prose-invert max-w-none text-text-muted">
              <div dangerouslySetInnerHTML={{ __html: hotspot.content }} />
            </div>
          )}

          {hotspot.type === 'image' && currentImage && (
            <div className="relative">
              <div className="aspect-video rounded-xl overflow-hidden bg-surface">
                <img
                  src={currentImage}
                  alt={`${hotspot.title} ${Array.isArray(hotspot.image) ? `${imageIndex + 1} of ${hotspot.image.length}` : ''}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {Array.isArray(hotspot.image) && hotspot.image.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 btn-icon p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/70 font-mono">
                    {imageIndex + 1} / {hotspot.image.length}
                  </div>
                </>
              )}
            </div>
          )}

          {hotspot.type === 'video' && hotspot.video && (
            <div className="relative">
              <video
                ref={videoRef}
                src={hotspot.video}
                controls
                className="w-full rounded-xl bg-surface"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          )}

          {hotspot.type === 'audio' && hotspot.audio && (
            <div className="flex items-center gap-4 p-4 bg-surface/50 rounded-xl">
              <button
                onClick={handleAudioToggle}
                className="btn-icon p-3 rounded-full bg-primary text-white"
                aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-text">{hotspot.title}</span>
                  <span className="text-xs text-text-muted">Audio</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-surface rounded-lg appearance-none accent-primary"
                />
              </div>
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.volume = volume === 0 ? 1 : 0
                  setVolume(volume === 0 ? 1 : 0)
                }}
                className="btn-icon p-2 rounded-lg text-text-muted hover:text-text"
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              >
                {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <audio
                ref={audioRef}
                src={hotspot.audio}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}

          {hotspot.type === 'link' && hotspot.target && (
            <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="flex-1">
                <p className="text-sm text-primary font-medium">Navigate to scene</p>
                <p className="text-xs text-text-muted mt-1">
                  Click to navigate to <span className="font-medium">{hotspot.target}</span>
                </p>
              </div>
              <button
                onClick={() => onNavigate(hotspot)}
                className="btn-primary px-4 py-2"
              >
                Go to Scene
                <ExternalLink className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}

          {hotspot.type === 'link' && hotspot.url && (
            <a
              href={hotspot.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Open Link
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-glass-border">
          {hotspot.type === 'navigation' && hotspot.target && (
            <button
              onClick={() => onNavigate(hotspot)}
              className="btn-primary"
            >
              Navigate
              <ExternalLink className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}