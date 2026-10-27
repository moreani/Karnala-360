import { useEffect, useRef, useState } from 'react'
import { Viewer } from '@photo-sphere-viewer/core'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import '@photo-sphere-viewer/core/index.css'
import '@photo-sphere-viewer/markers-plugin/index.css'
import { useSceneStore } from './store/viewerStore'
import type { Hotspot } from './types'
import { validateScenes } from './scene-manifest'
import { createObservation, decodeViewpoint, encodeViewpoint, OBSERVATIONS_KEY, readObservations, persistObservations, parseNotebook, serializeNotebook, mergeNotebook, updateObservation, deleteObservation, undoObservation, clearNotebook, type Observation, type Viewpoint } from './observations'


function getRecoveryKeys():string[] {
  try {return Object.keys(localStorage).filter(key=>key.startsWith(OBSERVATIONS_KEY+'.recovery.')).sort()} catch{return []}
}
function downloadText(name:string,raw:string) {
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const link=document.createElement('a')
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
const PREVIEW_URL = `${import.meta.env.BASE_URL}panoramas/karnala-preview.webp`
const viewImage = (index:number) => `${import.meta.env.BASE_URL}views/view-${String(index+1).padStart(2,'0')}.webp`
// scenes.json stores root-absolute paths; rebase them so project-site deploys work.
const panoramaUrl = (image:string) => image.startsWith('/panoramas/') ? `${import.meta.env.BASE_URL}${image.slice(1)}` : image
const bearing = (radians:number) => Math.round((((radians*180/Math.PI)%360)+360)%360)
const fovOf = (zoom:number) => Math.round(100 - zoom * 0.7)
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
  const notebookGeneration=useRef(0)
  const notebookRef = useRef<HTMLDetailsElement>(null)
  const [introduced,setIntroduced] = useState(true)
  const [autoOrbit,setAutoOrbit] = useState(false)
  const [observations, setObservations] = useState<Observation[]>(() => {
    try { return readObservations(localStorage.getItem(OBSERVATIONS_KEY)) } catch { return [] }
  })
  const [noteView, setNoteView] = useState<Viewpoint | null>(null)
  const [editing, setEditing] = useState(false)
  const [editingId,setEditingId] = useState<string | null>(null)
  const [confirmDelete,setConfirmDelete] = useState(false)
  const [deleted,setDeleted] = useState<{item:Observation,index:number} | null>(null)
  const [incoming,setIncoming] = useState<Observation[] | null>(null)
  const [replaceConfirmed,setReplaceConfirmed] = useState(false)
  const clearDialog=useRef<HTMLDialogElement>(null)
  const importDialog=useRef<HTMLDialogElement>(null)
  const importInput=useRef<HTMLInputElement>(null)
  const [recoveryKeys,setRecoveryKeys]=useState<string[]>(()=>getRecoveryKeys())
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [notice, setNotice] = useState('')
  const [storageNotice, setStorageNotice] = useState('')
  const [shareURL, setShareURL] = useState('')
  const noteDialog = useRef<HTMLDialogElement>(null)
  const shared = useRef(decodeViewpoint(window.location.hash))
  const sharedApplied = useRef(false)
  const [sharedVisible, setSharedVisible] = useState(false)
  const { scenes, currentScene, setScenes, setCurrentScene } = useSceneStore()

  useEffect(() => {
    const media=matchMedia('(prefers-reduced-motion: reduce)')
    const update=()=>{
      motionPreference.current=media.matches;setReducedMotion(media.matches)
      if(media.matches){setAutoOrbit(false)}
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
    const stopOrbit=()=>setAutoOrbit(false)
    const zoomWheel=(event:WheelEvent)=>{
      setAutoOrbit(false)
      if(!event.deltaY) return
      const modifierZoom = event.ctrlKey || event.metaKey || document.fullscreenElement
      if(!modifierZoom) return
      event.preventDefault()
      const next = Math.max(0, Math.min(100, viewer.getZoomLevel() - Math.sign(event.deltaY) * 4))
      viewer.zoom(next)
    }
    const container=surface.current
    container.addEventListener('pointerdown',stopOrbit)
    container.addEventListener('wheel',zoomWheel,{passive:false})
    container.addEventListener('keydown',stopOrbit)
    viewer.addEventListener('position-updated',syncCamera);viewer.addEventListener('zoom-updated',syncCamera)
    viewer.getPlugin<MarkersPlugin>(MarkersPlugin).addEventListener('select-marker', event => {
      const hotspot = event.marker.data as Hotspot
      if (hotspot.type === 'navigation' && hotspot.target) useSceneStore.getState().setCurrentScene(hotspot.target)
      else { restoreFocus.current = document.activeElement as HTMLElement; setInfo(hotspot) }
    })
    return () => {
      if(cameraTick)clearTimeout(cameraTick);pendingCamera.current=null;loadedPhoto.current='';engine.current = null
      container.removeEventListener('pointerdown',stopOrbit)
      container.removeEventListener('wheel',zoomWheel)
      container.removeEventListener('keydown',stopOrbit)
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
        if (shared.current && !sharedApplied.current) {
          viewer.rotate({ yaw: shared.current.yaw, pitch: shared.current.pitch }); viewer.zoom(shared.current.zoom)
          sharedApplied.current = true; setSharedVisible(true)
        }
        setLoading(false)
      })
      .catch(() => { if (generation.current === request && engine.current === viewer) { setError('The panorama image could not load. Retry or choose another view.'); setLoading(false) } })
  }, [currentScene])

  // Idle auto-orbit, opt-in and paused by any direct interaction.
  useEffect(() => {
    if (!autoOrbit) return
    const viewer = engine.current
    if (!viewer) return
    let frame = 0
    let last = performance.now()
    const step = (now:number) => {
      const delta = Math.min((now - last) / 1000, 0.05); last = now
      const position = viewer.getPosition()
      viewer.rotate({ yaw: position.yaw + 0.055 * delta, pitch: position.pitch })
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [autoOrbit, engineRevision])

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
  useEffect(() => { if (noteView) noteDialog.current?.showModal() }, [noteView])
  useEffect(() => { if (incoming) importDialog.current?.showModal() }, [incoming])

  useEffect(() => {
    const applyShared = () => {
      shared.current = decodeViewpoint(window.location.hash); sharedApplied.current = false
      if (!shared.current) { setSharedVisible(false); return }
      if (engine.current && !loading) {
        engine.current.rotate({yaw:shared.current.yaw,pitch:shared.current.pitch}); engine.current.zoom(shared.current.zoom)
        sharedApplied.current = true; setSharedVisible(true)
      }
    }
    window.addEventListener('hashchange',applyShared)
    return () => window.removeEventListener('hashchange',applyShared)
  }, [loading])

  function exploreScene(id:string) {
    setIntroduced(false)
    setCurrentScene(id)
    scrollToTop()
  }
  function openNotebookPanel() {
    setIntroduced(false)
    if (notebookRef.current) notebookRef.current.open = true
    scrollToTop()
  }
  function openNote(view: Viewpoint, edit: boolean, trigger: HTMLElement) {
    notebookGeneration.current++;restoreFocus.current = trigger; setEditingId('id' in view ? String(view.id) : null); setConfirmDelete(false); setEditing(edit); setTitle(view.title); setNote(view.note); setShareURL(''); setNotice(''); setNoteView(view)
  }
  function saveNote() {
    if (!noteView) return
    try {
      if (!editingId && observations.length >= 100) throw new Error('This notebook holds up to 100 observations.')
      const next = editingId ? updateObservation(observations,editingId,title,note) : [...observations,createObservation(noteView,title,note,crypto.randomUUID())]
      commitNotes(next); noteDialog.current?.close()
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Storage is unavailable. Try another browser session.') }
  }
  function commitNotes(next: Observation[]) {
    if (persistObservations(localStorage,next)) setStorageNotice('Earlier notebook data was preserved on this device for recovery.')
    notebookGeneration.current++;setIncoming(null);setObservations(next);setRecoveryKeys(getRecoveryKeys())
  }
  function removeNote() {
    if(!editingId)return
    try {
      const index=observations.findIndex(item=>item.id===editingId)
      const item=observations[index]
      commitNotes(deleteObservation(observations,editingId))
      setDeleted({item,index});noteDialog.current?.close()
    } catch(cause){setNotice(cause instanceof Error ? cause.message : 'Storage is unavailable.')}
  }
  function undoDelete() {
    if(!deleted)return
    try {commitNotes(undoObservation(observations,deleted.item,deleted.index));setDeleted(null);setStorageNotice('Observation restored.')}
    catch(cause){setStorageNotice(cause instanceof Error ? cause.message : 'Storage is unavailable.')}
  }
  async function loadNotebook(file: File) {
    const operation=++notebookGeneration.current
    try {
      if(file.size>1024*1024)throw new Error('Notebook files must be under 1 MB.')
      const parsed=parseNotebook(await file.text())
      if(operation!==notebookGeneration.current)return
      setNotice('');setReplaceConfirmed(false);setIncoming(parsed)
    } catch(cause){if(operation===notebookGeneration.current)setStorageNotice(cause instanceof Error ? cause.message : 'The notebook could not be read.')}
    if(operation===notebookGeneration.current && importInput.current)importInput.current.value=''
  }
  function importNotebook(replace: boolean) {
    if(!incoming || (replace && !replaceConfirmed))return
    try {
      const next=replace ? incoming : mergeNotebook(observations,incoming)
      if(replace){const previous=localStorage.getItem(OBSERVATIONS_KEY);if(previous)localStorage.setItem(OBSERVATIONS_KEY+'.recovery.'+crypto.randomUUID(),previous)}
      commitNotes(next);setDeleted(null);setStorageNotice(replace ? 'Notebook replaced. Previous data is available under recovery downloads.' : 'Missing observation IDs imported; existing notes retained.')
      importDialog.current?.close()
    } catch(cause){setNotice(cause instanceof Error ? cause.message : 'Storage is unavailable. Nothing was imported.')}
  }
  function clearSavedData() {
    notebookGeneration.current++;setIncoming(null)
    let result:ReturnType<typeof clearNotebook>
    try {result=clearNotebook(localStorage)}catch{setStorageNotice('Removal incomplete: browser storage is unavailable. Your in-memory notes remain available to export.');return}
    if(result.complete){setObservations([]);setDeleted(null);setIncoming(null);setNoteView(null);setEditingId(null);setTitle('');setNote('');setShareURL('');setStorageNotice('Notebook and local recovery data removed. Downloaded files remain unchanged.');clearDialog.current?.close()}
    else setStorageNotice(`Removal incomplete: ${result.remaining.length} storage record(s) could not be removed. Your in-memory notes remain available to export; retry cleanup.`)
    setRecoveryKeys(getRecoveryKeys())
  }
  function cameraKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if(event.target!==event.currentTarget || loading || error || !engine.current)return
    const delta:Record<string,[number,number]>={ArrowLeft:[-.08,0],ArrowRight:[.08,0],ArrowUp:[0,.08],ArrowDown:[0,-.08]}
    const step=delta[event.key];if(!step)return
    event.preventDefault();const viewer=engine.current;const position=viewer.getPosition()
    viewer.rotate({yaw:position.yaw+step[0],pitch:Math.max(-Math.PI/2,Math.min(Math.PI/2,position.pitch+step[1]))})
  }
  function revisit(view: Viewpoint) {
    engine.current?.rotate({yaw: view.yaw, pitch: view.pitch}); engine.current?.zoom(view.zoom); noteDialog.current?.close()
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
        <p>Drag to look around. Scroll the page, or hold Ctrl/⌘ to zoom the lens. Step through the six orientations on the right, or follow the <strong>Next view</strong> markers inside the photograph.</p>
        <div className="tour-intro-actions">
          <button onClick={() => setIntroduced(false)}>Start exploring</button>
          <button className="tour-intro-secondary" onClick={() => { setIntroduced(false); scrollToSection('about') }}>Read the story ↓</button>
        </div>
      </section>}

      <nav className="orientation-chapters" aria-label="Orientation chapters">
        <span className="field-label">ORIENTATIONS</span>
        {sceneList.map((scene,index)=><button
          key={scene.id}
          title={scene.title}
          aria-label={`Orientation ${index+1}`}
          aria-current={currentScene?.id===scene.id ? 'true' : undefined}
          disabled={!!error}
          onClick={()=>setCurrentScene(scene.id)}>
          <span>{String(index+1).padStart(2,'0')}</span>
          <small>{scene.initialYaw ?? 0}°</small>
        </button>)}
      </nav>

      <section className="tour-selection" aria-label="Panorama views">
        <div className="tour-row">
          <label htmlFor="tour-view">View</label>
          <select id="tour-view" value={currentScene?.id ?? ''} onChange={event => setCurrentScene(event.target.value)}>
            {sceneList.map(scene => <option key={scene.id} value={scene.id}>{scene.title}</option>)}
          </select>
        </div>
        <div className="camera-zoom">
          <label htmlFor="camera-zoom">Camera zoom <output>FOV {fovOf(camera.zoom)}°</output></label>
          <input id="camera-zoom" aria-label="Camera zoom" type="range" min="0" max="100" value={Math.round(camera.zoom)} disabled={loading || !!error} onChange={event=>{const zoom=Number(event.target.value);engine.current?.zoom(zoom);setCamera(previous=>({...previous,zoom}))}} />
        </div>
        <div className="tour-actions">
          <button className="tour-primary" disabled={loading || !!error} onClick={event => {
            const viewer = engine.current; if (!viewer) return
            const position = viewer.getPosition()
            openNote({...position, zoom: viewer.getZoomLevel(), title: '', note: ''}, true, event.currentTarget)
          }}>Save viewpoint</button>
          {sharedVisible && shared.current && <button onClick={event => openNote(shared.current!, false, event.currentTarget)}>Shared viewpoint</button>}
          {currentScene?.hotspots.filter(hotspot => hotspot.type === 'info').map(hotspot => <button key={hotspot.id} onClick={event => { restoreFocus.current = event.currentTarget; setInfo(hotspot) }}>{hotspot.title || 'Information'}</button>)}
          <button aria-pressed={autoOrbit} disabled={reducedMotion} onClick={()=>setAutoOrbit(value=>!value)}>Auto-orbit</button>
        </div>
        <p className="tour-hint">Drag to look · Ctrl/⌘ + scroll to zoom · arrow keys rotate</p>
      </section>

      <aside className="observation-index" aria-label="Field notebook">
        <details ref={notebookRef}><summary>Observation index <span>{observations.length}</span></summary>
          <p className="field-label">YOUR NOTES · SAVED ON THIS DEVICE · {observations.length}/100</p>
          <div className="notebook-tools"><button onClick={event=>{restoreFocus.current=event.currentTarget;clearDialog.current?.showModal()}}>Clear notebook and recovery data</button><button onClick={()=>downloadText('karnala-notebook.json',serializeNotebook(observations))}>Export notebook</button><button onClick={event=>{restoreFocus.current=event.currentTarget;importInput.current?.click()}}>Import notebook</button><input ref={importInput} type="file" accept="application/json,.json" aria-label="Import notebook file" hidden onChange={event=>{const file=event.target.files?.[0];if(file)void loadNotebook(file)}} /></div>
          {deleted && <button onClick={undoDelete}>Undo delete: {deleted.item.title}</button>}
          <details><summary>Recovery downloads</summary><p>Raw backups remain on this device. Download before clearing browser data.</p><button onClick={()=>{try{const raw=localStorage.getItem(OBSERVATIONS_KEY);if(raw)downloadText('current-notebook-raw.json',raw)}catch{setStorageNotice('Storage is unavailable.')}}}>Download current raw data</button>{recoveryKeys.map((key,index)=><button key={key} onClick={()=>{try{const raw=localStorage.getItem(key);if(raw!==null)downloadText(`notebook-recovery-${index+1}.json`,raw)}catch{setStorageNotice('Storage is unavailable.')}}}>Download recovery {index+1}</button>)}</details>{storageNotice && <p role="status">{storageNotice}</p>}
          {observations.length === 0 ? <p>Mark a viewpoint to begin your notebook.</p> : <ol>{observations.map(observation => <li key={observation.id}><button onClick={event => openNote(observation, false, event.currentTarget)}>{observation.title}</button><span>{Math.round(observation.yaw * 180 / Math.PI)}° · {Math.round(observation.zoom)}% zoom</span></li>)}</ol>}
        </details>
      </aside>

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
        <a href="#views">Orientations</a>
        <a href="#notebook">Notebook</a>
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
            <h3>Keep a notebook</h3>
            <p>Mark a viewpoint with a title and a note. Up to 100 entries stay on this device, and a link can carry one to someone else.</p>
          </article>
        </div>
        <dl className="stat-row">
          <div className="stat"><dt>Source image</dt><dd>6144 × 3072</dd></div>
          <div className="stat"><dt>Orientations</dt><dd>6 bearings</dd></div>
          <div className="stat"><dt>Saved viewpoints</dt><dd>Up to 100</dd></div>
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

    <section className="section section--notebook" id="notebook" aria-labelledby="notebook-title">
      <div className="section-inner">
        <div className="notebook-panel">
          <div className="notebook-copy">
            <span className="field-label">03 · FIELD NOTEBOOK</span>
            <h2 id="notebook-title">Keep what you noticed.</h2>
            <p>Save the exact camera position with a note, then return to it later. The notebook lives in this browser — no account, no upload, nothing leaves the device unless you export it.</p>
            <ul className="notebook-list">
              <li><strong>Revisit</strong> restores the exact yaw, pitch and zoom.</li>
              <li><strong>Share</strong> builds a link that carries the view and the note.</li>
              <li><strong>Export</strong> writes versioned JSON for backup or another machine.</li>
            </ul>
            <div className="section-actions">
              <button className="cta" onClick={openNotebookPanel}>Open my notebook</button>
              <button className="ghost" onClick={()=>scrollToSection('views')}>Browse orientations</button>
            </div>
          </div>
          <aside className="notebook-facts" aria-label="Notebook details">
            <div><span className="field-label">STORAGE</span><p>On this device only. Clearing site data removes it, so export first.</p></div>
            <div><span className="field-label">CAPACITY</span><p>Up to 100 observations, each with camera position, title and note.</p></div>
            <div><span className="field-label">PORTABLE</span><p>Versioned JSON export, validated on import before anything changes.</p></div>
          </aside>
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
    <dialog ref={noteDialog} className="tour-dialog note-sheet" onClose={() => { setNoteView(null); restoreFocus.current?.focus() }}>
      <p className="field-label">USER OBSERVATION · {editing ? 'CAPTURED VIEWPOINT' : 'PERSONAL NOTE'}</p>
      {editing ? <form onSubmit={event => {event.preventDefault(); saveNote()}}>
        <h2>{editingId ? 'Edit this note.' : 'Mark this view.'}</h2><p>Save the camera position with a note. Stored on this device.</p>
        <label>Title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={80} required /></label>
        <label>Your observation<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={4} /></label>
        <button type="submit">Save observation</button>
      </form> : <><h2>{noteView?.title}</h2><p className="observation-copy">{noteView?.note || 'No written note.'}</p><button disabled={loading} onClick={() => {if (noteView) revisit(noteView)}}>Revisit viewpoint</button><button onClick={() => {if (noteView) setShareURL(window.location.origin + window.location.pathname + encodeViewpoint(noteView))}}>Share viewpoint</button>{editingId && <><button onClick={()=>setEditing(true)}>Edit observation</button><button onClick={()=>setConfirmDelete(true)}>Delete observation</button></>}</>}
      {confirmDelete && <div role="group" aria-label="Confirm deletion"><p>Delete this observation? You can undo it from the notebook.</p><button onClick={removeNote}>Confirm delete</button><button onClick={()=>setConfirmDelete(false)}>Keep observation</button></div>}
      {shareURL && <label>Viewpoint URL<input readOnly value={shareURL} onFocus={event => event.currentTarget.select()} /><small>This link includes the note. Share only what you intend others to read.</small></label>}
      {notice && <p role="alert">{notice}</p>}
      <button onClick={() => noteDialog.current?.close()}>Close</button>
    </dialog>
    <dialog ref={clearDialog} className="tour-dialog note-sheet" onClose={()=>restoreFocus.current?.focus()}>
      <h2>Remove this notebook?</h2><p>Remove saved notes and all raw recovery backups from this device. Unrelated browser data and downloaded files stay unchanged. Export first if you want a copy.</p>
      <button onClick={clearSavedData}>Confirm clear notebook</button><button onClick={()=>clearDialog.current?.close()}>Keep notebook</button>
      {storageNotice.startsWith('Removal incomplete') && <p role="alert">{storageNotice}</p>}
    </dialog>
    <dialog ref={importDialog} className="tour-dialog note-sheet" onClose={()=>{notebookGeneration.current++;setIncoming(null);restoreFocus.current?.focus()}}>
      <h2>Restore your notebook.</h2><p>{incoming?.length} validated observations. Merge keeps existing notes with the same ID.</p>
      <button onClick={()=>importNotebook(false)}>Merge missing observations</button>
      <label><input type="checkbox" checked={replaceConfirmed} onChange={event=>setReplaceConfirmed(event.target.checked)} /> Replace all current notes; preserve a recovery backup first.</label>
      <button disabled={!replaceConfirmed} onClick={()=>importNotebook(true)}>Replace notebook</button>
      {notice && <p role="alert">{notice}</p>}<button onClick={()=>importDialog.current?.close()}>Cancel</button>
    </dialog>
  </main>
}

export default App
