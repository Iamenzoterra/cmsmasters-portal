/**
 * InspectorCluster — primitive contract tests (WP-031 phase 3 cut A).
 *
 * Locks: native <details>/<summary> for non-identity clusters, identity
 * special-case (no disclosure), defaultOpen behavior, scopeBadge slot,
 * data-cluster-id attribute for query selectors.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { InspectorCluster } from './InspectorCluster'

describe('InspectorCluster', () => {
  it('renders <details> for non-identity clusters', () => {
    const { container } = render(
      <InspectorCluster id="cluster-spacing" title="Spacing">
        <div>field</div>
      </InspectorCluster>,
    )
    const details = container.querySelector('details.lm-inspector__cluster')
    expect(details).not.toBeNull()
    expect(details?.getAttribute('data-cluster-id')).toBe('cluster-spacing')
  })

  it('renders <div> (no details) for cluster-identity', () => {
    const { container } = render(
      <InspectorCluster id="cluster-identity" title="ignored">
        <div>identity content</div>
      </InspectorCluster>,
    )
    expect(container.querySelector('details')).toBeNull()
    const div = container.querySelector('div.lm-inspector__cluster--identity')
    expect(div).not.toBeNull()
    expect(div?.getAttribute('data-cluster-id')).toBe('cluster-identity')
  })

  it('puts the title text inside <summary>', () => {
    const { container } = render(
      <InspectorCluster id="cluster-layout" title="Layout">
        <div />
      </InspectorCluster>,
    )
    const summary = container.querySelector('summary.lm-inspector__cluster-title')
    expect(summary?.textContent).toContain('Layout')
  })

  it('sets open attribute when defaultOpen=true', () => {
    const { container } = render(
      <InspectorCluster id="cluster-spacing" title="Spacing" defaultOpen>
        <div />
      </InspectorCluster>,
    )
    const details = container.querySelector('details')
    expect(details?.hasAttribute('open')).toBe(true)
  })

  it('omits open attribute when defaultOpen=false (default)', () => {
    const { container } = render(
      <InspectorCluster id="cluster-spacing" title="Spacing">
        <div />
      </InspectorCluster>,
    )
    const details = container.querySelector('details')
    expect(details?.hasAttribute('open')).toBe(false)
  })

  it('renders scopeBadge in the title when provided', () => {
    const { container } = render(
      <InspectorCluster
        id="cluster-spacing"
        title="Spacing"
        scopeBadge={<span data-testid="scope-chip">Tablet</span>}
      >
        <div />
      </InspectorCluster>,
    )
    const scope = container.querySelector('.lm-inspector__cluster-scope')
    expect(scope).not.toBeNull()
    expect(scope?.textContent).toContain('Tablet')
  })

  it('does not render scope wrapper when scopeBadge omitted', () => {
    const { container } = render(
      <InspectorCluster id="cluster-spacing" title="Spacing">
        <div />
      </InspectorCluster>,
    )
    expect(container.querySelector('.lm-inspector__cluster-scope')).toBeNull()
  })

  it('renders children inside cluster-body for non-identity', () => {
    const { container } = render(
      <InspectorCluster id="cluster-spacing" title="Spacing" defaultOpen>
        <div data-testid="field-content">field block</div>
      </InspectorCluster>,
    )
    const body = container.querySelector('.lm-inspector__cluster-body')
    expect(body?.querySelector('[data-testid="field-content"]')).not.toBeNull()
  })

  it('renders children directly inside identity cluster (no body wrapper)', () => {
    const { container } = render(
      <InspectorCluster id="cluster-identity" title="ignored">
        <div data-testid="identity-content">name + badges</div>
      </InspectorCluster>,
    )
    expect(container.querySelector('.lm-inspector__cluster-body')).toBeNull()
    const identity = container.querySelector('.lm-inspector__cluster--identity')
    expect(identity?.querySelector('[data-testid="identity-content"]')).not.toBeNull()
  })
})
