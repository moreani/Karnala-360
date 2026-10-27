'use client'

import { useViewerStore } from '../../store/viewerStore'

interface CompassProps {
  yaw?: number
}

export function Compass({ yaw: yawProp }: CompassProps) {
  const { yaw } = useViewerStore()
  const currentYaw = yawProp ?? yaw
  const northRotation = -currentYaw

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <div className="relative w-24 h-24 rounded-full glass border border-glass-border shadow-xl overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="44" fill="none" stroke="#1a1a1a" strokeWidth="2" />
          <circle cx="48" cy="48" r="40" fill="none" stroke="#333" strokeWidth="1" />

          <g className="compass-needle" style={{ transform: `rotate(${northRotation}rad)`, transformOrigin: '48px 48px' }}>
            <path
              d="M48 8 L43 32 L48 30 L53 32 Z"
              fill="#0EA5E9"
              stroke="#0284C7"
              strokeWidth="1"
            />
            <circle cx="48" cy="48" r="4" fill="#0EA5E9" />
            <circle cx="48" cy="48" r="2" fill="white" />
          </g>
        </svg>

        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: `rotate(${northRotation}rad)` }}
        >
          {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((label, i) => {
            const angle = (i * 45 - 90) * (Math.PI / 180)
            const radius = 38
            const x = 48 + Math.cos(angle) * radius
            const y = 48 + Math.sin(angle) * radius

            return (
              <div
                key={label}
                className="absolute text-[10px] font-medium text-text-muted transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: x, top: y }}
              >
                {label === 'N' && <span className="text-primary font-bold text-[11px]">N</span>}
                {label !== 'N' && <span>{label}</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-mono text-text-dim whitespace-nowrap">
        {((currentYaw * 180) / Math.PI).toFixed(0).padStart(3, '0')}°
      </div>
    </div>
  )
}