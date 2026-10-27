import React, { useRef, useEffect, useCallback, useState } from 'react'
import * as THREE from 'three'
import { useViewerStore, useSceneStore } from '../../store/viewerStore'
import { degreesToRadians, sphericalToCartesian } from '../../utils/helpers'
import { HotspotRenderer } from '../Hotspot/HotspotRenderer'
import { InfoPanel } from '../InfoPanel/InfoPanel'
import { LoadingOverlay } from '../Loading/LoadingOverlay'
import { Navbar } from '../Navbar/Navbar'
import type { PanoramaScene, Hotspot } from '../../types'

interface ViewerProps {
  sceneId?: string
}

export function Viewer({ sceneId: _initialSceneId }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const {
    yaw,
    pitch,
    fov,
    isLoading,
    loadProgress,
    isFullscreen,
    isAutoRotating,
    sensitivity,
    invertY,
    currentSceneId,
    setYaw,
    setPitch,
    setFov,
    setLoading,
    setLoadProgress,
    setFullscreen,
    setCurrentScene,
    recordInteraction,
  } = useViewerStore()

  const { scenes, currentScene, isInitialized, setCurrentScene: setSceneStoreScene, setInitialized } = useSceneStore()

  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null)
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null)

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const sphereRef = useRef<THREE.Mesh | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const textureLoaderRef = useRef<THREE.TextureLoader>(new THREE.TextureLoader())
  const currentTextureRef = useRef<THREE.Texture | null>(null)

  const hotspots = currentScene?.hotspots || []

  const loadSceneTexture = useCallback(
    async (scene: PanoramaScene) => {
      if (!sphereRef.current) return

      setLoading(true)
      setLoadProgress(0)

      try {
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          textureLoaderRef.current.load(
            scene.image,
            (tex) => {
              tex.mapping = THREE.EquirectangularReflectionMapping
              tex.colorSpace = THREE.SRGBColorSpace
              tex.anisotropy = 16
              resolve(tex)
            },
            (progress) => {
              if (progress.lengthComputable) {
                setLoadProgress((progress.loaded / progress.total) * 100)
              }
            },
            reject
          )
        })

        if (currentTextureRef.current) {
          currentTextureRef.current.dispose()
        }

        currentTextureRef.current = texture

        if (sphereRef.current && sphereRef.current.material instanceof THREE.MeshBasicMaterial) {
          sphereRef.current.material.map = texture
          sphereRef.current.material.needsUpdate = true
        }

        setLoading(false)
        setLoadProgress(100)
      } catch (error) {
        console.error('Failed to load scene texture:', error)
        setLoading(false)
      }
    },
    [setLoading, setLoadProgress]
  )

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return

    const container = containerRef.current
    const canvas = canvasRef.current

    const width = container.clientWidth
    const height = container.clientHeight

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000)
    cameraRef.current = camera

    const geometry = new THREE.SphereGeometry(500, 60, 40)
    geometry.scale(-1, 1, 1)

    const material = new THREE.MeshBasicMaterial({
      map: currentTextureRef.current,
      side: THREE.BackSide,
    })

    const sphere = new THREE.Mesh(geometry, material)
    sphereRef.current = sphere
    scene.add(sphere)

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      if (isAutoRotating && !useViewerStore.getState().isTransitioning) {
        const newYaw = yaw + 0.001 * sensitivity
        setYaw(newYaw)
      }

      const direction = sphericalToCartesian(yaw, pitch)
      camera.lookAt(direction.x, direction.y, direction.z)
      camera.fov = fov
      camera.updateProjectionMatrix()

      renderer.render(scene, camera)

      if (containerRef.current) {
        updateHotspotPositions(containerRef.current)
      }
    }

    animate()

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      rendererRef.current.setSize(width, height)
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
      renderer.dispose()
      if (currentTextureRef.current) currentTextureRef.current.dispose()
      geometry.dispose()
      material.dispose()
    }
  }, [fov, isAutoRotating, sensitivity, yaw, pitch])

  const updateHotspotPositions = useCallback((container: HTMLElement) => {
    const width = container.clientWidth
    const height = container.clientHeight

    hotspots.forEach((hotspot: Hotspot) => {
      const element = document.getElementById(`hotspot-${hotspot.id}`)
      if (!element) return

      const hotspotYawRad = degreesToRadians(hotspot.yaw)
      const hotspotPitchRad = degreesToRadians(hotspot.pitch)

      const cameraYaw = yaw
      const cameraPitch = pitch
      const cameraFovRad = degreesToRadians(fov)

      let deltaYaw = hotspotYawRad - cameraYaw
      const deltaPitch = hotspotPitchRad - cameraPitch

      if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2
      if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2

      const aspect = width / height
      const halfFovY = cameraFovRad / 2
      const halfFovX = halfFovY * aspect

      const isInView = Math.abs(deltaYaw) < halfFovX * 1.2 && Math.abs(deltaPitch) < halfFovY * 1.2

      if (!isInView) {
        element.style.opacity = '0'
        element.style.pointerEvents = 'none'
        return
      }

      element.style.opacity = '1'
      element.style.pointerEvents = 'auto'

      const x = (deltaYaw / halfFovX) * (width / 2) + width / 2
      const y = (-deltaPitch / halfFovY) * (height / 2) + height / 2

      const distance = Math.sqrt(deltaYaw * deltaYaw + deltaPitch * deltaPitch)
      const maxDistance = Math.sqrt(halfFovX * halfFovX + halfFovY * halfFovY)
      const normalizedDistance = 1 - Math.min(distance / maxDistance, 1)
      const scale = 0.7 + normalizedDistance * 0.5

      element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale})`
      element.dataset.distance = distance.toFixed(3)
    })

    const sortedHotspots = hotspots
      .map((h: Hotspot) => ({ hotspot: h, element: document.getElementById(`hotspot-${h.id}`) }))
      .filter(({ element }) => element)
      .sort((a, b) => parseFloat(a.element!.dataset.distance || '0') - parseFloat(b.element!.dataset.distance || '0'))

    sortedHotspots.forEach(({ element }, index) => {
      element!.style.zIndex = (100 + index).toString()
    })
  }, [hotspots, yaw, pitch, fov])

  const handleHotspotClick = useCallback(
    (hotspot: Hotspot) => {
      recordInteraction()
      setSelectedHotspot(hotspot)
      setShowInfoPanel(true)

      if (hotspot.target) {
        setTimeout(() => {
          setCurrentScene(hotspot.target!)
          if (hotspot.yaw !== undefined && hotspot.pitch !== undefined) {
            setYaw(degreesToRadians(hotspot.yaw))
            setPitch(degreesToRadians(hotspot.pitch))
          }
          setShowInfoPanel(false)
        }, 300)
      }
    },
    [recordInteraction, setCurrentScene, setYaw, setPitch, setFov]
  )

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return
      recordInteraction()

      const startX = event.clientX
      const startY = event.clientY
      const startYaw = yaw
      const startPitch = pitch

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = (e.clientX - startX) * 0.005 * sensitivity
        const deltaY = (e.clientY - startY) * 0.005 * sensitivity * (invertY ? -1 : 1)

        setYaw(startYaw + deltaX)
        setPitch(startPitch + deltaY)
      }

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [yaw, pitch, sensitivity, invertY, setYaw, setPitch, recordInteraction]
  )

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault()
      recordInteraction()

      const delta = event.deltaY > 0 ? 5 : -5
      setFov(fov + delta)
    },
    [fov, setFov, recordInteraction]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      recordInteraction()

      switch (event.key) {
        case 'ArrowLeft':
          setYaw(yaw - 0.05 * sensitivity)
          break
        case 'ArrowRight':
          setYaw(yaw + 0.05 * sensitivity)
          break
        case 'ArrowUp':
          setPitch(pitch + 0.05 * sensitivity * (invertY ? -1 : 1))
          break
        case 'ArrowDown':
          setPitch(pitch - 0.05 * sensitivity * (invertY ? -1 : 1))
          break
        case '+':
        case '=':
          setFov(Math.max(30, fov - 5))
          break
        case '-':
          setFov(Math.min(100, fov + 5))
          break
        case '0':
          setYaw(0)
          setPitch(0)
          setFov(75)
          break
      }
    },
    [yaw, pitch, fov, sensitivity, invertY, setYaw, setPitch, setFov, recordInteraction]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (currentSceneId && scenes[currentSceneId] && scenes[currentSceneId] !== currentScene) {
      setCurrentScene(currentSceneId)
      setSceneStoreScene(currentSceneId)
      loadSceneTexture(scenes[currentSceneId])
    }
  }, [currentSceneId, scenes, currentScene, setCurrentScene, setSceneStoreScene, loadSceneTexture])

  useEffect(() => {
    if (!isInitialized && Object.keys(scenes).length > 0) {
      setInitialized(true)
    }
  }, [isInitialized, scenes, setInitialized])

  return (
    <div
      id="pano-viewer"
      ref={containerRef}
      className="fixed inset-0 bg-bg overflow-hidden touch-none"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      {isLoading && <LoadingOverlay progress={loadProgress} />}

      <Navbar
        onFullscreenToggle={() => setFullscreen(!isFullscreen)}
        isFullscreen={isFullscreen}
        onSceneSelect={(sceneId) => {
          setCurrentScene(sceneId)
          setSceneStoreScene(sceneId)
          const scene = scenes[sceneId]
          if (scene) {
            loadSceneTexture(scene)
            if (scene.initialYaw !== undefined) setYaw(degreesToRadians(scene.initialYaw))
            if (scene.initialPitch !== undefined) setPitch(degreesToRadians(scene.initialPitch))
            if (scene.initialFov !== undefined) setFov(scene.initialFov)
          }
        }}
      />

      <HotspotRenderer
        hotspots={hotspots}
        yaw={yaw}
        pitch={pitch}
        fov={fov}
        onHotspotClick={handleHotspotClick}
        onHotspotMouseEnter={(hotspot) => setHoveredHotspotId(hotspot.id)}
        onHotspotMouseLeave={() => setHoveredHotspotId(null)}
        hoveredHotspotId={hoveredHotspotId}
      />

      {showInfoPanel && selectedHotspot && (
        <InfoPanel
          hotspot={selectedHotspot}
          onClose={() => setShowInfoPanel(false)}
          onNavigate={handleHotspotClick}
        />
      )}
    </div>
  )
}