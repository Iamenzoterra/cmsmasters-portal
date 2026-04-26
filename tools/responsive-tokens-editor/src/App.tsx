export function App() {
  return (
    <div className="flex h-screen w-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Sidebar nav scaffolding — Phase 3+ wires functionality */}
      <aside className="w-56 border-r border-[hsl(var(--border))] p-4">
        <h1 className="text-[length:var(--h4-font-size)] font-[var(--font-weight-semibold)] mb-6">
          Responsive Tokens
        </h1>
        <nav>
          <ul className="space-y-1 text-[length:var(--text-sm-font-size)]">
            <li className="px-2 py-1.5 rounded-md bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
              Global Scale
            </li>
            <li className="px-2 py-1.5 rounded-md text-[hsl(var(--muted-foreground))]">
              Spacing
            </li>
            <li className="px-2 py-1.5 rounded-md text-[hsl(var(--muted-foreground))]">
              Tokens
            </li>
            <li className="px-2 py-1.5 rounded-md text-[hsl(var(--muted-foreground))]">
              Containers
            </li>
            <li className="px-2 py-1.5 rounded-md text-[hsl(var(--muted-foreground))]">
              Save
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main pane — Phase 3+ renders sub-editors here */}
      <main className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-[length:var(--h2-font-size)] font-[var(--font-weight-semibold)] mb-2">
          Global Scale
        </h2>
        <p className="text-[length:var(--text-sm-font-size)] text-[hsl(var(--muted-foreground))]">
          Phase 1 scaffold — empty shell. Editor functionality lands in Phase 3+.
        </p>
      </main>
    </div>
  )
}
