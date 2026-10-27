import type { PanoramaScene } from './types'

export function validateScenes(value: unknown): PanoramaScene[] {
  if (!Array.isArray(value) || !value.length) throw new Error('No panorama views are available.')
  const ids = new Set<string>()
  for (const scene of value) {
    if (!scene || typeof scene.id !== 'string' || ids.has(scene.id) || typeof scene.title !== 'string' ||
        typeof scene.image !== 'string' || !/^\/panoramas\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(scene.image) || !Array.isArray(scene.hotspots)) throw new Error('Invalid panorama manifest.')
    ids.add(scene.id)
    for (const key of ['description', 'group']) if (scene[key] !== undefined && typeof scene[key] !== 'string') throw new Error('Invalid scene text.')
    const hotspotIds = new Set<string>()
    for (const key of ['initialYaw', 'initialPitch', 'initialFov']) {
      if (scene[key] !== undefined && !Number.isFinite(scene[key])) throw new Error('Invalid camera position.')
    }
    for (const hotspot of scene.hotspots) {
      if (!hotspot || typeof hotspot.id !== 'string' || hotspotIds.has(hotspot.id) || !Number.isFinite(hotspot.yaw) || !Number.isFinite(hotspot.pitch) || !['info', 'navigation'].includes(hotspot.type)) throw new Error('Invalid panorama hotspot.')
      hotspotIds.add(hotspot.id)
      for (const key of ['title', 'description', 'content']) if (hotspot[key] !== undefined && typeof hotspot[key] !== 'string') throw new Error('Invalid hotspot text.')
    }
  }
  for (const scene of value) for (const hotspot of scene.hotspots) {
    if (hotspot.type === 'navigation' && !ids.has(hotspot.target)) throw new Error('Unknown panorama destination.')
  }
  return value
}

