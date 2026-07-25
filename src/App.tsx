import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import Layout from './components/layout/Layout'
import PageTransition from './components/ui/PageTransition'
import InstallPrompt from './components/ui/InstallPrompt'
import Onboarding from './features/auth/Onboarding'
import Auth from './features/auth/Auth'
import Terms from './features/legal/Terms'
import HomeDashboard from './features/dashboard/HomeDashboard'
import Planner from './features/planner/Planner'
import BudgetTracker from './features/budget/BudgetTracker'
import Journal from './features/journal/Journal'
import HabitTracker from './features/habits/HabitTracker'
import Profile from './features/profile/Profile'
import Streaks from './features/streaks/Streaks'
import NotificationsPage from './features/notifications/NotificationsPage'
import { Toaster } from 'sonner'

// Error Boundary for graceful error handling
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: Error) { console.error('App ErrorBoundary:', err) }
  render() { return this.state.hasError ? <div className="min-h-screen flex items-center justify-center bg-background p-5"><div className="max-w-md w-full text-center space-y-4"><img src="/logo.svg" alt="LB" className="w-16 h-16 rounded-2xl mx-auto" /><h1 className="font-headline-lg text-headline-lg text-on-surface">Something went wrong</h1><p className="font-body-md text-body-md text-on-surface-variant">We're working on fixing this. Please refresh the page.</p><button onClick={() => window.location.reload()} className="py-3 px-6 rounded-xl bg-primary text-on-primary font-label-lg font-bold hover:shadow-md transition-all">Refresh Page</button></div></div> : this.props.children }
}

function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-5">
      <div className="max-w-md w-full text-center space-y-4">
        <img src="/logo.svg" alt="LB" className="w-16 h-16 rounded-2xl mx-auto" />
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Future Lawyer</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Configure your Supabase environment to get started.</p>
        <div className="bg-surface border border-outline-variant/50 rounded-2xl p-5 text-left space-y-3">
          <p className="font-label-md text-label-md text-on-surface font-semibold">Steps:</p>
          <ol className="font-body-md text-body-md text-on-surface-variant space-y-2 list-decimal list-inside">
            <li>Create a project at <a href="https://supabase.com" target="_blank" className="text-primary underline">supabase.com</a></li>
            <li>Go to Project Settings → API</li>
            <li>Copy the Project URL and Anon Key</li>
            <li>Create <code className="bg-surface-container-high px-1 rounded text-sm">.env</code> file with:</li>
          </ol>
          <pre className="bg-surface-container-high p-3 rounded-xl text-sm text-on-surface overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
          </pre>
          <ol className="font-body-md text-body-md text-on-surface-variant space-y-2 list-decimal list-inside" start={5}>
            <li>Run the SQL in <code className="bg-surface-container-high px-1 rounded text-sm">supabase/schema.sql</code> in the SQL Editor</li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="material-symbols-outlined text-primary animate-spin text-[48px]">progress_activity</span></div>
  if (!configured) return <SetupNotice />
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<PageTransition><HomeDashboard /></PageTransition>} />
        <Route path="planner" element={<PageTransition><Planner /></PageTransition>} />
        <Route path="budget" element={<PageTransition><BudgetTracker /></PageTransition>} />
        <Route path="journal" element={<PageTransition><Journal /></PageTransition>} />
        <Route path="habits" element={<PageTransition><HabitTracker /></PageTransition>} />
        <Route path="streaks" element={<PageTransition><Streaks /></PageTransition>} />
        <Route path="notifications" element={<PageTransition><NotificationsPage /></PageTransition>} />
        <Route path="profile" element={<PageTransition><Profile /></PageTransition>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
            <InstallPrompt />
            <Toaster
              position="top-center"
              richColors
              closeButton
              duration={4000}
              toastOptions={{
                style: {
                  fontFamily: 'var(--font-body-md)',
                  borderRadius: '16px',
                  padding: '12px 16px',
                },
              }}
            />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
