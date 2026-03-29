import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, Image, HelpCircle, LogOut } from 'lucide-react'
import { signOut } from '@cmsmasters/auth'
import { supabase } from '../lib/supabase'

const navItems = [
  { to: '/', label: 'Themes', icon: LayoutGrid },
  { to: '/media', label: 'Media', icon: Image },
]

export function Sidebar() {
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut(supabase)
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className="flex h-full flex-col border-r"
      style={{
        width: '220px',
        borderColor: 'hsl(var(--border-default))',
        backgroundColor: 'hsl(var(--bg-surface))',
        padding: 'var(--spacing-lg) var(--spacing-md)',
      }}
    >
      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex items-center gap-2 no-underline"
            style={({ isActive }) => ({
              height: '40px',
              padding: '0 var(--spacing-sm)',
              borderRadius: 'var(--radius)',
              backgroundColor: isActive ? 'hsl(var(--bg-surface-alt))' : 'transparent',
              color: isActive
                ? 'hsl(var(--text-primary))'
                : 'hsl(var(--text-secondary))',
              fontWeight: isActive ? 500 : 400,
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontFamily: "'Manrope', sans-serif",
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col" style={{ gap: 'var(--spacing-2xs)' }}>
        <div style={{ height: '1px', backgroundColor: 'hsl(var(--border-default))' }} />
        <div style={{ height: '8px' }} />

        <a
          href="https://cmsmasters.net/support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 no-underline"
          style={{
            height: '40px',
            padding: '0 var(--spacing-sm)',
            borderRadius: 'var(--radius)',
            color: 'hsl(var(--text-secondary))',
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          <HelpCircle size={18} />
          Help
        </a>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 border-0 bg-transparent"
          style={{
            height: '40px',
            padding: '0 var(--spacing-sm)',
            borderRadius: 'var(--radius)',
            color: 'hsl(var(--text-secondary))',
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            fontFamily: "'Manrope', sans-serif",
            cursor: 'pointer',
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  )
}
