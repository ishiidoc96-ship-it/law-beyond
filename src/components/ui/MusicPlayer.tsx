import { useState, useRef, useEffect } from 'react'

interface MusicPlayerProps {
  src: string
  artwork: string
  title: string
  artist: string
  compact?: boolean
}

export default function MusicPlayer({ src, artwork, title, artist, compact = false }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [_duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100)
    }
    const onLoaded = () => setDuration(audio.duration)
    const onEnd = () => { setPlaying(false); setProgress(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause() } else { audio.play() }
    setPlaying(!playing)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30">
        <audio ref={audioRef} src={src} preload="metadata" />
        <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-[18px] text-on-primary">
            {playing ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <img src={artwork} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-label-sm text-label-sm font-medium text-on-surface truncate">{title}</p>
          <p className="font-label-xs text-xs text-on-surface-variant truncate">{artist}</p>
        </div>
        {/* Progress bar */}
        <div className="w-16 h-1 bg-surface-container-high rounded-full overflow-hidden flex-shrink-0">
          <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/30">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform shadow-brand-sm">
        <span className="material-symbols-outlined text-[24px] text-on-primary">
          {playing ? 'pause' : 'play_arrow'}
        </span>
      </button>
      <img src={artwork} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-sm" />
      <div className="flex-1 min-w-0">
        <p className="font-body-md text-body-md font-medium text-on-surface truncate">{title}</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{artist}</p>
        {/* Progress bar */}
        <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden mt-1.5">
          <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
