import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser, computeEntitlements } from '@cmsmasters/auth'
import type { Entitlements } from '@cmsmasters/auth'
import { getProfile, getUserLicenses, getStaffRoles } from '@cmsmasters/db'
import type { Profile } from '@cmsmasters/db'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/stat-card'
import { CapabilitiesTable } from '../components/capabilities-table'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts
      .slice(0, 2)
      .map(p => p.charAt(0).toUpperCase())
      .join('')
  }
  if (email) return email.charAt(0).toUpperCase()
  return '?'
}

const ACCESS_DETAILS = [
  {
    title: 'ThemeForest access',
    description:
      'Verified ThemeForest licenses unlock theme documentation, updates, and support for eligible themes.',
  },
  {
    title: 'Envato Elements access',
    description:
      'Envato Elements gives access to public resources and basic guides, but does not include support tickets or auto-updates.',
  },
  {
    title: 'Subscription access',
    description:
      'CMSMasters subscription is not active on your account. Premium resources will be available once activated.',
  },
]

export function MyAccount() {
  const { authState } = useUser(supabase)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authState.status !== 'authenticated') return
    let cancelled = false

    Promise.all([
      getProfile(supabase, authState.userId),
      getUserLicenses(supabase, authState.userId),
      getStaffRoles(supabase, authState.userId),
    ])
      .then(([profileData, licensesData, staffData]) => {
        if (cancelled) return
        setProfile(profileData)
        setEntitlements(
          computeEntitlements(
            true,
            licensesData,
            staffData,
            profileData.elements_subscriber ?? false,
          ),
        )
        setLoading(false)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authState])

  if (authState.status === 'loading' || loading) {
    return (
      <div style={{ color: 'hsl(var(--text-secondary))' }}>
        <p style={{ fontSize: 'var(--text-sm-font-size)' }}>Loading...</p>
      </div>
    )
  }

  if (error || !profile || !entitlements) {
    return (
      <div>
        <p
          style={{
            fontSize: 'var(--text-sm-font-size)',
            color: 'hsl(var(--status-error-fg))',
          }}
        >
          {error ?? 'Failed to load account data'}
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
        My account
      </h1>
      <p
        style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-secondary))',
          marginTop: 'var(--spacing-2xs)',
          marginBottom: 'var(--spacing-2xl)',
        }}
      >
        Your profile, access summary, and available resources
      </p>

      {/* Account card */}
      <div
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          padding: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'hsl(235 56% 20% / 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 'var(--text-sm-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(235 56% 20%)',
          }}
        >
          {getInitials(profile.full_name, profile.email)}
        </div>
        <div>
          <p
            style={{
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
              margin: 0,
            }}
          >
            {profile.full_name ?? 'No name set'}
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs-font-size)',
              lineHeight: 'var(--text-xs-line-height)',
              color: 'hsl(var(--text-muted))',
              margin: 0,
            }}
          >
            {profile.email}
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs-font-size)',
              lineHeight: 'var(--text-xs-line-height)',
              color: 'hsl(var(--text-muted))',
              margin: 0,
            }}
          >
            Joined on {formatDate(profile.created_at)}
          </p>
        </div>
      </div>

      {/* Access summary — 4 stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        <StatCard
          label="ThemeForest licenses"
          value={String(entitlements.licensedThemes.length)}
          sub="Verified purchases"
        />
        <StatCard
          label="Elements status"
          value={entitlements.isElementsSubscriber ? 'Active' : 'Inactive'}
          sub={entitlements.isElementsSubscriber ? 'Confirmed' : 'Not active'}
        />
        <StatCard
          label="Active support"
          value={String(entitlements.activeSupport.length)}
          sub="Eligible for tickets"
        />
        <StatCard
          label="Subscription"
          value="None"
          sub="Not active yet"
          muted
        />
      </div>

      {/* Capabilities table */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <CapabilitiesTable entitlements={entitlements} />
      </div>

      {/* Access details — 3 info cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        {ACCESS_DETAILS.map(card => (
          <div
            key={card.title}
            style={{
              backgroundColor: 'hsl(var(--secondary))',
              borderRadius: 'var(--rounded-xl)',
              padding: 'var(--spacing-md)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--text-sm-font-size)',
                lineHeight: 'var(--text-sm-line-height)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'hsl(var(--text-primary))',
                margin: 0,
                marginBottom: 'var(--spacing-xs)',
              }}
            >
              {card.title}
            </p>
            <p
              style={{
                fontSize: 'var(--text-xs-font-size)',
                lineHeight: 'var(--text-xs-line-height)',
                color: 'hsl(var(--text-muted))',
                margin: 0,
                maxWidth: '300px',
              }}
            >
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div
        style={{
          fontSize: 'var(--text-sm-font-size)',
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        <Link
          to="/"
          style={{
            color: 'hsl(var(--text-link))',
            textDecoration: 'none',
          }}
        >
          View my themes
        </Link>
        <span style={{ color: 'hsl(var(--text-muted))', margin: '0 var(--spacing-xs)' }}>
          ·
        </span>
        <Link
          to="/support"
          style={{
            color: 'hsl(var(--text-link))',
            textDecoration: 'none',
          }}
        >
          Open support
        </Link>
        <span style={{ color: 'hsl(var(--text-muted))', margin: '0 var(--spacing-xs)' }}>
          ·
        </span>
        <a
          href="#"
          style={{
            color: 'hsl(var(--text-link))',
            textDecoration: 'none',
          }}
        >
          Browse documentation
        </a>
      </div>
    </div>
  )
}
