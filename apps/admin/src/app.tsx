import { lazy } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { RequireAuth } from '@cmsmasters/auth'
import { supabase } from './lib/supabase'
import { AppLayout } from './layouts/app-layout'
import { AuthLayout } from './layouts/auth-layout'
import { LoginPage } from './pages/login'
import { AuthCallback } from './pages/auth-callback'
import { NotFound } from './pages/not-found'

const Overview = lazy(() => import('./pages/overview'))
const Staff = lazy(() => import('./pages/staff'))
const UserList = lazy(() => import('./pages/user-list'))
const UserInspector = lazy(() => import('./pages/user-inspector'))
const AuditLog = lazy(() => import('./pages/audit-log'))
const SystemHealth = lazy(() => import('./pages/system-health'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <RequireAuth
      client={supabase}
      allowedRoles={['admin']}
      onUnauthorized={() => navigate('/login', { replace: true })}
      onForbidden={() => navigate('/login', { replace: true })}
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
        <Route index element={<Overview />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/users" element={<UserList />} />
        <Route path="/users/:id" element={<UserInspector />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/health" element={<SystemHealth />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
