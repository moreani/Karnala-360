'use client'

import { useState, useEffect } from 'react'
import { useViewerStore } from '../../store/viewerStore'
import { cn } from '../../utils/cn'
import { X, SlidersHorizontal, RotateCcw, Volume2, Eye, Monitor, Save, Loader2 } from 'lucide-react'

interface SettingsPanelProps {
  onClose: () => void
  isAutoRotating: boolean
  onAutoRotateToggle: () => void
  isMuted: boolean
  onMuteToggle: () => void
  sensitivity: number
  onSensitivityChange: (value: number) => void
  invertY: boolean
  onInvertYToggle: () => void
}

export function SettingsPanel({
  onClose,
  isAutoRotating,
  onAutoRotateToggle,
  isMuted,
  onMuteToggle,
  sensitivity,
  onSensitivityChange,
  invertY,
  onInvertYToggle,
}: SettingsPanelProps) {
  const {
    quality,
    setQuality,
    isFullscreen,
    setFullscreen,
    fov,
    setFov,
    loadSettings,
  } = useViewerStore()

  const [activeTab, setActiveTab] = useState<'general' | 'controls' | 'display' | 'audio' | 'about'>('general')
  const [saved, setSaved] = useState(false)

  const tabs = [
    { id: 'general' as const, label: 'General', icon: SlidersHorizontal },
    { id: 'controls' as const, label: 'Controls', icon: RotateCcw },
    { id: 'display' as const, label: 'Display', icon: Monitor },
    { id: 'audio' as const, label: 'Audio', icon: Volume2 },
    { id: 'about' as const, label: 'About', icon: Eye },
  ]

  useEffect(() => {
    loadSettings()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [loadSettings])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleResetDefaults = () => {
    onSensitivityChange(1)
    onInvertYToggle()
    setQuality('high')
    onAutoRotateToggle()
    onMuteToggle()
    setFov(75)
    handleSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative w-full max-w-lg glass-strong rounded-2xl overflow-hidden shadow-2xl border border-glass-border animate-scale-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">Settings</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="btn-icon p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface"
              aria-label="Save settings"
              disabled={saved}
            >
              {saved ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <Save className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="btn-icon p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-32 border-r border-glass-border p-2 flex-shrink-0">
            <ul className="space-y-1" role="tablist">
              {tabs.map((tab) => (
                <li key={tab.id} role="presentation">
                  <button
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary border-l-2 border-primary'
                        : 'text-text-muted hover:text-text hover:bg-surface'
                    )}
                  >
                    <tab.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div role="tabpanel" id="panel-general" aria-labelledby="tab-general" hidden={activeTab !== 'general'}>
              <h3 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Auto Rotate</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoRotating}
                      onChange={() => onAutoRotateToggle()}
                      className="toggle"
                    />
                    <span className="text-sm text-text">Automatically rotate panorama when idle</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Fullscreen</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFullscreen}
                      onChange={(e) => setFullscreen(e.target.checked)}
                      className="toggle"
                    />
                    <span className="text-sm text-text">Enter fullscreen mode on load</span>
                  </label>
                </div>
              </div>
            </div>

            <div role="tabpanel" id="panel-controls" aria-labelledby="tab-controls" hidden={activeTab !== 'controls'}>
              <h3 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">Control Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Sensitivity: {sensitivity.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={sensitivity}
                    onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-surface rounded-lg appearance-none accent-primary"
                  />
                  <p className="text-xs text-text-muted mt-1">Mouse/touch movement sensitivity</p>
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invertY}
                      onChange={() => onInvertYToggle()}
                      className="toggle"
                    />
                    <span className="text-sm text-text">Invert Y-axis (invert vertical movement)</span>
                  </label>
                </div>
                <button onClick={handleResetDefaults} className="btn-secondary w-full justify-center">
                  Reset to Defaults
                </button>
              </div>
            </div>

            <div role="tabpanel" id="panel-display" aria-labelledby="tab-display" hidden={activeTab !== 'display'}>
              <h3 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">Display Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Quality: {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                          quality === q
                            ? 'bg-primary text-white shadow-md shadow-primary/25'
                            : 'bg-surface text-text-muted hover:text-text hover:bg-surface-hover'
                        )}
                      >
                        {q.charAt(0).toUpperCase() + q.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Field of View: {Math.round(fov)}°
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="1"
                    value={fov}
                    onChange={(e) => setFov(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface rounded-lg appearance-none accent-primary"
                  />
                  <p className="text-xs text-text-muted mt-1">Camera field of view (zoom level)</p>
                </div>
              </div>
            </div>

            <div role="tabpanel" id="panel-audio" aria-labelledby="tab-audio" hidden={activeTab !== 'audio'}>
              <h3 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">Audio Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMuted}
onChange={() => onMuteToggle()}
                      className="toggle"
                    />
                    <span className="text-sm text-text">Mute all audio</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Master Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : 1}
                    onChange={() => onMuteToggle()}
                    disabled={isMuted}
                    className="w-full h-2 bg-surface rounded-lg appearance-none accent-primary"
                  />
                </div>
              </div>
            </div>

            <div role="tabpanel" id="panel-about" aria-labelledby="tab-about" hidden={activeTab !== 'about'}>
              <h3 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">About</h3>
              <div className="space-y-4 text-sm text-text-muted">
                <p>Virtual360 - Premium 360° Virtual Tour Platform</p>
                <p>Version 1.0.0</p>
                <p className="pt-4 border-t border-glass-border">
                  Built with React 19, TypeScript, Three.js, and TailwindCSS
                </p>
                <div className="flex gap-4 pt-4">
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-colors">
                    GitHub
                  </a>
                  <a href="https://threejs.org" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-colors">
                    Three.js
                  </a>
                  <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-colors">
                    React
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}