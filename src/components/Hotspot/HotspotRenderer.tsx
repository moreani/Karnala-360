'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Hotspot } from '../../types'
import { cn } from '../../utils/cn'
import { degreesToRadians } from '../../utils/helpers'

interface HotspotProps {
  hotspot: Hotspot
  yaw: number
  pitch: number
  fov: number
  onClick: (hotspot: Hotspot) => void
  onMouseEnter: (hotspot: Hotspot) => void
  onMouseLeave: () => void
  isHovered: boolean
}

export function Hotspot({
  hotspot,
  yaw,
  pitch,
  fov,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isHovered,
}: HotspotProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: -1000, y: -1000 })
  const [isVisible, setIsVisible] = useState(false)
  const [scale, setScale] = useState(1)
  const animationFrameRef = useRef<number | null>(null)

  const updatePosition = useCallback(() => {
    if (!elementRef.current) return

    const container = elementRef.current.parentElement
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    const hotspotYawRad = degreesToRadians(hotspot.yaw)
    const hotspotPitchRad = degreesToRadians(hotspot.pitch)

    const cameraYaw = yaw
    const cameraPitch = pitch
    const cameraFovRad = degreesToRadians(fov)

    let deltaYaw = hotspotYawRad - cameraYaw
    const deltaPitch = hotspotPitchRad - cameraPitch

    if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2
    if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2

    const aspect = containerWidth / containerHeight
    const halfFovY = cameraFovRad / 2
    const halfFovX = halfFovY * aspect

    const isInView = Math.abs(deltaYaw) < halfFovX * 1.2 && Math.abs(deltaPitch) < halfFovY * 1.2

    if (!isInView) {
      setIsVisible(false)
      return
    }

    setIsVisible(true)

    const x = (deltaYaw / halfFovX) * (containerWidth / 2) + containerWidth / 2
    const y = (-deltaPitch / halfFovY) * (containerHeight / 2) + containerHeight / 2

    setPosition({ x, y })

    const distance = Math.sqrt(deltaYaw * deltaYaw + deltaPitch * deltaPitch)
    const maxDistance = Math.sqrt(halfFovX * halfFovX + halfFovY * halfFovY)
    const normalizedDistance = 1 - Math.min(distance / maxDistance, 1)
    setScale(0.7 + normalizedDistance * 0.5)
  }, [hotspot.yaw, hotspot.pitch, yaw, pitch, fov])

  useEffect(() => {
    const animate = () => {
      updatePosition()
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [updatePosition])

  const iconMap: Record<string, React.ReactNode> = {
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
    link: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    ),
    video: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    image: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    audio: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <line x1="15.54" y1="13.46" x2="16.85" y2="14.87" />
        <line x1="17.91" y1="10.34" x2="20.06" y2="7.53" />
      </svg>
    ),
  }

  const Icon = iconMap[hotspot.icon || 'info'] || iconMap.info
  const hotspotColor = hotspot.color || '#0EA5E9'

  return (
    <div
      ref={elementRef}
      id={`hotspot-${hotspot.id}`}
      className={cn(
        'absolute pointer-events-none transition-all duration-200',
        'transform -translate-x-1/2 -translate-y-1/2',
        isHovered && 'scale-110'
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        zIndex: 100,
      }}
    >
      <div
        className={cn(
          'flex items-center justify-center cursor-pointer transition-all duration-200',
          'rounded-full shadow-lg',
          'bg-glass-bg/90 backdrop-blur-sm border border-glass-border',
          'hover:shadow-glow hover:border-primary/50'
        )}
        style={{
          width: 48 * (hotspot.scale ?? 1),
          height: 48 * (hotspot.scale ?? 1),
          background: `linear-gradient(135deg, ${hotspotColor}20, ${hotspotColor}40)`,
          borderColor: `${hotspotColor}60`,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick(hotspot)
        }}
        onMouseEnter={() => onMouseEnter(hotspot)}
        onMouseLeave={onMouseLeave}
        role="button"
        tabIndex={0}
        aria-label={hotspot.title}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick(hotspot)
          }
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ color: hotspotColor }}
        >
          {Icon}
        </div>

        {hotspot.animation === 'pulse' && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-75 pointer-events-none"
            style={{
              background: hotspotColor,
              animationDuration: '2s',
            }}
          />
        )}

        {hotspot.animation === 'rotate' && (
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-current opacity-50 pointer-events-none animate-spin"
            style={{
              borderTopColor: hotspotColor,
              animationDuration: '3s',
            }}
          />
        )}
      </div>

      {isHovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg whitespace-nowrap z-10 border border-gray-700/50 animate-fade-in"
          style={{ transformOrigin: 'center bottom' }}
        >
          {hotspot.title}
          {hotspot.description && (
            <span className="ml-2 text-gray-300">- {hotspot.description}</span>
          )}
        </div>
      )}
    </div>
  )
}

interface HotspotRendererProps {
  hotspots: Hotspot[]
  yaw: number
  pitch: number
  fov: number
  onHotspotClick: (hotspot: Hotspot) => void
  onHotspotMouseEnter: (hotspot: Hotspot) => void
  onHotspotMouseLeave: () => void
  hoveredHotspotId: string | null
}

export function HotspotRenderer({
  hotspots,
  yaw,
  pitch,
  fov,
  onHotspotClick,
  onHotspotMouseEnter,
  onHotspotMouseLeave,
  hoveredHotspotId,
}: HotspotRendererProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10" style={{ touchAction: 'none' }}>
      {hotspots.map((hotspot) => (
        <Hotspot
          key={hotspot.id}
          hotspot={hotspot}
          yaw={yaw}
          pitch={pitch}
          fov={fov}
          onClick={onHotspotClick}
          onMouseEnter={onHotspotMouseEnter}
          onMouseLeave={onHotspotMouseLeave}
          isHovered={hoveredHotspotId === hotspot.id}
        />
      ))}
    </div>
  )
}