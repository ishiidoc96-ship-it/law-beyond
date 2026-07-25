import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { pb } from '../lib/pb'
import { getProfile, upsertProfile, type DbProfile } from '../lib/api'
import type { RecordModel } from 'pocketbase'

interface AuthContextValue {
  user: RecordModel | null
  profile: DbProfile | null
  loading: boolean
  configured: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signInWithGoogle: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<DbProfile>) => Promise<{ error?: string }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true, configured: false,
  signUp: async () => ({}), signIn: async () => ({}), signInWithGoogle: async () => ({}), signOut: async () => {},
  updateProfile: async () => ({}), refreshProfile: async () => {},
})

export function useAuth() { return useContext(AuthContext) }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RecordModel | null>(null)
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const configured = !!import.meta.env.VITE_POCKETBASE_URL || pb.baseUrl !== ''

  // Load profile when user changes
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await getProfile(userId)
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }, [])

  // Listen for auth changes
  useEffect(() => {
    // Set initial state from stored auth
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pb.authStore.record)
      loadProfile(pb.authStore.record.id)
    }
    setLoading(false)

    // Subscribe to auth changes
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record)
      if (record) {
        loadProfile(record.id)
      } else {
        setProfile(null)
      }
    })

    return () => unsubscribe()
  }, [loadProfile])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      await pb.collection('users').create({ email, password, passwordConfirm: password, name: fullName })
      // Auto sign in after signup
      await pb.collection('users').authWithPassword(email, password)
      // Create profile
      const userId = pb.authStore.record?.id
      if (userId) {
        await upsertProfile(userId, { full_name: fullName, email })
      }
      return {}
    } catch (e: any) {
      return { error: e?.message || 'Sign up failed' }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return {}
    } catch (e: any) {
      return { error: e?.message || 'Sign in failed' }
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' })
      // Auto-create profile if new user
      if (authData?.record?.id) {
        const existingProfile = await getProfile(authData.record.id).catch(() => null)
        if (!existingProfile?.data) {
          await upsertProfile(authData.record.id, {
            full_name: authData.record.name || authData.record.username || '',
            email: authData.record.email || '',
            avatar_url: authData.record.avatarUrl || '',
          }).catch(() => {})
        }
      }
      return {}
    } catch (e: any) {
      return { error: e?.message || 'Google sign-in failed' }
    }
  }, [])

  const signOut = useCallback(async () => {
    pb.authStore.clear()
    setUser(null)
    setProfile(null)
  }, [])

  const updateProfile = useCallback(async (data: Partial<DbProfile>) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      const { error } = await upsertProfile(user.id, data)
      if (error) return { error: error.message }
      await loadProfile(user.id)
      return {}
    } catch (e: any) {
      return { error: e?.message || 'Update failed' }
    }
  }, [user, loadProfile])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id)
  }, [user, loadProfile])

  return (
    <AuthContext.Provider value={{ user, profile, loading, configured, signUp, signIn, signInWithGoogle, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
