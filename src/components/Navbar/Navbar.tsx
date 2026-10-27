import { useViewerStore, useSceneStore } from '../../store/viewerStore'
import { Compass, Maximize, Minimize, Volume2, VolumeX, RotateCcw } from 'lucide-react'

interface NavbarProps {
  onFullscreenToggle: () => void
  isFullscreen: boolean
  onSceneSelect: (sceneId: string) => void
}

export function Navbar({
  onFullscreenToggle,
  isFullscreen,
  onSceneSelect,
}: NavbarProps) {
  const { isMuted, isAutoRotating } = useViewerStore()
  const { scenes, currentScene } = useSceneStore()

  const viewScenes = Object.values(scenes).filter(s => s.group === 'Views')

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 flex items-start justify-between p-5 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border-2 border-yellow-500 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <span className="text-yellow-500 font-bold text-xl">B</span>
            </div>
            <div className="text-white">
              <div className="text-xs tracking-widest text-white/60">VIRTUAL</div>
              <div className="text-lg font-bold leading-tight">360° TOUR</div>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-0.5 bg-white/15 backdrop-blur-md rounded-lg p-1 border border-white/20">
          <button className="px-5 py-2 bg-white text-gray-900 rounded-md text-sm font-semibold transition-all shadow-sm">
            Views
          </button>
          <button className="px-5 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md text-sm font-medium transition-all">
            Locations
          </button>
        </div>
      </div>

      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1">
        {viewScenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() => onSceneSelect(scene.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 min-w-[80px] text-center ${
              currentScene?.id === scene.id
                ? 'bg-white/30 backdrop-blur-md text-white border border-white/40 shadow-lg'
                : 'bg-white/15 backdrop-blur-md text-white/90 border border-white/20 hover:bg-white/25 hover:text-white'
            }`}
          >
            {scene.title}
          </button>
        ))}
      </div>

      <div className="fixed bottom-5 left-5 z-40">
        <button
          className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
          aria-label="Compass"
        >
          <Compass className="w-7 h-7 text-white" />
        </button>
      </div>

      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
        <button
          onClick={() => useViewerStore.getState().setMuted(!isMuted)}
          className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-white/60" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
        <button
          onClick={() => useViewerStore.getState().setAutoRotate(!isAutoRotating)}
          className={`w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all ${
            isAutoRotating ? 'bg-primary/20 border-primary/40' : ''
          }`}
          aria-label={isAutoRotating ? 'Stop auto rotate' : 'Start auto rotate'}
        >
          <RotateCcw className={`w-5 h-5 ${isAutoRotating ? 'text-primary' : 'text-white'}`} />
        </button>
        <button
          onClick={onFullscreenToggle}
          className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
        </button>
      </div>
    </>
  )
}
