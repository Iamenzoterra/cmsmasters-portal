// Phase 1 shell — layout-only, zero logic.
// Phase 2 introduces styles.css + picker/triptych; Phase 3 wires suggestions.
// Inline styles here are acceptable by infra-tooling precedent (see tools/layout-maker).
// ds-lint-ignore (intentional: tools/* not subject to Portal DS token discipline in Phase 1).

export function App() {
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100vh' }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
        <strong>Block Forge</strong> — Phase 1 shell (picker + triptych + suggestions land in Phase 2+)
      </header>
      <main style={{ display: 'grid', gridTemplateColumns: '1fr 360px' }}>
        <section data-region="triptych" style={{ padding: 16, borderRight: '1px solid #ddd' }}>
          <em>Preview triptych — Phase 2 placeholder</em>
        </section>
        <aside data-region="suggestions" style={{ padding: 16 }}>
          <em>Suggestion list — Phase 3 placeholder</em>
        </aside>
      </main>
      <footer data-region="status" style={{ padding: '8px 16px', borderTop: '1px solid #ddd' }}>
        <em>Status bar — Phase 4 placeholder</em>
      </footer>
    </div>
  )
}
