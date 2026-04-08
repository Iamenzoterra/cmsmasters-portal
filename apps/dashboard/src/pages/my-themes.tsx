import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@cmsmasters/auth'
import { getUserLicenses } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
import { supabase } from '../lib/supabase'
import { ThemeCard, type LicenseWithTheme } from '../components/theme-card'

export function MyThemes() {
  const { authState } = useUser(supabase)
  const navigate = useNavigate()
  const [licenses, setLicenses] = useState<LicenseWithTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authState.status !== 'authenticated') return
    let cancelled = false

    getUserLicenses(supabase, authState.userId)
      .then(data => {
        if (!cancelled) setLicenses(data as unknown as LicenseWithTheme[])
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authState])

  // Derive bundled plugins from all license themes
  const bundledPlugins = licenses.reduce<{ name: string; themes: string[] }[]>(
    (acc, license) => {
      const plugins = license.themes?.meta?.compatible_plugins ?? []
      const themeName = license.themes?.meta?.name ?? 'Unknown'
      for (const plugin of plugins) {
        const existing = acc.find(p => p.name === plugin)
        if (existing) {
          if (!existing.themes.includes(themeName)) existing.themes.push(themeName)
        } else {
          acc.push({ name: plugin, themes: [themeName] })
        }
      }
      return acc
    },
    [],
  )

  // Count active support
  const activeSupportCount = licenses.filter(
    l => l.support_until && new Date(l.support_until) > new Date(),
  ).length

  if (authState.status === 'loading' || loading) {
    return (
      <div style={{ color: 'hsl(var(--text-secondary))' }}>
        <p style={{ fontSize: 'var(--text-sm-font-size)' }}>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <p
          style={{
            fontSize: 'var(--text-sm-font-size)',
            color: 'hsl(var(--status-error-fg))',
          }}
        >
          Error loading themes: {error}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <h1
        style={{
          fontSize: 'var(--h4-font-size)',
          lineHeight: 'var(--h4-line-height)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
          margin: 0,
        }}
      >
        My themes
      </h1>
      <p
        style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-secondary))',
          marginTop: 'var(--spacing-2xs)',
          marginBottom: 'var(--spacing-2xl)',
        }}
      >
        Your registered themes, activations, support status, and bundled resources
      </p>

      {/* Theme list or empty state */}
      {licenses.length === 0 ? (
        <div
          style={{
            backgroundColor: 'hsl(var(--card-bg))',
            border: '1px solid hsl(var(--card-border))',
            borderRadius: 'var(--rounded-xl)',
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
              margin: 0,
            }}
          >
            No themes registered yet
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-muted))',
              marginTop: 'var(--spacing-xs)',
            }}
          >
            Add your first theme by entering a ThemeForest purchase code or registering an Envato
            Elements theme.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {licenses.map(license => (
            <ThemeCard key={license.id} license={license} />
          ))}
        </div>
      )}

      {/* Bottom panels — 2-column grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--spacing-sm)',
          marginTop: 'var(--spacing-xl)',
        }}
      >
        {/* Bundled plugins panel */}
        <div
          style={{
            backgroundColor: 'hsl(var(--card-bg))',
            border: '1px solid hsl(var(--card-border))',
            borderRadius: 'var(--rounded-xl)',
            padding: 'var(--spacing-md)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
              margin: 0,
              marginBottom: 'var(--spacing-sm)',
            }}
          >
            Bundled plugins
          </h2>
          {bundledPlugins.length === 0 ? (
            <p
              style={{
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-muted))',
                margin: 0,
              }}
            >
              No bundled plugins available for your themes
            </p>
          ) : (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}
            >
              {bundledPlugins.map(plugin => (
                <div
                  key={plugin.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 'var(--text-xs-font-size)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'hsl(var(--text-primary))',
                      }}
                    >
                      {plugin.name}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-xs-font-size)',
                        color: 'hsl(var(--text-muted))',
                        marginLeft: 'var(--spacing-xs)',
                      }}
                    >
                      via {plugin.themes.join(', ')}
                    </span>
                  </div>
                  <a
                    href="#"
                    style={{
                      fontSize: 'var(--text-xs-font-size)',
                      color: 'hsl(var(--text-muted))',
                      textDecoration: 'none',
                    }}
                  >
                    How to install
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support panel */}
        <div
          style={{
            backgroundColor: 'hsl(var(--card-bg))',
            border: '1px solid hsl(var(--card-border))',
            borderRadius: 'var(--rounded-xl)',
            padding: 'var(--spacing-md)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
              margin: 0,
              marginBottom: 'var(--spacing-xs)',
            }}
          >
            Support
          </h2>
          <p
            style={{
              fontSize: 'var(--text-xs-font-size)',
              lineHeight: 'var(--text-xs-line-height)',
              color: 'hsl(var(--text-muted))',
              margin: 0,
              maxWidth: '300px',
            }}
          >
            Available for themes with an active license and valid support period.
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs-font-size)',
              fontWeight: 'var(--font-weight-medium)',
              color: activeSupportCount > 0
                ? 'hsl(var(--status-success-fg))'
                : 'hsl(var(--text-muted))',
              marginTop: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-sm)',
            }}
          >
            {activeSupportCount} theme{activeSupportCount !== 1 ? 's' : ''} with active support
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/support')}
          >
            Create ticket
          </Button>
        </div>
      </div>
    </div>
  )
}
