import { Button } from '@cmsmasters/ui'

interface EditorFooterProps {
  onDiscard: () => void
  onSaveDraft: () => void
  onPublish: () => void
  isDirty: boolean
}

export function EditorFooter({ onDiscard, onSaveDraft, onPublish, isDirty }: EditorFooterProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-between border-t"
      style={{
        height: '65px',
        padding: '0 var(--spacing-xl)',
        borderColor: 'hsl(var(--border-default))',
        backgroundColor: 'hsl(var(--bg-surface))',
      }}
    >
      <button
        type="button"
        onClick={onDiscard}
        disabled={!isDirty}
        className="border-0 bg-transparent disabled:opacity-40"
        style={{
          color: 'hsl(var(--text-secondary))',
          fontSize: 'var(--text-sm-font-size)',
          fontWeight: 500,
          fontFamily: "'Manrope', sans-serif",
          cursor: isDirty ? 'pointer' : 'default',
          padding: 0,
        }}
      >
        Discard Changes
      </button>
      <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
        {/* Phase 4 will wire these to Supabase */}
        <Button variant="outline" size="sm" onClick={onSaveDraft}>
          Save Draft
        </Button>
        <Button variant="primary" size="sm" onClick={onPublish}>
          Publish
        </Button>
      </div>
    </div>
  )
}
