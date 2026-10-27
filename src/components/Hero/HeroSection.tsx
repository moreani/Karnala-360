import { useState, useEffect } from 'react'
import { Compass, Eye, ArrowRight, Info } from 'lucide-react'

interface HeroSectionProps {
  onEnter: () => void
}

export function HeroSection({ onEnter }: HeroSectionProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.src = '/hero-bg.jpg'
    img.onload = () => setLoaded(true)
  }, [])

  return (
    <div className="fixed inset-0 bg-bg overflow-hidden">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

      <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="flex items-center gap-3 mb-6">
          <div className="glass rounded-full p-3">
            <Compass className="w-6 h-6 text-primary" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4">
          Virtual 360° Tour
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mb-10 leading-relaxed">
          Explore an immersive panoramic experience. Drag to look around,
          zoom to inspect details, and discover every angle.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onEnter}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg transition-all duration-300 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97]"
          >
            <Eye className="w-5 h-5" />
            <span>Enter 360° Tour</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <button className="inline-flex items-center gap-2 px-6 py-4 glass text-white/80 rounded-xl font-medium transition-all duration-300 hover:bg-white/10 hover:text-white">
            <Info className="w-5 h-5" />
            <span>Learn More</span>
          </button>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <div className="w-24 h-px bg-white/10" />
            <span>Drag to explore</span>
            <div className="w-24 h-px bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  )
}
