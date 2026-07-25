// Haptic feedback utility using the Vibration API
// Provides consistent tactile feedback across the app

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection'

const patterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 20],
  error: [30, 50, 30],
  selection: 5,
}

export function haptic(style: HapticStyle = 'light') {
  if (!('vibrate' in navigator)) return
  navigator.vibrate(patterns[style])
}

// Button press feedback
export function hapticTap() {
  haptic('light')
}

// Toggle / switch
export function hapticToggle() {
  haptic('selection')
}

// Success action (like, post, complete)
export function hapticSuccess() {
  haptic('success')
}

// Error feedback
export function hapticError() {
  haptic('error')
}

// Navigation tap
export function hapticNav() {
  haptic('light')
}

// Long press
export function hapticLongPress() {
  haptic('medium')
}
