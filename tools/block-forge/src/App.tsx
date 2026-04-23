// Phase 1 hotfix — DS-compliant shell. Zero inline styles.
// Tailwind utilities + `hsl(var(--token))` from packages/ui/src/theme/tokens.css.
// Phase 2 introduces picker/triptych/suggestions with real logic on this base.
//
// Token mapping (Plan Correction — see phase-1-hotfix-result.md):
//   --bg-page         → present verbatim
//   --text-primary    → present verbatim
//   --text-muted      → present verbatim
//   --border-base     → NOT present in tokens.css; fallback to --border-default
//                       (dashboard precedent: apps/dashboard/src/components/topbar.tsx:23)

export function App() {
  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-[hsl(var(--bg-page))] text-[hsl(var(--text-primary))]">
      <header className="border-b border-[hsl(var(--border-default))] px-6 py-3">
        <strong className="font-semibold">Block Forge</strong>
        <span className="ml-2 text-sm text-[hsl(var(--text-muted))]">
          Phase 1 shell (picker + triptych + suggestions land in Phase 2+)
        </span>
      </header>

      <main className="grid grid-cols-[1fr_360px]">
        <section
          data-region="triptych"
          className="border-r border-[hsl(var(--border-default))] p-6"
        >
          <em className="text-sm text-[hsl(var(--text-muted))]">
            Preview triptych — Phase 2 placeholder
          </em>
        </section>
        <aside data-region="suggestions" className="p-6">
          <em className="text-sm text-[hsl(var(--text-muted))]">
            Suggestion list — Phase 3 placeholder
          </em>
        </aside>
      </main>

      <footer
        data-region="status"
        className="border-t border-[hsl(var(--border-default))] px-6 py-2"
      >
        <em className="text-sm text-[hsl(var(--text-muted))]">
          Status bar — Phase 4 placeholder
        </em>
      </footer>
    </div>
  )
}
