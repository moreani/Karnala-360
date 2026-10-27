'use client'

import { useEffect, useState } from 'react'
import { cn } from '../../utils/cn'

interface LoadingOverlayProps {
  progress: number
  message?: string
}

export function LoadingOverlay({ progress, message = 'Loading panorama...' }: LoadingOverlayProps) {
  const [showProgress, setShowProgress] = useState(false)

  useEffect(() => {
    if (progress > 0) setShowProgress(true)
    if (progress >= 100) {
      const timer = setTimeout(() => setShowProgress(false), 500)
      return () => clearTimeout(timer)
    }
  }, [progress])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg transition-opacity duration-300',
        showProgress ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      role="status"
      aria-live="polite"
    >
      <div className="glass rounded-2xl p-8 min-w-[300px] text-center shadow-2xl border border-glass-border animate-in">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <svg className="w-full h-full text-primary animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        </div>

        <p className="text-text font-medium mb-4">{message}</p>

        {showProgress && (
          <div className="w-full max-w-xs mx-auto">
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-2 font-mono">{Math.round(progress)}%</p>
          </div>
        )}
      </div>
    </div>
  )
}