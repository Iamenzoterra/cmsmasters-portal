/**
 * LoadStatusBadge — surfaces config load state in the header.
 *
 * Phase 2 stub `loadConfig()` always returns null → 'defaults' (post-mount).
 * Phase 6 wires fs-fetch → 'loaded' when responsive-config.json present.
 */

type Status = 'pending' | 'defaults' | 'loaded'

export function LoadStatusBadge({ status }: { status: Status }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        <span className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))] animate-pulse" />
        Loading config…
      </span>
    )
  }
  if (status === 'defaults') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        <span className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))]" />
        Using defaults · save in Phase 6
      </span>
    )
  }
  // loaded
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-[length:var(--text-xs-font-size)] text-[hsl(var(--accent-foreground))] bg-[hsl(var(--accent))]">
      <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-foreground))]" />
      Loaded from disk
    </span>
  )
}
