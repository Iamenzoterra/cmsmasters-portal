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
import { ThemeMeta } from './pages/theme-meta'
import { TemplatesList } from './pages/templates-list'
import { TemplateEditor } from './pages/template-editor'
import { PagesList } from './pages/pages-list'
import { PageEditor } from './pages/page-editor'
import { GlobalElementsSettings } from './pages/global-elements-settings'
import { ElementsList } from './pages/elements-list'
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
