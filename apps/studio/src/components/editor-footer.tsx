import { Button } from '@cmsmasters/ui'

interface EditorFooterProps {
  onDiscard: () => void
  onSaveDraft: () => void
  onPublish: () => void
  onDelete?: () => void
  isDirty: boolean
  isSaving: boolean
  isPublishing: boolean
  isDeleting: boolean
  isPublished?: boolean
}

export function EditorFooter({
  onDiscard,
  onSaveDraft,
  onPublish,
  onDelete,
  isDirty,
  isSaving,
  isPublishing,
  isDeleting,
  isPublished = false,
}: EditorFooterProps) {
  const busy = isSaving || isPublishing || isDeleting

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
      <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
        <button
          type="button"
          onClick={onDiscard}
          disabled={!isDirty || busy}
          className="border-0 bg-transparent disabled:opacity-40"
          style={{
            color: 'hsl(var(--text-secondary))',
            fontSize: 'var(--text-sm-font-size)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: isDirty && !busy ? 'pointer' : 'default',
            padding: 0,
          }}
        >
          Discard Changes
        </button>

        {/* M6: Delete only for existing themes with real id */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="border-0 bg-transparent disabled:opacity-40"
            style={{
              color: 'hsl(var(--status-error-fg))',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: busy ? 'default' : 'pointer',
              padding: 0,
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveDraft}
          disabled={busy}
          loading={isSaving}
        >
          Save Draft
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onPublish}
          disabled={busy}
          loading={isPublishing}
        >
          {isPublished ? 'Update & Publish' : 'Publish'}
        </Button>
      </div>
    </div>
  )
}
