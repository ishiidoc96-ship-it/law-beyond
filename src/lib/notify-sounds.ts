// Notification sounds using Web Audio API
// No external files needed — generates tones programmatically

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // Audio not available
  }
}

// ── Notification sounds ──

export function playStreakSound() {
  // Rising two-tone: da-ding!
  playTone(523.25, 0.12, 'sine', 0.25) // C5
  setTimeout(() => playTone(659.25, 0.2, 'sine', 0.3), 120) // E5
}

export function playLikeSound() {
  // Quick soft pop
  playTone(880, 0.08, 'sine', 0.2) // A5
}

export function playCommentSound() {
  // Two quick notes
  playTone(659.25, 0.08, 'triangle', 0.2) // E5
  setTimeout(() => playTone(783.99, 0.12, 'triangle', 0.25), 80) // G5
}

export function playReminderSound() {
  // Attention-getting: three ascending tones
  playTone(440, 0.15, 'sine', 0.25) // A4
  setTimeout(() => playTone(554.37, 0.15, 'sine', 0.3), 200) // C#5
  setTimeout(() => playTone(659.25, 0.25, 'sine', 0.35), 400) // E5
}

export function playFriendSound() {
  // Friendly chirp
  playTone(783.99, 0.1, 'sine', 0.2) // G5
  setTimeout(() => playTone(1046.50, 0.15, 'sine', 0.25), 100) // C6
}

export function playSuccessSound() {
  // Success: three quick ascending
  playTone(523.25, 0.08, 'triangle', 0.2) // C5
  setTimeout(() => playTone(659.25, 0.08, 'triangle', 0.2), 80) // E5
  setTimeout(() => playTone(783.99, 0.15, 'triangle', 0.25), 160) // G5
}
