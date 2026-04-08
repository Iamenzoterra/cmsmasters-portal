import { lazy, Suspense } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { RequireAuth } from '@cmsmasters/auth'
import { Agentation } from 'agentation'
import { supabase } from './lib/supabase'
import { AppLayout } from './layouts/app-layout'
import { AuthLayout } from './layouts/auth-layout'
import { LoginPage } from './pages/login'
import { AuthCallback } from './pages/auth-callback'
import { NotFound } from './pages/not-found'
import { ErrorBoundary } from './components/error-boundary'

// Lazy-loaded page components (code-splitting)
const ThemesList = lazy(() => import('./pages/themes-list').then(m => ({ default: m.ThemesList })))
const ThemeEditor = lazy(() => import('./pages/theme-editor').then(m => ({ default: m.ThemeEditor })))
const MediaPage = lazy(() => import('./pages/media').then(m => ({ default: m.MediaPage })))
const BlocksList = lazy(() => import('./pages/blocks-list').then(m => ({ default: m.BlocksList })))
const BlockEditor = lazy(() => import('./pages/block-editor').then(m => ({ default: m.BlockEditor })))
const ThemeMeta = lazy(() => import('./pages/theme-meta').then(m => ({ default: m.ThemeMeta })))
const TemplatesList = lazy(() => import('./pages/templates-list').then(m => ({ default: m.TemplatesList })))
const TemplateEditor = lazy(() => import('./pages/template-editor').then(m => ({ default: m.TemplateEditor })))
const PagesList = lazy(() => import('./pages/pages-list').then(m => ({ default: m.PagesList })))
const PageEditor = lazy(() => import('./pages/page-editor').then(m => ({ default: m.PageEditor })))
const GlobalElementsSettings = lazy(() => import('./pages/global-elements-settings').then(m => ({ default: m.GlobalElementsSettings })))
const ElementsList = lazy(() => import('./pages/elements-list').then(m => ({ default: m.ElementsList })))
const SlotsList = lazy(() => import('./pages/slots-list').then(m => ({ default: m.SlotsList })))

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

function LayoutsList() {
  return <PagesList filterType="layout" title="Layouts" createLabel="Create Layout" createPath="/layouts/new" editPath="/layouts" />
}

function StaticPagesList() {
  return <PagesList filterType="composed" title="Static Pages" createLabel="Create Page" createPath="/static-pages/new" editPath="/static-pages" />
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
        {/* Themes group */}
        <Route index element={<ThemesList />} />
        <Route path="/themes/new" element={<ThemeEditor />} />
        <Route path="/themes/:slug" element={<ThemeEditor />} />
        <Route path="/theme-meta" element={<ThemeMeta />} />
        <Route path="/blocks" element={<BlocksList />} />
        <Route path="/blocks/new" element={<BlockEditor />} />
        <Route path="/blocks/:id" element={<BlockEditor />} />
        <Route path="/templates" element={<TemplatesList />} />
        <Route path="/templates/new" element={<TemplateEditor />} />
        <Route path="/templates/:id" element={<TemplateEditor />} />

        {/* Pages group */}
        <Route path="/layouts" element={<LayoutsList />} />
        <Route path="/layouts/new" element={<PageEditor />} />
        <Route path="/layouts/:id" element={<PageEditor />} />
        <Route path="/static-pages" element={<StaticPagesList />} />
        <Route path="/static-pages/new" element={<PageEditor />} />
        <Route path="/static-pages/:id" element={<PageEditor />} />
        <Route path="/slots" element={<SlotsList />} />
        <Route path="/global-elements" element={<GlobalElementsSettings />} />
        <Route path="/global-elements/new" element={<BlockEditor />} />
        <Route path="/global-elements/:id" element={<BlockEditor />} />
        <Route path="/elements" element={<ElementsList />} />
        <Route path="/elements/new" element={<BlockEditor />} />
        <Route path="/elements/:id" element={<BlockEditor />} />

        {/* Standalone */}
        <Route path="/media" element={<MediaPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  )
}
