'use client'

import { useRef, useEffect } from 'react'
import type { Hotspot, PanoramaScene } from '../../types'

interface MinimapProps {
  scene?: PanoramaScene
  yaw: number
  pitch: number
  fov: number
  hotspots: Hotspot[]
  currentSceneId: string
  isTransitioning?: boolean
}

export function Minimap({ scene, yaw, pitch, fov, hotspots, currentSceneId, isTransitioning }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const size = 200

    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const draw = () => {
      ctx.clearRect(0, 0, size, size)

      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
      ctx.stroke()

      hotspots.forEach((hotspot: Hotspot) => {
        const x = size / 2 + ((hotspot.yaw * 180) / Math.PI / 360) * size
        const y = size / 2 + ((hotspot.pitch * 180) / Math.PI / 180) * size

        if (x >= 0 && x <= size && y >= 0 && y <= size) {
          ctx.fillStyle = hotspot.color || '#0EA5E9'
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()

          ctx.shadowColor = hotspot.color || '#0EA5E9'
          ctx.shadowBlur = 8
          ctx.fill()
          ctx.shadowBlur = 0
        }
      })

      const camX = size / 2 + ((yaw * 180) / Math.PI / 360) * size
      const camY = size / 2 + ((pitch * 180) / Math.PI / 180) * size

      const fovWidth = (fov / 360) * size
      const fovHeight = (fov / 180) * size

      ctx.fillStyle = 'rgba(14, 165, 233, 0.15)'
      ctx.beginPath()
      ctx.ellipse(camX, camY, fovWidth / 2, fovHeight / 2, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(14, 165, 233, 0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(camX, camY, fovWidth / 2, fovHeight / 2, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = '#0EA5E9'
      ctx.beginPath()
      ctx.arc(camX, camY, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.arc(camX, camY, 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#0EA5E9'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(camX, camY - 8)
      ctx.lineTo(camX, camY - 4)
      ctx.stroke()

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [yaw, pitch, fov, hotspots, currentSceneId])

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <div className="glass rounded-xl p-2 shadow-xl border border-glass-border">
        <canvas
          ref={canvasRef}
          className="w-48 h-48"
          aria-label="Mini map showing current view direction and hotspots"
        />
        <div className="mt-2 text-center text-xs text-text-muted font-mono">
          {scene?.title || 'No scene loaded'}
        </div>
        {isTransitioning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}