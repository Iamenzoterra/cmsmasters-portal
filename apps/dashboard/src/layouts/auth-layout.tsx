import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ backgroundColor: 'hsl(var(--bg-page))' }}
    >
      <Outlet />
    </div>
  )
}
