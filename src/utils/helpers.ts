export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += Math.PI * 2
  while (angle >= Math.PI * 2) angle -= Math.PI * 2
  return angle
}

export function angleDifference(a: number, b: number): number {
  const diff = normalizeAngle(b - a)
  return diff > Math.PI ? diff - Math.PI * 2 : diff
}

export function sphericalToCartesian(yaw: number, pitch: number, radius = 1): Vector3 {
  const cosPitch = Math.cos(pitch)
  return {
    x: radius * Math.sin(yaw) * cosPitch,
    y: radius * Math.sin(pitch),
    z: -radius * Math.cos(yaw) * cosPitch,
  }
}

export function cartesianToSpherical(vector: Vector3): { yaw: number; pitch: number } {
  const yaw = Math.atan2(vector.x, -vector.z)
  const pitch = Math.asin(clamp(vector.y, -1, 1))
  return { yaw, pitch }
}

export function getDistance(point1: Vector2, point2: Vector2): number {
  const dx = point2.x - point1.x
  const dy = point2.y - point1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function getAngle(point1: Vector2, point2: Vector2): number {
  return Math.atan2(point2.y - point1.y, point2.x - point1.x)
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function isLandscape(): boolean {
  return window.innerWidth > window.innerHeight
}

export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1
}

export function supportsWebGL2(): boolean {
  const canvas = document.createElement('canvas')
  return !!canvas.getContext('webgl2')
}

export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function preloadImages(sources: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(sources.map(preloadImage))
}

export function createCanvasTexture(
  canvas: HTMLCanvasElement
): THREE.Texture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function createSphereGeometry(
  radius = 500,
  widthSegments = 60,
  heightSegments = 40
): THREE.SphereGeometry {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments)
  geometry.scale(-1, 1, 1)
  return geometry
}

export function getOptimalTextureSize(devicePixelRatio: number): number {
  const baseSize = 4096
  if (devicePixelRatio >= 2) return Math.min(baseSize * 2, 8192)
  if (devicePixelRatio >= 1.5) return Math.min(baseSize * 1.5, 6144)
  return baseSize
}

export function getQualitySettings(quality: 'low' | 'medium' | 'high') {
  const baseSettings = {
    low: { widthSegments: 30, heightSegments: 20, maxTextureSize: 2048 },
    medium: { widthSegments: 50, heightSegments: 35, maxTextureSize: 4096 },
    high: { widthSegments: 60, heightSegments: 40, maxTextureSize: 8192 },
  }
  return baseSettings[quality]
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

export function debounceFrame<T extends (...args: unknown[]) => unknown>(
  func: T
): (...args: Parameters<T>) => void {
  let frameId: number | null = null
  return (...args: Parameters<T>) => {
    if (frameId !== null) cancelAnimationFrame(frameId)
    frameId = requestAnimationFrame(() => func(...args))
  }
}

export type Vector2 = { x: number; y: number }
export type Vector3 = { x: number; y: number; z: number }

import * as THREE from 'three'