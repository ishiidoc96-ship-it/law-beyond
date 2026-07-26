import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getProfile, upsertProfile, type DbProfile } from '../lib/api'

interface AuthContextValue {
  user: FirebaseUser | null
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
  user: null, profile: null, loading: true, configured: true,
  signUp: async () => ({}), signIn: async () => ({}), signInWithGoogle: async () => ({}), signOut: async () => {},
  updateProfile: async () => ({}), refreshProfile: async () => {},
})

export function useAuth() { return useContext(AuthContext) }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const configured = true // Firebase config is always present

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await getProfile(userId)
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        loadProfile(firebaseUser.uid)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [loadProfile])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      // Create user doc in Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        email, name: fullName, createdAt: serverTimestamp(),
      })
      // Create profile
      await upsertProfile(cred.user.uid, { full_name: fullName, email })
      return {}
    } catch (e: any) {
      return { error: e?.message || 'Sign up failed' }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return {}
    } catch (e: any) {
      return { error: e?.message || 'Sign in failed' }
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(auth, provider)
      // Auto-create profile if new user
      const existingProfile = await getProfile(cred.user.uid).catch(() => null)
      if (!existingProfile?.data) {
        await upsertProfile(cred.user.uid, {
          full_name: cred.user.displayName || '',
          email: cred.user.email || '',
          avatar_url: cred.user.photoURL || '',
        }).catch(() => {})
      }
      return {}
    } catch (e: any) {
      return { error: e?.message || 'Google sign-in failed' }
    }
  }, [])

  const signOut = useCallback(async () => {
    await auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const updateProfile = useCallback(async (data: Partial<DbProfile>) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      const { error } = await upsertProfile(user.uid, data)
      if (error) return { error: error.message }
      await loadProfile(user.uid)
      return {}
    } catch (e: any) {
      return { error: e?.message || 'Update failed' }
    }
  }, [user, loadProfile])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.uid)
  }, [user, loadProfile])

  return (
    <AuthContext.Provider value={{ user, profile, loading, configured, signUp, signIn, signInWithGoogle, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
