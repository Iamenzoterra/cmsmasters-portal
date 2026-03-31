import { Routes, Route, useNavigate } from 'react-router-dom'
import { RequireAuth } from '@cmsmasters/auth'
import { Agentation } from 'agentation'
import { supabase } from './lib/supabase'
import { AppLayout } from './layouts/app-layout'
import { AuthLayout } from './layouts/auth-layout'
import { LoginPage } from './pages/login'
import { AuthCallback } from './pages/auth-callback'
import { ThemesList } from './pages/themes-list'
import { ThemeEditor } from './pages/theme-editor'
import { MediaPage } from './pages/media'
import { BlocksList } from './pages/blocks-list'
import { BlockEditor } from './pages/block-editor'
import { NotFound } from './pages/not-found'
import { ErrorBoundary } from './components/error-boundary'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <RequireAuth
      client={supabase}
      allowedRoles={['content_manager', 'admin']}
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
    <>
      {process.env.NODE_ENV === 'development' && (
        <Agentation endpoint="http://localhost:4747" />
      )}
      <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>
      <Route
        element={
          <ProtectedRoute>
            <ErrorBoundary>
              <AppLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<ThemesList />} />
        <Route path="/themes/new" element={<ThemeEditor />} />
        <Route path="/themes/:slug" element={<ThemeEditor />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/blocks" element={<BlocksList />} />
        <Route path="/blocks/new" element={<BlockEditor />} />
        <Route path="/blocks/:id" element={<BlockEditor />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  )
}
