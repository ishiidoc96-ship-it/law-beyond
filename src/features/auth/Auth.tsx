import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Auth() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showSignUpSuccess, setShowSignUpSuccess] = useState(false)
  const { signIn, signUp, user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, fullName)

    if (result.error) {
      setError(result.error)
    } else if (!isLogin) {
      setShowSignUpSuccess(true)
      setTimeout(() => navigate('/onboarding'), 2000)
    }

    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      // PocketBase supports OAuth - redirect to OAuth provider
      // For now, show a message that Google OAuth needs PocketBase OAuth config
      setError('Google sign-in requires OAuth configuration in PocketBase. Please use email/password.')
    } catch {
      setError('Google sign-in is not available yet')
    }
    setLoading(false)
  }

  if (showSignUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-2xl bg-success-container/50 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[40px] text-on-success-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Account Created!</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Welcome to Future Lawyer! Redirecting you...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-brand-md">
            <span className="material-symbols-outlined text-[32px] text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1">Future Lawyer</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{isLogin ? 'Welcome back!' : 'Create your account'}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@email.com"
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-container-low border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-error-container/50 text-on-error-container px-4 py-3 rounded-xl font-label-sm text-label-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-brand-md"
          >
            {loading ? (
              <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-outline-variant/30" />
          <span className="font-label-sm text-label-sm text-on-surface-variant/50">or</span>
          <div className="flex-1 h-px bg-outline-variant/30" />
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 rounded-xl border-2 border-outline-variant/50 bg-surface hover:bg-surface-container-low font-label-md text-label-md text-on-surface font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Toggle login/signup */}
        <div className="text-center mt-6">
          <button
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            className="font-body-md text-body-md text-primary hover:text-primary/80 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
