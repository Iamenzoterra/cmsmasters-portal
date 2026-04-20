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
const MyAccount = lazy(() => import('./pages/my-account').then(m => ({ default: m.MyAccount })))
const Licenses = lazy(() => import('./pages/licenses').then(m => ({ default: m.Licenses })))
const Support = lazy(() => import('./pages/support').then(m => ({ default: m.Support })))
const Downloads = lazy(() => import('./pages/downloads').then(m => ({ default: m.Downloads })))

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
        <Route path="/account" element={<MyAccount />} />
        <Route path="/licenses" element={<Licenses />} />
        <Route path="/support" element={<Support />} />
        <Route path="/downloads" element={<Downloads />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
