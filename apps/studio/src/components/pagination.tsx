import { Button } from '@cmsmasters/ui'

interface PaginationProps {
  page: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

export function Pagination({ page, totalItems, itemsPerPage, onPageChange, itemLabel = 'items' }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  if (totalPages <= 1) return null

  const start = (page - 1) * itemsPerPage + 1
  const end = Math.min(page * itemsPerPage, totalItems)

  return (
    <div className="flex w-full items-center justify-between">
      <span
        style={{
          fontSize: 'var(--text-xs-font-size)',
          color: 'hsl(var(--text-muted))',
        }}
      >
        Showing {start}–{end} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
