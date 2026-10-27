import { create } from 'zustand'
import type { PanoramaScene, Hotspot } from '../types'

interface ScenesState {
  scenes: PanoramaScene[]
  currentScene: PanoramaScene | null
  isLoading: boolean
  error: string | null
  fetchScenes: () => Promise<void>
  setCurrentScene: (sceneId: string) => void
  getScene: (sceneId: string) => PanoramaScene | undefined
  getHotspot: (sceneId: string, hotspotId: string) => Hotspot | undefined
}

export const useScenesStore = create<ScenesState>((set, get) => ({
  scenes: [],
  currentScene: null,
  isLoading: true,
  error: null,

  fetchScenes: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/scenes.json')
      if (!response.ok) throw new Error('Failed to load scenes')
      const scenes: PanoramaScene[] = await response.json()
      set({ scenes, isLoading: false })
      if (scenes.length > 0 && !get().currentScene) {
        get().setCurrentScene(scenes[0].id)
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false })
    }
  },

  setCurrentScene: (sceneId: string) => {
    const scene = get().scenes.find((s) => s.id === sceneId)
    if (scene) {
      set({ currentScene: scene })
    }
  },

  getScene: (sceneId: string) => {
    return get().scenes.find((s) => s.id === sceneId)
  },

  getHotspot: (sceneId: string, hotspotId: string) => {
    const scene = get().scenes.find((s) => s.id === sceneId)
    return scene?.hotspots.find((h) => h.id === hotspotId)
  },
}))