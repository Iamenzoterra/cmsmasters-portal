import { useEffect, useRef } from 'react'
import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'

interface LayoutSchematicProps {
  html: string
  css: string
  layoutSlots: Record<string, string | string[]>
  slotConfig: Record<string, { gap?: string }>
}

/**
 * Render a layout HTML as a schematic preview inside a shadow root.
 *
 * Shadow DOM isolates the layout CSS from the host Studio app so we do not need
 * an iframe. Slot placeholders ({{slot:name}}, <!-- SLOT: NAME -->, data-slot="name")
 * are replaced with ONE labeled dashed box per slot. The block count (if any) is
 * shown as a badge — we show structure, not content.
 */
export function LayoutSchematic({ html, css, layoutSlots }: LayoutSchematicProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })

    const styleEl = document.createElement('style')
    styleEl.textContent = `${tokensCSS}\n${STUB_CSS}\n${css}`

    const rootEl = document.createElement('div')
    rootEl.className = '__layout-root'
    rootEl.innerHTML = transformHtml(html, layoutSlots)

    shadow.replaceChildren(styleEl, rootEl)
  }, [html, css, layoutSlots])

  return <div ref={hostRef} style={{ width: '100%' }} />
}

/**
 * Replace all slot placeholder forms with a single stub per slot.
 *
 * Uses DOMParser for robust tree walking (regex on nested HTML is unsafe).
 *
 * Priority rules (to prevent duplicate stubs when the same slot is marked
 * multiple ways in the same layout):
 *   1. `[data-slot="x"]` elements are authoritative — stub goes inside them.
 *   2. `<!-- SLOT: X -->` comments only render if no data-slot="x" exists.
 *   3. `{{slot:x}}` text placeholders only render if no data-slot="x" exists.
 */
const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-')

// eslint-disable-next-line sonarjs/cognitive-complexity
function transformHtml(
  html: string,
  layoutSlots: Record<string, string | string[]>,
): string {
  if (typeof DOMParser === 'undefined') return html

  const buildStub = (name: string): string => {
    const normalized = normalize(name)
    const raw = layoutSlots[normalized]
    const count = Array.isArray(raw) ? raw.filter(Boolean).length : raw ? 1 : 0
    const label = escapeHtml(normalized)
    const badge = count === 0
      ? '<span class="__slot-badge __slot-badge-empty">empty</span>'
      : `<span class="__slot-badge">${count} block${count === 1 ? '' : 's'}</span>`
    return `<div class="__slot-stub"><span class="__slot-label">${label}</span>${badge}</div>`
  }

  // Wrap in a root so DOMParser has a single container to walk
  const doc = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><body><div id="__root">${html}</div></body></html>`,
    'text/html',
  )
  const root = doc.getElementById('__root')
  if (!root) return html

  // Pass 1: data-slot elements (authoritative). Collect names to dedupe other forms.
  const processed = new Set<string>()
  root.querySelectorAll<HTMLElement>('[data-slot]').forEach((el) => {
    const raw = el.dataset.slot
    if (!raw) return
    const name = normalize(raw)
    el.classList.add('__slot-host')
    el.innerHTML = buildStub(name)
    processed.add(name)
  })

  // Pass 2: HTML comments `<!-- SLOT: NAME -->` — skip names already done.
  const commentWalker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT)
  const comments: Comment[] = []
  let cnode: Node | null
  while ((cnode = commentWalker.nextNode())) comments.push(cnode as Comment)
  for (const comment of comments) {
    // eslint-disable-next-line sonarjs/slow-regex -- internal tool, trusted input
    const match = comment.textContent?.match(/^\s*SLOT:\s*([A-Za-z0-9_\- :]+?)\s*$/)
    if (!match) continue
    const name = normalize(match[1])
    if (processed.has(name)) {
      comment.remove()
      continue
    }
    const tpl = doc.createElement('template')
    tpl.innerHTML = buildStub(name)
    comment.parentNode?.replaceChild(tpl.content, comment)
    processed.add(name)
  }

  // Pass 3: `{{slot:name}}` text placeholders — skip names already done.
  const textWalker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let tnode: Node | null
  while ((tnode = textWalker.nextNode())) textNodes.push(tnode as Text)
  for (const text of textNodes) {
    const content = text.textContent ?? ''
    if (!content.includes('{{slot:')) continue
    const frag = doc.createDocumentFragment()
    const parts = content.split(/(\{\{slot:[a-z0-9-]+\}\})/gi)
    for (const part of parts) {
      const m = part.match(/^\{\{slot:([a-z0-9-]+)\}\}$/i)
      if (m) {
        const name = normalize(m[1])
        if (processed.has(name)) continue
        const tpl = doc.createElement('template')
        tpl.innerHTML = buildStub(name)
        frag.append(tpl.content)
        processed.add(name)
      } else if (part) {
        frag.append(doc.createTextNode(part))
      }
    }
    text.replaceWith(frag)
  }

  return root.innerHTML
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

/**
 * Visual language for the schematic preview. All values pull from tokens.css
 * which is injected into the same shadow root.
 */
const STUB_CSS = `
:host, .__layout-root { display: block; }
.__layout-root *, .__layout-root *::before, .__layout-root *::after { box-sizing: border-box; }

.__slot-host { position: relative; outline: 1px dashed hsl(var(--border-strong, var(--border-default))); outline-offset: -1px; }

.__slot-stack {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.__slot-stub {
  position: relative;
  flex: 1 1 auto;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 2px dashed hsl(var(--tag-info-fg));
  border-radius: var(--rounded-md);
  background:
    repeating-linear-gradient(
      45deg,
      hsl(var(--tag-info-bg) / 0.35) 0 8px,
      transparent 8px 16px
    ),
    hsl(var(--tag-info-bg) / 0.2);
  color: hsl(var(--tag-info-fg));
  font-family: var(--font-family-monospace);
  font-size: var(--text-xs-font-size);
  line-height: var(--text-xs-line-height);
}

.__slot-label {
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.__slot-badge {
  padding: 2px 6px;
  border-radius: var(--rounded-full);
  background: hsl(var(--tag-info-fg));
  color: hsl(var(--tag-info-bg));
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.__slot-badge-empty {
  background: hsl(var(--text-muted));
  color: hsl(var(--bg-surface));
}
`
