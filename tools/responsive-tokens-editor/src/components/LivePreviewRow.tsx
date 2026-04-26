/**
 * WP-030 Phase 5 — Live Preview Row.
 *
 * 3 fixed-width iframes side-by-side: 1440 / 768 / 375 (PreviewTriptych precedent
 * from tools/block-forge/src/components/PreviewTriptych.tsx).
 *
 * Each iframe's `width` attribute IS its viewport — `vi` units inside resolve to
 * the iframe's inner width, NOT the editor document viewport. This is the only
 * reliable way to simulate fluid token scaling at narrower widths on a desktop
 * monitor (a fixed-width div would still report the host viewport for `vi`).
 *
 * Real-time updates: parent regenerates `resultCss` on config change; iframe
 * remounts via React `key` set to `resultCss.length` (stable hash for V1 —
 * content changes → length changes → key changes → iframe remounts). If two
 * configs collide on length (extremely rare), iframe content stays cached and
 * user-visible impact is one-frame stale render — acceptable for V1.
 *
 * Iframe srcdoc CSS exempt from `feedback_no_hardcoded_styles` per PF.26 — the
 * sample preview surface is NOT tool chrome (the editor wrapper IS, and adheres).
 * `lint-ds.sh` also skips all `tools/` paths, so the hook never fires here
 * (PF.28); the inline `/* ds-lint-ignore *​/` comment near `font-family:` is
 * documentary only.
 */

const SAMPLE_HTML = `<div class="container">
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <p>Body paragraph with multiple words to demonstrate base font size and line height at this viewport.</p>
  <div class="row">
    <button>Primary</button>
    <button>Secondary</button>
  </div>
  <section>Section rhythm spacing zone</section>
</div>`

// Sample-page CSS — intentionally raw HSL/system-ui per PF.26 exemption.
// This is iframe srcdoc content (sample preview surface), NOT editor chrome.
const SAMPLE_CSS = `
body {
  margin: 0;
  padding: var(--container-px);
  /* ds-lint-ignore */
  font-family: system-ui, sans-serif;
  color: hsl(0 0% 12%);
  background: hsl(0 0% 98%);
}
.container { max-width: var(--container-max-w); margin: 0 auto; }
h1 { font-size: var(--h1-font-size); margin: 0 0 var(--spacing-md); line-height: 1.1; }
h2 { font-size: var(--h2-font-size); margin: 0 0 var(--spacing-md); line-height: 1.2; }
p { font-size: var(--text-base-font-size); margin: 0 0 var(--spacing-lg); line-height: 1.5; }
section { font-size: var(--text-sm-font-size); padding: var(--space-section) 0; border-top: 1px solid hsl(0 0% 80%); margin-top: var(--spacing-lg); }
.row { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-2xl); }
button { font-size: var(--text-sm-font-size); padding: var(--spacing-sm) var(--spacing-md); border: 1px solid hsl(0 0% 60%); background: white; cursor: pointer; }
`

const PANELS = [
  { label: 'Desktop', width: 1440 },
  { label: 'Tablet',  width: 768 },
  { label: 'Mobile',  width: 375 },
] as const

export function LivePreviewRow({ resultCss }: { resultCss: string }) {
  const srcdoc =
    `<!doctype html><html><head><style>${resultCss}\n${SAMPLE_CSS}</style></head><body>${SAMPLE_HTML}</body></html>`
  const remountKey = resultCss.length

  return (
    <section className="space-y-3 max-w-full mt-8">
      <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
        Live preview
      </h2>
      <p className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        Iframes at fixed widths (1440 / 768 / 375). `vi` units resolve to the
        iframe viewport — fluid scaling is visible at each width. Edit any input
        above to see all 3 panels update in real time.
      </p>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PANELS.map((panel) => (
          <div key={panel.width} className="flex-shrink-0 space-y-2">
            <div className="text-[length:var(--text-xs-font-size)] font-[var(--font-weight-medium)] text-[hsl(var(--muted-foreground))]">
              {panel.label} · {panel.width}px
            </div>
            <iframe
              key={`${panel.width}-${remountKey}`}
              title={`${panel.label} preview at ${panel.width}px`}
              srcDoc={srcdoc}
              width={panel.width}
              height={420}
              className="block border border-[hsl(var(--border))] rounded-md bg-white"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
