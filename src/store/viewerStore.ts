import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ViewerStore, ViewerState, PanoramaScene } from '../types'
import { DEFAULT_VIEWER_STATE } from '../types'

const settingsKeys: (keyof ViewerState)[] = [
  'isAutoRotating',
  'isMuted',
  'sensitivity',
  'invertY',
  'quality',
]

export const useViewerStore = create<ViewerStore>()(
  persist(
    (set) => ({
      ...DEFAULT_VIEWER_STATE,

      setYaw: (yaw: number) => set({ yaw: Math.max(-Math.PI, Math.min(Math.PI, yaw)) }),
      setPitch: (pitch: number) => set({ pitch }),
      setFov: (fov: number) => set({ fov: Math.max(30, Math.min(100, fov)) }),

      setLoading: (isLoading: boolean) => set({ isLoading }),
      setLoadProgress: (loadProgress: number) => set({ loadProgress: Math.max(0, Math.min(100, loadProgress)) }),

      setFullscreen: (isFullscreen: boolean) => {
        if (isFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(console.error)
        } else if (!isFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(console.error)
        }
        set({ isFullscreen })
      },

      setAutoRotate: (isAutoRotating: boolean) => set({ isAutoRotating }),
      setMuted: (isMuted: boolean) => set({ isMuted }),
      setSensitivity: (sensitivity: number) => set({ sensitivity: Math.max(0.1, Math.min(3, sensitivity)) }),
      setInvertY: (invertY: boolean) => set({ invertY }),
      setQuality: (quality: 'low' | 'medium' | 'high') => set({ quality }),

      setCurrentScene: (currentSceneId: string) =>
        set((state) => ({
          currentSceneId,
          previousSceneId: state.currentSceneId,
        })),

      setPreviousScene: (previousSceneId: string | null) => set({ previousSceneId }),

      setTransitioning: (isTransitioning: boolean) => set({ isTransitioning }),

      resetView: () =>
        set(() => ({
          yaw: 0,
          pitch: 0,
          fov: 75,
        })),

      startAutoRotate: () => set({ isAutoRotating: true }),
      stopAutoRotate: () => set({ isAutoRotating: false }),

      updateSettings: (settings: Partial<Pick<ViewerState, 'sensitivity' | 'invertY' | 'quality' | 'isMuted'>>) =>
        set(settings),

      loadSettings: () => {
        const stored = localStorage.getItem('virtual360-settings')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            set(parsed)
          } catch {
            console.warn('Failed to load settings')
          }
        }
      },

      recordInteraction: () => {
        // This is used to track user interaction for auto-rotate
        // The actual implementation is in the hook
      },
    }),
    {
      name: 'virtual360-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => settingsKeys.includes(key as keyof ViewerState))
        ) as Partial<ViewerState>,
    }
  )
)

interface SceneStoreState {
  scenes: Record<string, PanoramaScene>
  currentSceneId: string | null
  isInitialized: boolean
  currentScene: PanoramaScene | null
  setScenes: (scenes: PanoramaScene[]) => void
  setCurrentScene: (sceneId: string) => void
  setInitialized: (initialized: boolean) => void
}

export const useSceneStore = create<SceneStoreState>((set) => ({
  scenes: {},
  currentSceneId: null,
  isInitialized: false,
  currentScene: null,
  setScenes: (scenes) => set({ scenes: Object.fromEntries(scenes.map((s) => [s.id, s])) }),
  setCurrentScene: (currentSceneId) => set((state) => state.scenes[currentSceneId]
    ? { currentSceneId, currentScene: state.scenes[currentSceneId] }
    : {}),
  setInitialized: (isInitialized) => set({ isInitialized }),
}))