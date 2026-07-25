import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const slides = [
  {
    icon: 'task_alt',
    title: 'Organize your academic life.',
    desc: 'Stay on top of deadlines, readings, and study groups with our focused digital planner.',
    color: 'primary',
  },
  {
    icon: 'local_fire_department',
    title: 'Build habits that shape your future.',
    desc: 'Track your daily routines and build the discipline required for legal practice.',
    color: 'error',
  },
  {
    icon: 'auto_stories',
    title: 'Manage your finances and reflect every day.',
    desc: 'Keep your budget in check and maintain a clear mind with daily journaling.',
    color: 'secondary',
  },
  {
    icon: 'group',
    title: 'Connect with fellow law students.',
    desc: 'Build streaks with friends, share highlights, and stay motivated together.',
    color: 'tertiary',
  },
]

export default function Onboarding() {
  const [activeSlide, setActiveSlide] = useState(0)
  const navigate = useNavigate()

  const nextSlide = () => {
    if (activeSlide < slides.length - 1) {
      setActiveSlide(prev => prev + 1)
    } else {
      navigate('/auth')
    }
  }

  const prevSlide = () => {
    if (activeSlide > 0) setActiveSlide(prev => prev - 1)
  }

  const slide = slides[activeSlide]
  const progress = ((activeSlide + 1) / slides.length) * 100

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-20 -right-20 w-80 h-80 bg-secondary-container/5 rounded-full blur-[100px]" />
      </div>

      <main className="flex-1 flex flex-col z-10 p-6 relative">
        {/* Logo */}
        <div className="w-full pt-8 pb-4 flex justify-center">
          <img src="/logo.svg" alt="LB" className="w-14 h-14 rounded-2xl shadow-lg" />
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-xs text-label-xs text-on-surface-variant">
              {activeSlide + 1} of {slides.length}
            </span>
            <button
              onClick={() => navigate('/auth')}
              className="font-label-xs text-label-xs text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
            >
              Skip
            </button>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div key={activeSlide} className="animate-scale-in">
            <div className="text-center mb-8">
              <div className={`w-24 h-24 rounded-3xl bg-${slide.color}-container/30 flex items-center justify-center mx-auto mb-6 shadow-brand-md`}>
                <span className={`material-symbols-outlined text-[48px] text-on-${slide.color}-container`}>{slide.icon}</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-3 tracking-tight">
                {slide.title}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                {slide.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center items-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeSlide ? 'w-8 bg-primary' : 'w-2 bg-outline-variant hover:bg-outline'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex flex-col gap-3 w-full max-w-md mx-auto pb-8">
          <button
            onClick={nextSlide}
            className="w-full py-4 rounded-2xl bg-primary text-on-primary font-label-md text-label-md font-bold uppercase tracking-wider transition-all active:scale-[0.98] shadow-brand-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {activeSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </button>
          {activeSlide > 0 && (
            <button
              onClick={prevSlide}
              className="w-full py-3 text-on-surface-variant font-label-md text-label-md hover:text-on-surface transition-colors"
            >
              Back
            </button>
          )}
          {activeSlide === 0 && (
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3 text-on-surface-variant font-label-md text-label-md hover:text-on-surface transition-colors"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
