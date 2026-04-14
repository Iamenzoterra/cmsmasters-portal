import { useState } from 'react'
import { SLOT_DEFINITIONS, META_SLOTS, HOOK_SHORTCUTS } from '@cmsmasters/db/slots'
import { CopyButton } from './CopyButton'

type Section = 'layout' | 'meta' | 'hooks'

export function SlotReference({ onCopied }: { onCopied: () => void }) {
  const [open, setOpen] = useState<Section | null>(null)

  const toggle = (s: Section) => setOpen(open === s ? null : s)

  return (
    <div className="lm-slot-ref">
      <div className="lm-slot-ref__title">Slot Reference</div>

      {/* Layout slots */}
      <button className="lm-slot-ref__toggle" onClick={() => toggle('layout')}>
        <span className="lm-slot-ref__arrow">{open === 'layout' ? '\u25BE' : '\u25B8'}</span>
        Layout Slots ({SLOT_DEFINITIONS.length})
      </button>
      {open === 'layout' && (
        <div className="lm-slot-ref__list">
          {SLOT_DEFINITIONS.map((s) => (
            <div key={s.name} className="lm-slot-ref__item">
              <span className="lm-slot-ref__label">{s.label}</span>
              <span className="lm-slot-ref__chip">
                <code>{`{{slot:${s.name}}}`}</code>
                <CopyButton text={`{{slot:${s.name}}}`} onCopied={onCopied} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Meta slots */}
      <button className="lm-slot-ref__toggle" onClick={() => toggle('meta')}>
        <span className="lm-slot-ref__arrow">{open === 'meta' ? '\u25BE' : '\u25B8'}</span>
        Meta Slots ({META_SLOTS.length})
      </button>
      {open === 'meta' && (
        <div className="lm-slot-ref__list">
          {META_SLOTS.map((s) => (
            <div key={s.key} className="lm-slot-ref__item">
              <span className="lm-slot-ref__label">{s.key}</span>
              <span className="lm-slot-ref__desc">{s.description}</span>
              <span className="lm-slot-ref__chip">
                <code>{`{{meta:${s.key}}}`}</code>
                <CopyButton text={`{{meta:${s.key}}}`} onCopied={onCopied} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hook shortcuts */}
      <button className="lm-slot-ref__toggle" onClick={() => toggle('hooks')}>
        <span className="lm-slot-ref__arrow">{open === 'hooks' ? '\u25BE' : '\u25B8'}</span>
        Hook Shortcuts ({HOOK_SHORTCUTS.length})
      </button>
      {open === 'hooks' && (
        <div className="lm-slot-ref__list">
          {HOOK_SHORTCUTS.map((s) => (
            <div key={s.pattern} className="lm-slot-ref__item">
              <span className="lm-slot-ref__chip">
                <code>{s.pattern}</code>
                <CopyButton text={s.pattern} onCopied={onCopied} />
              </span>
              <span className="lm-slot-ref__desc">{s.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
