import type { Block } from '@cmsmasters/db'
import { Plus, X } from 'lucide-react'

interface PositionGridProps {
  maxPositions: number
  positions: Array<{ position: number; block_id: string | null }>
  blocks: Block[]
  onAssignBlock: (position: number) => void
  onRemoveBlock: (position: number) => void
  readonlyPositions?: number[]
}

export function PositionGrid({
  maxPositions,
  positions,
  blocks,
  onAssignBlock,
  onRemoveBlock,
  readonlyPositions = [],
}: PositionGridProps) {
  const positionMap = new Map(positions.map((p) => [p.position, p.block_id]))
  const blockMap = new Map(blocks.map((b) => [b.id, b]))

  return (
    <div
      className="overflow-hidden border"
      style={{
        borderColor: 'hsl(var(--border-default))',
        borderRadius: 'var(--rounded-xl)',
        backgroundColor: 'hsl(var(--bg-surface))',
      }}
    >
      {Array.from({ length: maxPositions }, (_, i) => {
        const pos = i + 1
        const blockId = positionMap.get(pos) ?? null
        const block = blockId ? blockMap.get(blockId) : null
        const isReadonly = readonlyPositions.includes(pos)
        const isLast = pos === maxPositions

        return (
          <div
            key={pos}
            className="flex items-center"
            style={{
              minHeight: '48px',
              borderBottom: isLast ? 'none' : '1px solid hsl(var(--border-default))',
              ...(isReadonly && block ? {
                backgroundColor: 'hsl(var(--bg-surface-alt) / 0.5)',
                borderLeft: '2px solid hsl(var(--text-muted))',
              } : {}),
            }}
          >
            {/* Position number */}
            <div
              className="flex shrink-0 items-center justify-center"
              style={{
                width: '44px',
                fontSize: 'var(--text-xs-font-size)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'hsl(var(--text-muted))',
              }}
            >
              {pos}
            </div>

            {/* Content */}
            {block ? (
              <div
                className="flex flex-1 items-center justify-between"
                style={{ padding: 'var(--spacing-xs) var(--spacing-sm) var(--spacing-xs) 0' }}
              >
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <span style={{
                    fontSize: 'var(--text-sm-font-size)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: isReadonly ? 'hsl(var(--text-secondary))' : 'hsl(var(--text-primary))',

                  }}>
                    {block.name}
                  </span>
                  {isReadonly && (
                    <span style={{
                      fontSize: 'var(--text-xs-font-size)',
                      color: 'hsl(var(--text-muted))',
  
                    }}>
                      Template
                    </span>
                  )}
                </div>
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => onRemoveBlock(pos)}
                    className="flex shrink-0 items-center justify-center border-0 bg-transparent"
                    style={{
                      width: '28px',
                      height: '28px',
                      color: 'hsl(var(--text-muted))',
                      cursor: 'pointer',
                      borderRadius: 'var(--rounded-lg)',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div
                className="flex flex-1 items-center"
                style={{ padding: 'var(--spacing-xs) var(--spacing-sm) var(--spacing-xs) 0' }}
              >
                <button
                  type="button"
                  onClick={() => onAssignBlock(pos)}
                  className="flex items-center gap-1 border-0 bg-transparent"
                  style={{
                    color: 'hsl(var(--text-link))',
                    fontSize: 'var(--text-sm-font-size)',

                    cursor: 'pointer',
                    padding: '2px 0',
                  }}
                >
                  <Plus size={14} />
                  Add block
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
