import type { TokenMap, SlotConfig } from '../lib/types'
import { resolveToken } from '../lib/tokens'

interface Props {
  slotName: string
  slotConfig: SlotConfig
  columnWidth: string
  columnGap: string
  tokens: TokenMap
  slotElement: HTMLElement
  viewportElement: HTMLElement
}

export function SlotOverlay({
  slotConfig,
  columnWidth,
  columnGap,
  tokens,
  slotElement,
  viewportElement,
}: Props) {
  const slotRect = slotElement.getBoundingClientRect()
  const vpRect = viewportElement.getBoundingClientRect()

  // The viewport has CSS transform: scale(). Compute scale factor.
  const scale = vpRect.width / viewportElement.offsetWidth || 1

  // Convert to unscaled coordinates relative to viewport
  const top = (slotRect.top - vpRect.top) / scale
  const left = (slotRect.left - vpRect.left) / scale
  const width = slotRect.width / scale
  const height = slotRect.height / scale

  const paddingToken = slotConfig.padding
  const paddingResolved = paddingToken ? resolveToken(paddingToken, tokens) : null
  const paddingPx = paddingResolved ? parseInt(paddingResolved, 10) : 0

  const gapToken = slotConfig.gap
  const gapResolved = gapToken ? resolveToken(gapToken, tokens) : null

  return (
    <div
      className="lm-overlay"
      style={{ top, left, width, height }}
    >
      {/* Padding inset visualization */}
      {paddingPx > 0 && paddingToken && (
        <>
          <div
            className="lm-overlay__padding-box"
            style={{
              top: paddingPx,
              left: paddingPx,
              right: paddingPx,
              bottom: paddingPx,
            }}
          />
          {/* Top padding badge */}
          <div
            className="lm-overlay__badge"
            style={{ top: paddingPx / 2 - 8, left: '50%', transform: 'translateX(-50%)' }}
          >
            {paddingToken} ({paddingResolved})
          </div>
        </>
      )}

      {/* Gap badge */}
      {gapToken && gapResolved && (
        <div
          className="lm-overlay__badge lm-overlay__badge--gap"
          style={{ bottom: 8, left: '50%', transform: 'translateX(-50%)' }}
        >
          gap: {gapToken} ({gapResolved})
        </div>
      )}

      {/* Width badge */}
      <div
        className="lm-overlay__badge lm-overlay__badge--width"
        style={{ bottom: -20, left: '50%', transform: 'translateX(-50%)' }}
      >
        {columnWidth}
      </div>

      {/* Column gap indicator (between columns) */}
      {columnGap && columnGap !== '0px' && (
        <div
          className="lm-overlay__badge lm-overlay__badge--col-gap"
          style={{ top: '50%', right: -4, transform: 'translate(100%, -50%)' }}
        >
          gap {columnGap}
        </div>
      )}
    </div>
  )
}
