import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'lb_install_dismissed'
const INSTALLED_KEY = 'lb_install_installed'

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(INSTALLED_KEY)) {
      setIsInstalled(true)
      return
    }

    if (localStorage.getItem(DISMISSED_KEY)) {
      const dismissedAt = parseInt(localStorage.getItem(DISMISSED_KEY) || '0', 10)
      const hoursSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60)
      if (hoursSinceDismissed < 24) return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      localStorage.setItem(INSTALLED_KEY, 'true')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  useEffect(() => {
    if (!showPrompt) return
    const timer = setTimeout(() => setShowPrompt(false), 15000)
    return () => clearTimeout(timer)
  }, [showPrompt])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, 'true')
    }
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    setShowPrompt(false)
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Install app">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />

      <div className="relative w-full max-w-lg bg-surface rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-500 z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-primary/20">
          <img src="/logo.svg" alt="LB" className="w-full h-full" />
        </div>

        <div className="text-center mt-6 mb-5">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Install Future Lawyer</h3>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Add to your home screen for the full experience. Faster access, offline support, and streak reminders.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            aria-label="Install Future Lawyer app"
            onClick={handleInstall}
            className="w-full py-4 rounded-2xl bg-primary text-on-primary font-label-md text-label-md font-bold hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            Install App
          </button>
          <button
            aria-label="Dismiss install prompt"
            onClick={handleDismiss}
            className="w-full py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-low transition-colors"
          >
            Not now
          </button>
        </div>

        {isIOS() && (
          <div className="mt-4 bg-surface-container-low rounded-xl p-4">
            <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
              On iOS: Tap <span className="font-bold">Share</span> then <span className="font-bold">Add to Home Screen</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
