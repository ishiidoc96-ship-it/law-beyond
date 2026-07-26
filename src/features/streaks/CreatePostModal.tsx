import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { createStreakPost } from '../../lib/api'
import { uploadToCloudinary, isCloudinaryConfigured, isVideoFile, type MediaType } from '../../lib/cloudinary'
import { playStreakSound } from '../../lib/notify-sounds'
import { hapticTap, hapticSuccess } from '../../lib/haptics'
import { FILTERS, ASPECT_RATIOS, type AspectRatioId } from '../../lib/filters'
import { searchMusic, GENRE_SEEDS, formatDuration, type MusicTrack } from '../../lib/music'
import { toast } from 'sonner'

const ACCEPTED_IMAGE = 'image/jpeg,image/png,image/webp,image/heic,image/heif'
const ACCEPTED_VIDEO = 'video/mp4,video/webm,video/quicktime'
const ACCEPTED_ALL = ACCEPTED_IMAGE + ',' + ACCEPTED_VIDEO

type Step = 'select' | 'edit' | 'details' | 'share'

interface CreatePostModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  initialFile?: File
  initialMediaType?: MediaType
}

function sanitizeForDisplay(text: string): string {
  return text.replace(/</g, '\u0026lt;').replace(/>/g, '\u0026gt;').replace(/"/g, '\u0026quot;').replace(/'/g, '\u0026#39;').trim()
}

function sanitizeForUpload(text: string): string {
  return sanitizeForDisplay(text).slice(0, 500)
}

export default function CreatePostModal({ open, onClose, onCreated, initialFile, initialMediaType }: CreatePostModalProps) {
  const { user, profile } = useAuth()

  // Step management
  const [step, setStep] = useState<Step>('select')

  // File state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>('image')

  // Edit state
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('1:1')
  const [activeFilter, setActiveFilter] = useState('none')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [warmth, setWarmth] = useState(0)
  const [fade, setFade] = useState(0)
  const [highlights, setHighlights] = useState(0)
  const [shadows, setShadows] = useState(0)
  const [hue, setHue] = useState(0)
  const [grain, setGrain] = useState(0)
  const [showAdjust, setShowAdjust] = useState(false)

  // Details state
  const [caption, setCaption] = useState('')
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null)
  const [showMusicSheet, setShowMusicSheet] = useState(false)
  const [musicSearch, setMusicSearch] = useState('')
  const [musicResults, setMusicResults] = useState<MusicTrack[]>([])
  const [musicLoading, setMusicLoading] = useState(false)
  const [musicGenre, setMusicGenre] = useState('Trending')
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [taggedPeople, setTaggedPeople] = useState<string[]>([])
  const [showTagSheet, setShowTagSheet] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [location, setLocation] = useState('')
  const [showLocationSheet, setShowLocationSheet] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'You'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  // ── Reset on close ──
  const resetForm = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPreview(null)
    setFile(null)
    setMediaType('image')
    setStep('select')
    setAspectRatio('1:1')
    setActiveFilter('none')
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setWarmth(0)
    setFade(0)
    setHighlights(0)
    setShadows(0)
    setHue(0)
    setGrain(0)
    setShowAdjust(false)
    setCaption('')
    setSelectedMusic(null)
    setShowMusicSheet(false)
    setMusicResults([])
    setPlayingTrackId(null)
    setTaggedPeople([])
    setShowTagSheet(false)
    setLocation('')
    setShowLocationSheet(false)
    setError('')
    setUploadProgress('')
  }, [preview])

  const handleClose = useCallback(() => {
    if (!uploading) { resetForm(); onClose() }
  }, [uploading, resetForm, onClose])

  // ── File handling ──
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.type.startsWith('image/') && !selected.type.startsWith('video/')) {
      setError('Please select an image or video file')
      return
    }
    if (selected.size > 100 * 1024 * 1024) { setError('File must be under 100MB'); return }
    const type: MediaType = isVideoFile(selected) ? 'video' : 'image'
    setFile(selected)
    setMediaType(type)
    setPreview(URL.createObjectURL(selected))
    setError('')
    setStep('edit')
    hapticTap()
  }, [])

  useEffect(() => {
    if (open && initialFile && initialMediaType) {
      setFile(initialFile)
      setMediaType(initialMediaType)
      setPreview(URL.createObjectURL(initialFile))
      setStep('edit')
    }
  }, [open, initialFile, initialMediaType])

  // ── CSS filter string ──
  const getFilterCSS = () => {
    const base = FILTERS.find(f => f.name === activeFilter)?.css || 'none'
    const parts = [
      `brightness(${brightness / 100})`,
      `contrast(${contrast / 100})`,
      `saturate(${saturation / 100})`,
      `sepia(${Math.max(0, warmth) / 200})`,
      `hue-rotate(${hue}deg)`,
      `blur(${fade > 0 ? fade / 20 : 0}px)`,
    ]
    if (highlights > 0) parts.push(`brightness(${1 + highlights / 200})`)
    if (shadows > 0) parts.push(`brightness(${1 - shadows / 300})`)
    const adjustments = parts.join(' ')
    return base === 'none' ? adjustments : `${base} ${adjustments}`
  }

  const getAspectStyle = () => {
    if (aspectRatio === 'original' || !preview) return {}
    const r = ASPECT_RATIOS.find(a => a.id === aspectRatio)
    if (!r || r.ratio === 0) return {}
    return { aspectRatio: `${r.ratio}`, objectFit: 'cover' as const }
  }

  // ── Upload ──
  const handleUpload = useCallback(async () => {
    if (!user || !file) return
    if (!isCloudinaryConfigured) { setError('Cloudinary is not configured.'); return }

    setUploading(true)
    setUploadProgress('Uploading...')
    setError('')

    try {
      const result = await uploadToCloudinary(file)
      setUploadProgress('Posting...')

      const captionText = sanitizeForUpload(caption)
      const musicTrackStr = selectedMusic ? JSON.stringify({ title: selectedMusic.title, artist: selectedMusic.artist, artwork: selectedMusic.artworkUrl, preview: selectedMusic.previewUrl }) : undefined
      const { error: postError } = await createStreakPost(user.uid, {
        media_url: result.secure_url,
        media_type: mediaType,
        caption: captionText || undefined,
        filter_name: activeFilter !== 'none' ? activeFilter : undefined,
        music_track: musicTrackStr,
        location: location || undefined,
      })

      if (postError) {
        setError(postError.message || 'Failed to create post')
      } else {
        resetForm()
        onClose()
        onCreated()
        toast.success('Highlight posted! Keep your streak alive!')
        playStreakSound()
        hapticSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }, [user, file, mediaType, caption, activeFilter, selectedMusic, location, preview])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop-in" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[95vh] md:max-h-[90vh] bg-surface rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden animate-slide-up">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">
          {step === 'select' ? (
            <button onClick={handleClose} className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">
              Cancel
            </button>
          ) : step === 'edit' ? (
            <button onClick={() => setStep('select')} className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span className="font-label-md text-label-md">Back</span>
            </button>
          ) : step === 'details' ? (
            <button onClick={() => setStep('edit')} className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span className="font-label-md text-label-md">Edit</span>
            </button>
          ) : (
            <div />
          )}

          <span className="font-headline-sm text-headline-sm text-on-surface">
            {step === 'select' && 'New Post'}
            {step === 'edit' && 'Edit'}
            {step === 'details' && 'New Post'}
            {step === 'share' && 'Share'}
          </span>

          {step === 'edit' && (
            <button onClick={() => { hapticTap(); setStep('details') }} className="font-label-md text-label-md text-primary font-bold hover:opacity-80 transition-opacity">
              Next
            </button>
          )}
          {step === 'details' && (
            <button onClick={() => { hapticTap(); setStep('share') }} className="font-label-md text-label-md text-primary font-bold hover:opacity-80 transition-opacity">
              Next
            </button>
          )}
          {step === 'share' && (
            <button onClick={handleUpload} disabled={uploading || !file} className="font-label-md text-label-md text-primary font-bold hover:opacity-80 transition-opacity disabled:opacity-40">
              {uploading ? 'Sharing...' : 'Share'}
            </button>
          )}
          {step === 'select' && <div className="w-12" />}
        </div>

        {/* ── Step: Select Media ── */}
        {step === 'select' && (
          <div className="p-5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { hapticTap(); cameraInputRef.current?.click() }}
                className="aspect-square rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[28px] text-on-primary-container">photo_camera</span>
                </div>
                <div className="text-center">
                  <p className="font-label-lg text-label-lg text-on-surface font-semibold">Photo</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Take a picture</p>
                </div>
              </button>

              <button
                onClick={() => { hapticTap(); videoInputRef.current?.click() }}
                className="aspect-square rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low hover:border-secondary-container hover:bg-secondary-container/5 transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[28px] text-secondary">videocam</span>
                </div>
                <div className="text-center">
                  <p className="font-label-lg text-label-lg text-on-surface font-semibold">Video</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Record a clip</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => { hapticTap(); fileInputRef.current?.click() }}
              className="w-full py-4 rounded-2xl border-2 border-outline-variant bg-surface-container-low hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-3 group"
            >
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant group-hover:text-primary transition-colors">photo_library</span>
              <span className="font-label-lg text-label-lg text-on-surface-variant group-hover:text-primary transition-colors">Choose from Gallery</span>
            </button>
          </div>
        )}

        {/* ── Step: Edit Media ── */}
        {step === 'edit' && preview && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Preview */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] max-h-[50vh]">
              {mediaType === 'video' ? (
                <video src={preview} controls playsInline className="w-full h-full object-contain" />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain transition-all duration-300"
                  style={{
                    filter: getFilterCSS(),
                    ...getAspectStyle(),
                  }}
                />
              )}
            </div>

            {/* Edit toolbar */}
            <div className="border-t border-outline-variant/30">
              {/* Mode tabs */}
              <div className="flex border-b border-outline-variant/30">
                <button
                  onClick={() => { hapticTap(); setShowAdjust(false) }}
                  className={`flex-1 py-3 font-label-md text-label-md font-semibold transition-all ${!showAdjust ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Filters
                </button>
                <button
                  onClick={() => { hapticTap(); setShowAdjust(true) }}
                  className={`flex-1 py-3 font-label-md text-label-md font-semibold transition-all ${showAdjust ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Adjust
                </button>
              </div>

              {/* Filters strip */}
              {!showAdjust && (
                <div className="flex gap-3 px-4 py-4 overflow-x-auto hide-scrollbar">
                  {FILTERS.map(f => (
                    <button
                      key={f.name}
                      onClick={() => { hapticTap(); setActiveFilter(f.name) }}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0"
                    >
                      <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeFilter === f.name ? 'border-primary shadow-brand-sm scale-105' : 'border-outline-variant/30'}`}>
                        <img
                          src={preview}
                          alt={f.label}
                          className="w-full h-full object-cover"
                          style={{ filter: f.css }}
                        />
                      </div>
                      <span className={`font-label-xs text-label-xs ${activeFilter === f.name ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{f.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Adjustments */}
              {showAdjust && (
                <div className="px-5 py-3 overflow-y-auto max-h-[200px] space-y-3 hide-scrollbar">
                  {[
                    { label: 'Brightness', value: brightness, set: setBrightness, icon: 'brightness_6', min: 50, max: 150 },
                    { label: 'Contrast', value: contrast, set: setContrast, icon: 'contrast', min: 50, max: 150 },
                    { label: 'Saturation', value: saturation, set: setSaturation, icon: 'palette', min: 0, max: 200 },
                    { label: 'Warmth', value: warmth, set: setWarmth, icon: 'thermostat', min: -50, max: 50 },
                    { label: 'Highlights', value: highlights, set: setHighlights, icon: 'light_mode', min: -50, max: 50 },
                    { label: 'Shadows', value: shadows, set: setShadows, icon: 'dark_mode', min: -50, max: 50 },
                    { label: 'Hue', value: hue, set: setHue, icon: 'colorize', min: -180, max: 180 },
                    { label: 'Fade', value: fade, set: setFade, icon: 'water_drop', min: 0, max: 50 },
                    { label: 'Grain', value: grain, set: setGrain, icon: 'grain', min: 0, max: 50 },
                  ].map(({ label, value, set, icon, min, max }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">{icon}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
                        </div>
                        <span className="font-label-xs text-label-xs text-primary font-bold">{value}{label === 'Hue' ? '°' : label === 'Fade' || label === 'Grain' ? '' : '%'}</span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => set(Number(e.target.value))}
                        className="w-full h-1.5 bg-surface-container-high rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-brand-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Aspect ratio */}
              <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-outline-variant/30">
                {ASPECT_RATIOS.map(ar => (
                  <button
                    key={ar.id}
                    onClick={() => { hapticTap(); setAspectRatio(ar.id) }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                      aspectRatio === ar.id
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{ar.icon}</span>
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Details (Caption, Music, Tags, Location) ── */}
        {step === 'details' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Mini preview */}
            {preview && (
              <div className="flex items-center gap-3 px-5 py-3 border-b border-outline-variant/30 bg-surface-container-low">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={preview} alt="" className="w-full h-full object-cover" style={{ filter: getFilterCSS() }} />
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  rows={2}
                  maxLength={500}
                  className="flex-1 bg-transparent font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none resize-none"
                />
              </div>
            )}

            {/* Options list */}
            <div className="flex-1 overflow-y-auto">
              {/* Caption (full) */}
              <div className="px-5 py-4 border-b border-outline-variant/30">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  <div className="flex gap-2">
                    <button className="text-on-surface-variant hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-[20px]">tag</span>
                    </button>
                    <button className="text-on-surface-variant hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                    </button>
                  </div>
                  <span className="font-label-xs text-label-xs text-on-surface-variant/50">{caption.length}/500</span>
                </div>
              </div>

              {/* Add Music */}
              <button
                onClick={() => { hapticTap(); setShowMusicSheet(true) }}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-on-surface-variant">music_note</span>
                  <span className="font-body-md text-body-md text-on-surface">Add Music</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMusic && (
                    <span className="font-label-sm text-label-sm text-on-surface-variant max-w-[150px] truncate">{selectedMusic.title}</span>
                  )}
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
                </div>
              </button>

              {/* Tag People */}
              <button
                onClick={() => { hapticTap(); setShowTagSheet(true) }}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-on-surface-variant">person_add</span>
                  <span className="font-body-md text-body-md text-on-surface">Tag People</span>
                </div>
                <div className="flex items-center gap-2">
                  {taggedPeople.length > 0 && (
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{taggedPeople.length} tagged</span>
                  )}
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
                </div>
              </button>

              {/* Add Location */}
              <button
                onClick={() => { hapticTap(); setShowLocationSheet(true) }}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-on-surface-variant">location_on</span>
                  <span className="font-body-md text-body-md text-on-surface">Add Location</span>
                </div>
                <div className="flex items-center gap-2">
                  {location && (
                    <span className="font-label-sm text-label-sm text-on-surface-variant max-w-[150px] truncate">{location}</span>
                  )}
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
                </div>
              </button>

              {/* Also share to */}
              <div className="px-5 py-4">
                <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Also share to</p>
                <div className="space-y-3">
                  {[
                    { icon: 'dynamic_feed', label: 'Feed', sublabel: 'Visible to all followers', enabled: true },
                    { icon: 'group', label: 'Friends Only', sublabel: 'Visible to friends only', enabled: false },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{item.icon}</span>
                        <div>
                          <p className="font-body-md text-body-md text-on-surface">{item.label}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">{item.sublabel}</p>
                        </div>
                      </div>
                      <div className={`w-10 h-6 rounded-full flex items-center transition-colors ${item.enabled ? 'bg-primary justify-end' : 'bg-outline-variant justify-start'}`}>
                        <div className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Final Share Preview ── */}
        {step === 'share' && preview && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Post preview */}
            <div className="flex-1 overflow-y-auto">
              <div className="bg-surface border-b border-outline-variant/30">
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                      <span className="font-label-md text-on-primary-container font-bold">{initials}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="font-body-md text-body-md font-semibold text-on-surface block">{displayName}</span>
                    <div className="flex items-center gap-2">
                      {location && (
                        <span className="font-label-sm text-label-sm text-primary flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="relative w-full aspect-square bg-surface-container-low">
                  <img src={preview} alt="" className="w-full h-full object-cover" style={{ filter: getFilterCSS() }} />
                  {selectedMusic && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <span className="material-symbols-outlined text-[14px] text-white animate-spin">music_note</span>
                      <span className="font-label-xs text-label-xs text-white">{selectedMusic.title}</span>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-5 mb-2">
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[22px]">favorite_border</span>
                      <span className="font-label-md text-label-md">0</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[22px]">chat_bubble_outline</span>
                      <span className="font-label-md text-label-md">0</span>
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-secondary-container">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    </span>
                  </div>
                  {caption && (
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed">{sanitizeForDisplay(caption)}</p>
                  )}
                  {selectedMusic && (
                    <div className="flex items-center gap-2 mt-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">music_note</span>
                      <span className="font-label-sm text-label-sm">{selectedMusic.title} — {selectedMusic.artist}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Share button */}
            <div className="px-5 py-4 border-t border-outline-variant/30">
              {error && (
                <div className="bg-error-container text-on-error-container px-4 py-2 rounded-xl font-label-sm text-label-sm mb-3">
                  {error}
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="w-full py-4 rounded-2xl bg-primary text-on-primary font-label-lg text-label-lg font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-brand-md"
              >
                {uploading ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    {uploadProgress}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">local_fire_department</span>
                    Share Post
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Hidden file inputs ── */}
        <input ref={cameraInputRef} type="file" accept={ACCEPTED_IMAGE} capture="environment" className="hidden" onChange={handleFileSelect} />
        <input ref={videoInputRef} type="file" accept={ACCEPTED_VIDEO} capture="environment" className="hidden" onChange={handleFileSelect} />
        <input ref={fileInputRef} type="file" accept={ACCEPTED_ALL} className="hidden" onChange={handleFileSelect} />

        {/* ── Music Sheet ── */}
        {showMusicSheet && (
          <div className="absolute inset-0 z-[110] bg-surface flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">
              <button onClick={() => { hapticTap(); setShowMusicSheet(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlayingTrackId(null) } }} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
              <span className="font-headline-sm text-headline-sm text-on-surface">Add Music</span>
              <div className="w-8" />
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant/50">search</span>
                <input
                  type="text"
                  value={musicSearch}
                  onChange={async (e) => {
                    const q = e.target.value
                    setMusicSearch(q)
                    if (q.length >= 2) {
                      setMusicLoading(true)
                      const results = await searchMusic(q)
                      setMusicResults(results)
                      setMusicLoading(false)
                    } else {
                      setMusicResults([])
                    }
                  }}
                  placeholder="Search songs, artists, albums..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                />
                {musicSearch && (
                  <button onClick={() => { setMusicSearch(''); setMusicResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Genre chips */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
              {GENRE_SEEDS.map(g => (
                <button
                  key={g.label}
                  onClick={async () => {
                    hapticTap()
                    setMusicGenre(g.label)
                    setMusicSearch(g.query)
                    setMusicLoading(true)
                    const results = await searchMusic(g.query)
                    setMusicResults(results)
                    setMusicLoading(false)
                  }}
                  className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm font-semibold flex-shrink-0 transition-all ${
                    musicGenre === g.label ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Track list */}
            <div className="flex-1 overflow-y-auto">
              {musicLoading && (
                <div className="flex justify-center py-8">
                  <span className="material-symbols-outlined text-primary animate-spin text-[28px]">progress_activity</span>
                </div>
              )}
              {!musicLoading && musicResults.length === 0 && musicSearch.length >= 2 && (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-[40px] text-on-surface-variant/30 mb-2">music_off</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">No songs found</p>
                </div>
              )}
              {!musicLoading && musicResults.length === 0 && musicSearch.length < 2 && (
                <div className="text-center py-8 px-4">
                  <span className="material-symbols-outlined text-[40px] text-on-surface-variant/30 mb-2">search</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Search for songs or pick a genre above</p>
                </div>
              )}
              {musicResults.map(track => {
                const isPlaying = playingTrackId === track.id
                const isSelected = selectedMusic?.id === track.id
                return (
                  <div
                    key={track.id}
                    className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low transition-colors ${isSelected ? 'bg-primary/10' : ''}`}
                  >
                    <button
                      onClick={() => {
                        hapticTap()
                        if (isPlaying && audioRef.current) {
                          audioRef.current.pause()
                          setPlayingTrackId(null)
                        } else {
                          if (audioRef.current) audioRef.current.pause()
                          const audio = new Audio(track.previewUrl)
                          audio.play()
                          audio.onended = () => setPlayingTrackId(null)
                          audioRef.current = audio
                          setPlayingTrackId(track.id)
                        }
                      }}
                      className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-secondary-container/20 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[20px] text-primary">
                        {isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                    <img src={track.artworkUrl} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-body-md text-body-md font-medium text-on-surface truncate">{track.title}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{track.artist} · {formatDuration(track.duration)}</p>
                    </div>
                    <button
                      onClick={() => {
                        hapticTap()
                        if (isPlaying && audioRef.current) { audioRef.current.pause(); setPlayingTrackId(null) }
                        setSelectedMusic(isSelected ? null : track)
                        if (!isSelected) toast.success(`Added "${track.title}"`)
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isSelected ? 'check' : 'add'}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>

            {selectedMusic && (
              <div className="px-5 py-3 border-t border-outline-variant/30">
                <div className="flex items-center gap-3 mb-3">
                  <img src={selectedMusic.artworkUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-label-sm text-label-sm font-medium text-on-surface truncate">{selectedMusic.title}</p>
                    <p className="font-label-xs text-xs text-on-surface-variant truncate">{selectedMusic.artist}</p>
                  </div>
                  <button
                    onClick={() => { hapticTap(); setSelectedMusic(null) }}
                    className="text-on-surface-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
                <button
                  onClick={() => { hapticTap(); setShowMusicSheet(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlayingTrackId(null) } }}
                  className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tag People Sheet ── */}
        {showTagSheet && (
          <div className="absolute inset-0 z-[110] bg-surface flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">
              <button onClick={() => { hapticTap(); setShowTagSheet(false) }} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
              <span className="font-headline-sm text-headline-sm text-on-surface">Tag People</span>
              <button onClick={() => { hapticTap(); setShowTagSheet(false) }} className="font-label-md text-label-md text-primary font-bold">Done</button>
            </div>
            <div className="p-5">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant/50">search</span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      hapticTap()
                      setTaggedPeople(prev => [...prev, tagInput.trim()])
                      setTagInput('')
                    }
                  }}
                  placeholder="Type a name and press Enter..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {taggedPeople.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {taggedPeople.map((person, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-semibold">
                      @{person}
                      <button onClick={() => { hapticTap(); setTaggedPeople(prev => prev.filter((_, j) => j !== i)) }}>
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Location Sheet ── */}
        {showLocationSheet && (
          <div className="absolute inset-0 z-[110] bg-surface flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">
              <button onClick={() => { hapticTap(); setShowLocationSheet(false) }} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
              <span className="font-headline-sm text-headline-sm text-on-surface">Add Location</span>
              <button onClick={() => { hapticTap(); setShowLocationSheet(false) }} className="font-label-md text-label-md text-primary font-bold">Done</button>
            </div>
            <div className="p-5">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant/50">location_on</span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Search for a location..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {location && (
                <div className="mt-4 space-y-2">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Suggested locations</p>
                  {['Nairobi, Kenya', 'Mombasa, Kenya', 'Kisumu, Kenya', 'Eldoret, Kenya'].filter(l => l.toLowerCase().includes(location.toLowerCase())).map(l => (
                    <button
                      key={l}
                      onClick={() => { hapticTap(); setLocation(l); setShowLocationSheet(false) }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">location_on</span>
                      <span className="font-body-md text-body-md text-on-surface">{l}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 z-[120]">
            <span className="material-symbols-outlined text-[48px] text-white animate-spin">progress_activity</span>
            <span className="font-label-lg text-label-lg text-white">{uploadProgress}</span>
          </div>
        )}
      </div>
    </div>
  )
}
