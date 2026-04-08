import { lazy } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { RequireAuth } from '@cmsmasters/auth'
import { supabase } from './lib/supabase'
import { AppLayout } from './layouts/app-layout'
import { AuthLayout } from './layouts/auth-layout'
import { LoginPage } from './pages/login'
import { AuthCallback } from './pages/auth-callback'
import { NotFound } from './pages/not-found'

// Lazy routes from day 1 (lesson from Studio 841KB bundle)
const MyThemes = lazy(() => import('./pages/my-themes').then(m => ({ default: m.MyThemes })))
const ThemeDetail = lazy(() => import('./pages/theme-detail').then(m => ({ default: m.ThemeDetail })))
const Licenses = lazy(() => import('./pages/licenses').then(m => ({ default: m.Licenses })))
const Settings = lazy(() => import('./pages/settings').then(m => ({ default: m.Settings })))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <RequireAuth
      client={supabase}
      onUnauthorized={() => navigate('/login', { replace: true })}
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Loading...</p>
        </div>
      }
    >
      {children}
    </RequireAuth>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MyThemes />} />
        <Route path="/themes/:slug" element={<ThemeDetail />} />
        <Route path="/licenses" element={<Licenses />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
