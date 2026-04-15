import { useState } from 'react'
import { SLOT_DEFINITIONS, META_SLOTS, HOOK_SHORTCUTS } from '@cmsmasters/db'
import { Layers, GitBranch, Copy, Check } from 'lucide-react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px',
        color: copied ? 'hsl(var(--status-success-fg))' : 'hsl(var(--text-muted))',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function CodeChip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center" style={{ gap: '4px' }}>
      <code
        style={{
          fontSize: 'var(--text-xs-font-size)',
          color: 'hsl(var(--text-link))',
          backgroundColor: 'hsl(var(--bg-surface))',
          padding: '2px 8px',
          borderRadius: 'var(--rounded-sm)',
        }}
        className="font-mono"
      >
        {children}
      </code>
      <CopyButton text={children} />
    </span>
  )
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--h4-font-size)',
  lineHeight: 'var(--h4-line-height)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'hsl(var(--text-primary))',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 'var(--text-sm-font-size)',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--spacing-sm) var(--spacing-md)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'hsl(var(--text-secondary))',
  borderBottom: '2px solid hsl(var(--border-default))',
  fontSize: 'var(--text-xs-font-size)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const tdStyle: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  borderBottom: '1px solid hsl(var(--border-default))',
  color: 'hsl(var(--text-primary))',
}

export function SlotsList() {
  const [filter, setFilter] = useState('')

  const filteredLayout = SLOT_DEFINITIONS.filter(
    (s) => !filter || s.name.includes(filter) || s.category.includes(filter) || s.label.toLowerCase().includes(filter),
  )

  const filteredMeta = META_SLOTS.filter(
    (s) => !filter || s.key.includes(filter) || s.description.toLowerCase().includes(filter),
  )

  const filteredHooks = HOOK_SHORTCUTS.filter(
    (s) => !filter || s.pattern.includes(filter) || s.description.toLowerCase().includes(filter),
  )

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col" style={{ gap: '4px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'var(--h3-font-size)',
              lineHeight: 'var(--h3-line-height)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            Slot Reference
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-secondary))',
            }}
          >
            All available slots for layouts, blocks, and theme pages. Use these placeholders in block HTML.
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{ maxWidth: '320px', marginTop: 'var(--spacing-lg)' }}>
        <input
          type="text"
          placeholder="Filter slots..."
          value={filter}
          onChange={(e) => setFilter(e.target.value.toLowerCase())}
          style={{
            height: '36px',
            padding: '0 var(--spacing-sm)',
            backgroundColor: 'hsl(var(--input))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--rounded-lg)',
            boxShadow: 'var(--shadow-xs)',
            fontSize: 'var(--text-sm-font-size)',
            color: 'hsl(var(--foreground))',
            width: '100%',
          }}
        />
      </div>

      {/* Layout Slots */}
      <section style={{ marginTop: 'var(--spacing-2xl)' }}>
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          <Layers size={18} style={{ color: 'hsl(var(--text-link))' }} />
          <h2 style={sectionTitleStyle}>Layout Slots</h2>
        </div>
        <p style={{ margin: '0 0 var(--spacing-md)', fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
          Used in layout page HTML. Each slot is filled by a global element or a per-layout override block.
        </p>
        <div style={{ borderRadius: 'var(--rounded-lg)', border: '1px solid hsl(var(--border-default))', overflow: 'hidden' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: 'hsl(var(--bg-surface-alt))' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Syntax</th>
              </tr>
            </thead>
            <tbody>
              {filteredLayout.map((s) => (
                <tr key={s.name}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{s.label}</span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 'var(--text-xs-font-size)',
                        padding: '2px 8px',
                        borderRadius: 'var(--rounded-full)',
                        backgroundColor: 'hsl(var(--bg-surface-alt))',
                        color: 'hsl(var(--text-secondary))',
                      }}
                    >
                      {s.category}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div className="flex flex-col" style={{ gap: '4px' }}>
                      <CodeChip>{`{{slot:${s.name}}}`}</CodeChip>
                      <CodeChip>{`<div data-slot="${s.name}"></div>`}</CodeChip>
                      <CodeChip>{`<!-- SLOT: ${s.name.toUpperCase()} -->`}</CodeChip>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLayout.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                    No matching layout slots
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Nested Slots */}
      <section style={{ marginTop: 'var(--spacing-2xl)' }}>
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          <GitBranch size={18} style={{ color: 'hsl(var(--status-warning-fg))' }} />
          <h2 style={sectionTitleStyle}>Nested Slots</h2>
        </div>
        <p style={{ margin: '0 0 var(--spacing-md)', fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
          Layout-scoped slots that live inside a container slot. Not global — only present in layouts that declare them via <code className="font-mono" style={{ fontSize: 'var(--text-xs-font-size)' }}>nested-slots</code> in slot_config.
        </p>
        <div style={{ borderRadius: 'var(--rounded-lg)', border: '1px solid hsl(var(--border-default))', overflow: 'hidden' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: 'hsl(var(--bg-surface-alt))' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Parent</th>
                <th style={thStyle}>Layout</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Syntax</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 'var(--font-weight-medium)' }}>theme-blocks</span>
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontSize: 'var(--text-xs-font-size)',
                      padding: '2px 8px',
                      borderRadius: 'var(--rounded-full)',
                      backgroundColor: 'hsl(var(--bg-surface-alt))',
                      color: 'hsl(var(--text-secondary))',
                    }}
                  >
                    content
                  </span>
                </td>
                <td style={{ ...tdStyle, color: 'hsl(var(--text-secondary))' }}>theme-page-layout</td>
                <td style={{ ...tdStyle, color: 'hsl(var(--text-secondary))' }}>Template blocks per theme</td>
                <td style={tdStyle}>
                  <CodeChip>{`<div data-slot="theme-blocks"></div>`}</CodeChip>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Meta Slots */}
      <section style={{ marginTop: 'var(--spacing-2xl)' }}>
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          <Layers size={18} style={{ color: 'hsl(var(--status-info-fg))' }} />
          <h2 style={sectionTitleStyle}>Meta Slots</h2>
        </div>
        <p style={{ margin: '0 0 var(--spacing-md)', fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
          Resolved from theme.meta at build time. Use in block HTML for dynamic theme data.
        </p>
        <div style={{ borderRadius: 'var(--rounded-lg)', border: '1px solid hsl(var(--border-default))', overflow: 'hidden' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: 'hsl(var(--bg-surface-alt))' }}>
                <th style={thStyle}>Field</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Syntax</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeta.map((s) => (
                <tr key={s.key}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{s.key}</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'hsl(var(--text-secondary))' }}>{s.description}</td>
                  <td style={tdStyle}>
                    <CodeChip>{`{{meta:${s.key}}}`}</CodeChip>
                  </td>
                </tr>
              ))}
              {filteredMeta.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                    No matching meta slots
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Hook Shortcuts */}
      <section style={{ marginTop: 'var(--spacing-2xl)' }}>
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          <Layers size={18} style={{ color: 'hsl(var(--status-warning-fg))' }} />
          <h2 style={sectionTitleStyle}>Hook Shortcuts</h2>
        </div>
        <p style={{ margin: '0 0 var(--spacing-md)', fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
          Convenience hooks that resolve with special formatting (e.g. $ prefix for prices).
        </p>
        <div style={{ borderRadius: 'var(--rounded-lg)', border: '1px solid hsl(var(--border-default))', overflow: 'hidden' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: 'hsl(var(--bg-surface-alt))' }}>
                <th style={thStyle}>Pattern</th>
                <th style={thStyle}>Resolves to</th>
                <th style={thStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredHooks.map((s) => (
                <tr key={s.pattern}>
                  <td style={tdStyle}>
                    <CodeChip>{s.pattern}</CodeChip>
                  </td>
                  <td style={tdStyle}>
                    <code className="font-mono" style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-secondary))' }}>
                      {s.resolves}
                    </code>
                  </td>
                  <td style={{ ...tdStyle, color: 'hsl(var(--text-secondary))' }}>{s.description}</td>
                </tr>
              ))}
              {filteredHooks.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                    No matching hooks
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Agent Skills Info */}
      <section
        style={{
          marginTop: 'var(--spacing-2xl)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--rounded-lg)',
          border: '1px solid hsl(var(--border-default))',
          backgroundColor: 'hsl(var(--bg-surface-alt))',
        }}
      >
        <h3
          style={{
            margin: '0 0 var(--spacing-sm)',
            fontSize: 'var(--text-sm-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(var(--text-primary))',
          }}
        >
          Agent Skills
        </h3>
        <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
          <div className="flex items-start" style={{ gap: 'var(--spacing-sm)' }}>
            <code
              className="font-mono"
              style={{
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-link))',
                backgroundColor: 'hsl(var(--bg-surface))',
                padding: '2px 8px',
                borderRadius: 'var(--rounded-sm)',
                whiteSpace: 'nowrap',
              }}
            >
              /block-craft
            </code>
            <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
              Create blocks from Figma designs. Contains the full slot/hook syntax reference for agents.
            </span>
          </div>
          <div className="flex items-start" style={{ gap: 'var(--spacing-sm)' }}>
            <code
              className="font-mono"
              style={{
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-link))',
                backgroundColor: 'hsl(var(--bg-surface))',
                padding: '2px 8px',
                borderRadius: 'var(--rounded-sm)',
                whiteSpace: 'nowrap',
              }}
            >
              /register-slot
            </code>
            <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
              Add a new slot (layout, meta, or hook). Step-by-step checklist to update all touchpoints.
            </span>
          </div>
        </div>
      </section>

      {/* Source note */}
      <p style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
        Source of truth: <code className="font-mono">packages/db/src/slot-registry.ts</code>
      </p>
    </>
  )
}
