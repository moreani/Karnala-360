export interface Vector2 {
  x: number
  y: number
}

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface PanoramaScene {
  id: string
  title: string
  description?: string
  group?: string
  thumbnail?: string
  image: string
  initialYaw?: number
  initialPitch?: number
  initialFov?: number
  hotspots: Hotspot[]
  ambientSound?: string
  floor?: number
}

export interface Hotspot {
  id: string
  type: 'navigation' | 'info' | 'image' | 'video' | 'link' | 'audio'
  yaw: number
  pitch: number
  target?: string
  icon?: string
  title?: string
  description?: string
  image?: string
  video?: string
  url?: string
  audio?: string
  color?: string
  pulseColor?: string
  scale?: number
  animation?: 'pulse' | 'rotate' | 'bounce' | 'none'
  content?: string
}

export interface ViewerState {
  yaw: number
  pitch: number
  fov: number
  isLoading: boolean
  loadProgress: number
  isFullscreen: boolean
  isAutoRotating: boolean
  isMuted: boolean
  sensitivity: number
  invertY: boolean
  quality: 'low' | 'medium' | 'high'
  currentSceneId: string | null
  previousSceneId: string | null
  isTransitioning: boolean
}

export interface ViewerActions {
  setYaw: (yaw: number) => void
  setPitch: (pitch: number) => void
  setFov: (fov: number) => void
  setLoading: (isLoading: boolean) => void
  setLoadProgress: (progress: number) => void
  setFullscreen: (fullscreen: boolean) => void
  setAutoRotate: (autoRotate: boolean) => void
  setMuted: (muted: boolean) => void
  setSensitivity: (sensitivity: number) => void
  setInvertY: (invertY: boolean) => void
  setQuality: (quality: 'low' | 'medium' | 'high') => void
  setCurrentScene: (sceneId: string) => void
  setPreviousScene: (sceneId: string | null) => void
  setTransitioning: (transitioning: boolean) => void
  resetView: () => void
  startAutoRotate: () => void
  stopAutoRotate: () => void
  recordInteraction: () => void
  loadSettings: () => void
}

export type ViewerStore = ViewerState & ViewerActions

export const DEFAULT_VIEWER_STATE: ViewerState = {
  yaw: 0,
  pitch: 0,
  fov: 75,
  isLoading: true,
  loadProgress: 0,
  isFullscreen: false,
  isAutoRotating: false,
  isMuted: false,
  sensitivity: 1,
  invertY: false,
  quality: 'high',
  currentSceneId: null,
  previousSceneId: null,
  isTransitioning: false,
}

export const DEFAULT_SCENE_CONFIG = {
  initialYaw: 0,
  initialPitch: 0,
  initialFov: 75,
  transitionDuration: 600,
  autoRotateDelay: 10000,
  autoRotateSpeed: 0.1,
  maxFov: 100,
  minFov: 30,
  maxPitch: Math.PI / 2 - 0.01,
  minPitch: -Math.PI / 2 + 0.01,
}