import { useState, useCallback } from 'react'

interface Props {
  text: string
  onCopied: () => void
}

export function CopyButton({ text, onCopied }: Props) {
  const [copied, setCopied] = useState(false)

  const handleClick = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    onCopied()
    setTimeout(() => setCopied(false), 1500)
  }, [text, onCopied])

  return (
    <button
      className={`lm-copy-btn ${copied ? 'lm-copy-btn--copied' : ''}`}
      onClick={handleClick}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 11V3C3 2.44772 3.44772 2 4 2H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
