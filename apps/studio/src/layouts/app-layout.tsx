import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/sidebar'
import { Topbar } from '../components/topbar'

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex flex-1 flex-col overflow-y-auto"
          style={{
            backgroundColor: 'hsl(var(--bg-page))',
            padding: 'var(--spacing-3xl) var(--spacing-4xl)',
            gap: 'var(--spacing-sm)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
