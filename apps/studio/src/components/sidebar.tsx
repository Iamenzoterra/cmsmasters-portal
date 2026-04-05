import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Boxes, LayoutTemplate, Image, FileText, Layout, Globe, Component, ChevronDown, HelpCircle, LogOut, Tag } from 'lucide-react'
import { signOut } from '@cmsmasters/auth'
import { supabase } from '../lib/supabase'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  end?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Themes',
    items: [
      { to: '/', label: 'Themes', icon: LayoutGrid, end: true },
      { to: '/theme-meta', label: 'Theme Meta', icon: Tag },
      { to: '/blocks', label: 'Theme Blocks', icon: Boxes },
      { to: '/templates', label: 'Templates', icon: LayoutTemplate },
    ],
  },
  {
    label: 'Pages',
    items: [
      { to: '/layouts', label: 'Layouts', icon: Layout },
      { to: '/static-pages', label: 'Static Pages', icon: FileText },
      { to: '/global-elements', label: 'Global Elements', icon: Globe },
      { to: '/elements', label: 'Elements', icon: Component },
    ],
  },
]

const standaloneItems: NavItem[] = [
  { to: '/media', label: 'Media', icon: Image },
]

function NavGroupSection({ group, isActive }: { group: NavGroup; isActive: boolean }) {
  const [open, setOpen] = useState(isActive)

  return (
    <div className="flex flex-col" style={{ gap: '2px' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between border-0 bg-transparent"
        style={{
          padding: '4px var(--spacing-sm)',
          cursor: 'pointer',
          borderRadius: 'var(--radius)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-xs-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
            color: isActive
              ? 'hsl(var(--text-primary))'
              : 'hsl(var(--text-muted))',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {group.label}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'hsl(var(--text-muted))',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }}
        />
      </button>
      {open && group.items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex items-center gap-2 no-underline"
          style={({ isActive: linkActive }) => ({
            height: '36px',
            padding: '0 var(--spacing-sm)',
            borderRadius: 'var(--radius)',
            backgroundColor: linkActive ? 'hsl(var(--bg-surface-alt))' : 'transparent',
            color: linkActive
              ? 'hsl(var(--text-primary))'
              : 'hsl(var(--text-secondary))',
            fontWeight: linkActive ? 500 : 400,
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
          })}
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </div>
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await signOut(supabase)
    navigate('/login', { replace: true })
  }

  function isGroupActive(group: NavGroup) {
    return group.items.some(({ to, end }) => {
      if (end) return location.pathname === to
      return location.pathname.startsWith(to)
    })
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
      <nav className="flex flex-1 flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        {navGroups.map((group) => (
          <NavGroupSection key={group.label} group={group} isActive={isGroupActive(group)} />
        ))}

        {/* Standalone items */}
        <div className="flex flex-col" style={{ gap: '2px' }}>
          {standaloneItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-2 no-underline"
              style={({ isActive }) => ({
                height: '36px',
                padding: '0 var(--spacing-sm)',
                borderRadius: 'var(--radius)',
                backgroundColor: isActive ? 'hsl(var(--bg-surface-alt))' : 'transparent',
                color: isActive
                  ? 'hsl(var(--text-primary))'
                  : 'hsl(var(--text-secondary))',
                fontWeight: isActive ? 500 : 400,
                fontSize: 'var(--text-sm-font-size)',
                lineHeight: 'var(--text-sm-line-height)',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>
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
