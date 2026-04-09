const AVATAR_COLORS = [
  { bg: 'hsl(var(--avatar-teal-bg) / 0.15)', text: 'hsl(var(--avatar-teal-fg))' },
  { bg: 'hsl(var(--avatar-blue-bg) / 0.15)', text: 'hsl(var(--avatar-blue-fg))' },
  { bg: 'hsl(var(--avatar-pink-bg) / 0.15)', text: 'hsl(var(--avatar-pink-fg))' },
  { bg: 'hsl(var(--avatar-navy-bg) / 0.15)', text: 'hsl(var(--avatar-navy-fg))' },
  { bg: 'hsl(var(--avatar-amber-bg) / 0.15)', text: 'hsl(var(--avatar-amber-fg))' },
  { bg: 'hsl(var(--avatar-indigo-bg) / 0.15)', text: 'hsl(var(--avatar-indigo-fg))' },
]

function getAvatarColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.codePointAt(i)! + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.includes(' ')) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return (name || email || '??').slice(0, 2).toUpperCase()
}

interface AvatarInitialsProps {
  name?: string | null
  email?: string | null
  size?: number
}

export function AvatarInitials({ name, email, size = 32 }: AvatarInitialsProps) {
  const initials = getInitials(name, email)
  const color = getAvatarColor(name || email || '')
  const fontSize = Math.round(size * 0.38)

  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color.bg,
        color: color.text,
        fontSize,
        fontWeight: 'var(--font-weight-medium)',
        lineHeight: 1,
      }}
    >
      {initials}
    </div>
  )
}
