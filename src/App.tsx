import { useEffect, useRef, useState } from 'react'
import { Viewer } from '@photo-sphere-viewer/core'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import '@photo-sphere-viewer/core/index.css'
import '@photo-sphere-viewer/markers-plugin/index.css'
import { useSceneStore } from './store/viewerStore'
import type { Hotspot } from './types'
import { validateScenes } from './scene-manifest'

const PREVIEW_URL = `${import.meta.env.BASE_URL}panoramas/karnala-preview.webp`
const viewImage = (index:number) => `${import.meta.env.BASE_URL}views/view-${String(index+1).padStart(2,'0')}.webp`
// scenes.json stores root-absolute paths; rebase them so project-site deploys work.
const panoramaUrl = (image:string) => image.startsWith('/panoramas/') ? `${import.meta.env.BASE_URL}${image.slice(1)}` : image
const bearing = (radians:number) => Math.round((((radians*180/Math.PI)%360)+360)%360)
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
const scrollToSection = (id:string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

function App() {
  const surface = useRef<HTMLDivElement>(null)
  const engine = useRef<Viewer | null>(null)
  const generation = useRef(0)
  const loadedPhoto = useRef('')
  const pendingCamera = useRef<{yaw:number,pitch:number,zoom:number} | null>(null)
  const [reducedMotion,setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const motionPreference = useRef(reducedMotion)
  const [camera,setCamera] = useState({yaw:0,pitch:0,zoom:0})
  const [revision, setRevision] = useState(0)
  const [engineRevision, setEngineRevision] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<Hotspot | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const [introduced,setIntroduced] = useState(true)
  const { scenes, currentScene, setScenes, setCurrentScene } = useSceneStore()

  useEffect(() => {
    const media=matchMedia('(prefers-reduced-motion: reduce)')
    const update=()=>{
      motionPreference.current=media.matches;setReducedMotion(media.matches)
      if(media.matches && engine.current && pendingCamera.current){
        const target=pendingCamera.current;const viewer=engine.current
        void Promise.resolve(viewer.stopAnimation()).then(()=>{if(engine.current===viewer){viewer.rotate(target);viewer.zoom(target.zoom)}})
      }
    }
    media.addEventListener('change',update);return ()=>media.removeEventListener('change',update)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setError(''); setLoading(true)
    fetch(`${import.meta.env.BASE_URL}scenes.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Could not load panorama views.'); return response.json() })
      .then(validateScenes)
      .then(data => { setScenes(data); setCurrentScene(data[0].id) })
      .catch(cause => { if (!controller.signal.aborted) { setError(cause.message); setLoading(false) } })
    return () => controller.abort()
  }, [revision, setScenes, setCurrentScene])

  useEffect(() => {
    if (!surface.current) return
    let viewer: Viewer
    try {
      viewer = new Viewer({
        container: surface.current, navbar: false, keyboard: 'fullscreen',
        defaultYaw: 0, defaultPitch: 0, minFov: 30, maxFov: 100,
        // The page scrolls by default; Ctrl/⌘ + wheel (or fullscreen) zooms the lens.
        mousewheel: false,
        plugins: [MarkersPlugin],
      })
      if (!viewer.getPlugin(MarkersPlugin)) throw new Error('The panorama engine did not initialize.')
    } catch {
      // A failed engine constructor can append DOM before WebGL starts.
      const failedSurface = surface.current as HTMLDivElement & { photoSphereViewer?: Viewer }
      failedSurface.replaceChildren()
      delete failedSurface.photoSphereViewer
      setError('This device could not start the panorama viewer. Check WebGL support and try again.')
      setLoading(false)
      return
    }
    engine.current = viewer; loadedPhoto.current=''
    let cameraTick: ReturnType<typeof setTimeout> | undefined
    const syncCamera=()=>{
      if(cameraTick)return
      cameraTick=setTimeout(()=>{cameraTick=undefined;if(engine.current===viewer)setCamera({...viewer.getPosition(),zoom:viewer.getZoomLevel()})},60)
    }
    const zoomWheel=(event:WheelEvent)=>{
      if(!event.deltaY) return
      const modifierZoom = event.ctrlKey || event.metaKey || document.fullscreenElement
      if(!modifierZoom) return
      event.preventDefault()
      const next = Math.max(0, Math.min(100, viewer.getZoomLevel() - Math.sign(event.deltaY) * 4))
      viewer.zoom(next)
    }
    const container=surface.current
    container.addEventListener('wheel',zoomWheel,{passive:false})
    viewer.addEventListener('position-updated',syncCamera);viewer.addEventListener('zoom-updated',syncCamera)
    viewer.getPlugin<MarkersPlugin>(MarkersPlugin).addEventListener('select-marker', event => {
      const hotspot = event.marker.data as Hotspot
      if (hotspot.type === 'navigation' && hotspot.target) useSceneStore.getState().setCurrentScene(hotspot.target)
      else { restoreFocus.current = document.activeElement as HTMLElement; setInfo(hotspot) }
    })
    return () => {
      if(cameraTick)clearTimeout(cameraTick);pendingCamera.current=null;loadedPhoto.current='';engine.current = null
      container.removeEventListener('wheel',zoomWheel)
      viewer.destroy()
    }
  }, [engineRevision])

  useEffect(() => {
    const viewer = engine.current
    if (!viewer || !currentScene) return
    const request = ++generation.current
    setLoading(true); setError('')
    const position = { yaw: `${currentScene.initialYaw ?? 0}deg`, pitch: `${Math.max(-85, Math.min(85, currentScene.initialPitch ?? 0))}deg` }
    const zoom=Math.max(0,Math.min(100,(100-(currentScene.initialFov ?? 75))/70*100))
    const target={yaw:(currentScene.initialYaw ?? 0)*Math.PI/180,pitch:Math.max(-85,Math.min(85,currentScene.initialPitch ?? 0))*Math.PI/180,zoom}
    let ready: Promise<boolean>
    if(loadedPhoto.current===currentScene.image){
      if(motionPreference.current){viewer.rotate(target);viewer.zoom(zoom);ready=Promise.resolve(true)}
      else {pendingCamera.current=target;ready=Promise.resolve(viewer.animate({...target,speed:420})).then(()=>true)}
    } else ready=viewer.setPanorama(panoramaUrl(currentScene.image),{position,transition:false,zoom})
    ready
      .then(loaded => {
        if (!loaded || generation.current !== request || engine.current !== viewer) return
        loadedPhoto.current=currentScene.image;pendingCamera.current=null
        setCamera({...viewer.getPosition(),zoom:viewer.getZoomLevel()})
        const markers = currentScene.hotspots.map(hotspot => {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = hotspot.type === 'navigation' ? 'tour-marker tour-marker--nav' : 'tour-marker tour-marker--info'
          button.textContent = hotspot.type === 'navigation' ? 'Next view' : 'Info'
          button.setAttribute('aria-label', hotspot.title || 'Panorama information')
          return { id: hotspot.id, element: button, position: { yaw: `${hotspot.yaw}deg`, pitch: `${hotspot.pitch}deg` }, data: hotspot }
        })
        viewer.getPlugin<MarkersPlugin>(MarkersPlugin).setMarkers(markers)
        setLoading(false)
      })
      .catch(() => { if (generation.current === request && engine.current === viewer) { setError('The panorama image could not load. Retry or choose another view.'); setLoading(false) } })
  }, [currentScene])

  // The introduction retires on first interaction or after a short pause.
  useEffect(() => {
    if (!introduced) return
    const retire = () => setIntroduced(false)
    const timer = setTimeout(retire, 8000)
    document.addEventListener('pointerdown', retire, { once: true })
    document.addEventListener('wheel', retire, { once: true, passive: true })
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', retire)
      document.removeEventListener('wheel', retire)
    }
  }, [introduced])

  useEffect(() => { if (info) dialog.current?.showModal() }, [info])

  function exploreScene(id:string) {
    setIntroduced(false)
    setCurrentScene(id)
    scrollToTop()
  }
  function cameraKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if(event.target!==event.currentTarget || loading || error || !engine.current)return
    const delta:Record<string,[number,number]>={ArrowLeft:[-.08,0],ArrowRight:[.08,0],ArrowUp:[0,.08],ArrowDown:[0,-.08]}
    const step=delta[event.key]
    const viewer=engine.current
    if(!step){
      if(!['+','=','-','_'].includes(event.key))return
      event.preventDefault()
      const zoom=Math.max(0,Math.min(100,viewer.getZoomLevel()+(event.key==='+'||event.key==='='?5:-5)))
      viewer.zoom(zoom);setCamera(previous=>({...previous,zoom}));return
    }
    event.preventDefault();const position=viewer.getPosition()
    viewer.rotate({yaw:position.yaw+step[0],pitch:Math.max(-Math.PI/2,Math.min(Math.PI/2,position.pitch+step[1]))})
  }

  const sceneList = Object.values(scenes)

  return <main className="site">
    <section className="tour-shell" id="panorama" data-motion={reducedMotion ? 'reduced' : 'full'} data-ready={!loading && !error} aria-label="Karnala 360° panorama">
      <div className="tour-preview" aria-hidden="true" style={{backgroundImage:`url(${PREVIEW_URL})`}} />
      <div ref={surface} tabIndex={0} onKeyDown={cameraKey} className="tour-surface" aria-label="Karnala panorama. Drag to look around; focus here and use arrow keys; pinch or hold Control and scroll to zoom." />

      <header className="tour-topbar">
        <div className="tour-brand">
          <span className="field-label">KARNALA · RAIGAD</span>
          <strong>360° Panorama</strong>
        </div>
        <div className="tour-top-right">
          <div className="camera-readout" aria-label="Live camera position">
            <span>LIVE VIEW</span>
            <output>{bearing(camera.yaw)}° <small>YAW</small> / {Math.round(camera.pitch*180/Math.PI)}° <small>PITCH</small></output>
          </div>
          <button className="tour-icon-btn" aria-label="Toggle fullscreen" onClick={()=>engine.current?.toggleFullscreen()}>⤢</button>
        </div>
      </header>

      {introduced && <section className="tour-intro" aria-label="Introduction">
        <span className="field-label">ONE PHOTOGRAPH · SIX ORIENTATIONS</span>
        <h1>A place.<br /><em>Another perspective.</em></h1>
        <p>Drag to look around. Scroll the page, or hold Ctrl/⌘ to zoom the lens. Scroll down for the six orientations, or follow the <strong>Next view</strong> markers inside the photograph.</p>
        <div className="tour-intro-actions">
          <button onClick={() => setIntroduced(false)}>Start exploring</button>
          <button className="tour-intro-secondary" onClick={() => { setIntroduced(false); scrollToSection('about') }}>Read the story ↓</button>
        </div>
      </section>}



      <button className="tour-scroll" onClick={() => scrollToSection('about')} aria-label="Scroll to the story">
        <span className="tour-scroll__label">Explore the fort</span><span aria-hidden="true">↓</span>
      </button>

      {loading && <p className="tour-status" role="status">Loading panorama…</p>}
      {error && <div className="tour-status" role="alert"><p>{error}</p><button onClick={() => { if (!engine.current) setEngineRevision(value => value + 1); setRevision(value => value + 1) }}>Retry</button></div>}
    </section>

    <nav className="site-nav" aria-label="Site sections">
      <span className="site-nav__brand">KARNALA</span>
      <div className="site-nav__links">
        <a href="#panorama">Panorama</a>
        <a href="#about">The story</a>
        <a href="#views">Orientations</a>
      </div>
      <button onClick={scrollToTop} aria-label="Back to the panorama">↑</button>
    </nav>

    <section className="section" id="about" aria-labelledby="about-title">
      <div className="section-inner">
        <div className="section-head">
          <span className="field-label">01 · THE PANORAMA</span>
          <h2 id="about-title">One cliff. Six ways to stand in front of it.</h2>
          <p>This page holds a single equirectangular photograph of the Karnala cliff in Raigad, Maharashtra. The six orientations are camera bearings inside that one image — not six separate locations, and not six times of day.</p>
        </div>
        <div className="feature-grid">
          <article className="feature">
            <span className="field-label">01</span>
            <h3>Look around</h3>
            <p>Drag with a mouse or one finger. The camera keeps its momentum, so a short flick carries across the cliff face.</p>
          </article>
          <article className="feature">
            <span className="field-label">02</span>
            <h3>Zoom the lens</h3>
            <p>Pinch on touch, drag the dock slider, or hold Ctrl/⌘ while scrolling. Plain scrolling moves down this page.</p>
          </article>
          <article className="feature">
            <span className="field-label">03</span>
            <h3>Go fullscreen</h3>
            <p>The ⤢ button fills the screen. Once the viewer has focus, the arrow keys rotate the camera one step at a time.</p>
          </article>
        </div>
        <dl className="stat-row">
          <div className="stat"><dt>Source image</dt><dd>6144 × 3072</dd></div>
          <div className="stat"><dt>Orientations</dt><dd>6 bearings</dd></div>
          <div className="stat"><dt>Field of view</dt><dd>30–100°</dd></div>
        </dl>
      </div>
    </section>

    <section className="section section--views" id="views" aria-labelledby="views-title">
      <div className="section-inner">
        <div className="section-head">
          <span className="field-label">02 · ORIENTATIONS</span>
          <h2 id="views-title">Pick an angle.</h2>
          <p>Each card aims the camera at one bearing inside the photograph. Nothing moves except the view.</p>
        </div>
        <div className="view-grid">
          {sceneList.length === 0 && <p className="view-empty">Loading orientations…</p>}
          {sceneList.map((scene,index)=><button
            key={scene.id}
            className="view-card"
            onClick={()=>exploreScene(scene.id)}
            aria-label={`View ${scene.title} in the panorama`}>
            <span className="view-card__media">
              <img src={viewImage(index)} alt="" width={720} height={460} loading="lazy" decoding="async" />
              <span className="view-card__index">{String(index+1).padStart(2,'0')}</span>
            </span>
            <span className="view-card__body">
              <span className="view-card__title">{scene.title}</span>
              <span className="view-card__meta">{scene.initialYaw ?? 0}° bearing</span>
              <span className="view-card__go">View in panorama <span aria-hidden="true">→</span></span>
            </span>
          </button>)}
        </div>
      </div>
    </section>

    <footer className="site-footer">
      <div className="section-inner site-footer__inner">
        <div>
          <span className="field-label">KARNALA · RAIGAD · MAHARASHTRA</span>
          <p className="site-footer__title">A place. Another perspective.</p>
        </div>
        <p className="site-footer__note">Built with React, Photo Sphere Viewer and Three.js. Historical interpretation is supplied text with no attached source; it is not presented as verified fact.</p>
        <button className="ghost" onClick={scrollToTop}>Back to the panorama ↑</button>
      </div>
    </footer>

    <dialog ref={dialog} className="tour-dialog" onClose={() => { setInfo(null); restoreFocus.current?.focus() }}>
      <p className="field-label">SUPPLIED INTERPRETATION · SOURCE NOT ATTACHED</p><h2>{info?.title || 'Panorama information'}</h2><p>{info?.description}</p><p>{info?.content}</p>
      <button onClick={() => dialog.current?.close()}>Close</button>
    </dialog>
  </main>
}

export default App
