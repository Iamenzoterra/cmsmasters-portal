import { NavLink } from 'react-router-dom'
import { signOut } from '@cmsmasters/auth'
import { supabase } from '../lib/supabase'

const navItems = [
  { to: '/', label: 'My Themes', end: true },
  { to: '/licenses', label: 'Licenses' },
  { to: '/settings', label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside
      className="flex shrink-0 flex-col overflow-y-auto border-r"
      style={{
        width: '220px',
        borderColor: 'hsl(var(--border-default))',
        backgroundColor: 'hsl(var(--bg-surface))',
      }}
    >
      <nav
        className="flex flex-1 flex-col"
        style={{ padding: 'var(--spacing-sm)', gap: 'var(--spacing-2xs)' }}
      >
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block rounded-md ${isActive ? 'font-medium' : ''}`
            }
            style={({ isActive }) => ({
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              color: isActive
                ? 'hsl(var(--text-primary))'
                : 'hsl(var(--text-secondary))',
              backgroundColor: isActive
                ? 'hsl(var(--bg-surface-alt))'
                : 'transparent',
              textDecoration: 'none',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div
        className="border-t"
        style={{
          padding: 'var(--spacing-sm)',
          borderColor: 'hsl(var(--border-default))',
        }}
      >
        <button
          onClick={() => signOut(supabase)}
          className="w-full rounded-md border-0 bg-transparent text-left"
          style={{
            padding: 'var(--spacing-xs) var(--spacing-sm)',
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            color: 'hsl(var(--text-secondary))',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
