# Layout Maker Playwright Visual Pass

This note records a browser-based sanity check of the current `Layout Maker` UI against the review bundle.

Date of pass:

- April 23, 2026

Environment:

- local app at `http://localhost:7700`
- layout used for most checks: `theme-page-layout`

Artifacts captured during the pass:

- `codex-review-theme-page-layout-desktop.png`
- `codex-review-theme-blocks-inspector.png`
- `codex-review-theme-blocks-tablet.png`
- `codex-review-export-dialog.png`
- `codex-review-settings-page.png`

## What The Browser Pass Confirmed

### 1. Breakpoint truth still needs a primary-surface treatment

Observed:

- the breakpoint bar shows `Viewport: 768px` and `Grid: tablet`
- the Inspector shows a more truthful line: `tablet -> tablet (1400px)`

Interpretation:

- the real breakpoint contract is available, but not on the operator's primary reading path
- the review direction is correct: canonical breakpoint, resolved config, and edit target should be visible together in the breakpoint surface itself

### 2. Inspector stability issue is real and reproducible

Observed:

- switching from desktop to tablet triggered a React internal error in the browser console

Console error captured:

- `Internal React error: Expected static flag was missing. Please notify the React team.`

Interpretation:

- the stability track in the review is not speculative
- responsive/drawer inspection still needs concrete remediation

### 3. Export surface still leaks Studio lifecycle semantics

Observed:

- the export modal still displays `status: draft`

Interpretation:

- the review item about removing `status` from LM UI remains valid

### 4. Settings/Scopes naming mismatch is visually obvious

Observed:

- sidebar navigation says `Settings`
- page heading says `Settings`
- the actual screen content is a scopes registry

Interpretation:

- the rename/reframe to `Scopes` is justified by the current UI, not only by architecture

### 5. Reference utilities are already collapsed by default

Observed:

- `Slot Reference` is collapsed by default
- `Design Tokens` categories are collapsed by default

Interpretation:

- the earlier review claim that collapse itself was still missing is outdated
- the remaining issue is placement and prominence, not default-open state

### 6. Sidebar actions still read as a flat stack

Observed:

- `New`, `Import`, `Rename`, `Clone`, `Export`, `Delete` still appear as one undifferentiated action column

Interpretation:

- the regrouping proposed in the review would improve scanability and workflow clarity immediately

## Resulting Confidence In The Review Bundle

The Playwright pass increased confidence in these review tracks:

- breakpoint truth and canonical-key materialization disclosure
- live validation before export
- export UI cleanup
- `Settings` to `Scopes`
- sidebar workflow regrouping
- Inspector stability remediation

The Playwright pass also confirmed that this item should stay framed as follow-up hardening, not as an unfixed core defect:

- reference utilities are already collapsed by default

## Recommended Next Implementation Slice

If implementation starts from the highest-clarity/highest-signal slice, the browser pass suggests this order:

1. breakpoint truth surface
2. Inspector stability fix
3. export UI cleanup
4. `Settings` to `Scopes`
5. sidebar action regrouping
