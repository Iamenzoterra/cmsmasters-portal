# Layout Maker Task List

This file turns the review into actionable development tasks.

## Epic 1: Breakpoint Truth

### Task 1.1

Display canonical breakpoint and resolved config separately.

Acceptance criteria:

- breakpoint bar shows canonical breakpoint label and width
- breakpoint bar shows resolved config key and width
- Inspector breakpoint section mirrors the same information

### Task 1.2

Disclose canonical-key materialization on first edit.

Acceptance criteria:

- if the active canonical key is missing, the UI explains what source config is currently being used
- the UI explains that the next edit will create `grid.<breakpoint>` from that source
- the first edit no longer creates hidden structure without prior disclosure
- after save, the newly materialized canonical key is visible in the UI

### Task 1.3

Add non-canonical breakpoint warnings.

Acceptance criteria:

- a warning badge appears when resolved config width differs from canonical width
- warning text explains export and authoring impact
- warning appears in validation summary as well

### Task 1.4

Audit and flag nearest-match breakpoint recovery.

Acceptance criteria:

- UI indicates when canonical matching required fallback resolution
- operators are not left with the impression that the current config is clean

## Epic 2: Live Validation

### Task 2.1

Run validation during editing, not just on export.

Acceptance criteria:

- validation state updates after meaningful edits
- validation results are stored in UI state
- validation can distinguish errors from warnings

### Task 2.2

Add a validation summary surface.

Acceptance criteria:

- summary is visible in the main workflow
- summary shows zero, warning, and error states
- clicking an item focuses or identifies the relevant slot/breakpoint

### Task 2.3

Block export when live validation already contains blocking issues.

Acceptance criteria:

- export action clearly reports blocked state
- export no longer becomes the first meaningful validation checkpoint

## Epic 3: Boundary And Workflow Clarity

### Task 3.1

Remove `status` from Export dialog.

Acceptance criteria:

- export UI no longer shows status
- operator-facing LM copy contains no lifecycle language

### Task 3.2

Add scope chips to Inspector sections.

Acceptance criteria:

- sections clearly show `Base`, `Role`, `Breakpoint override`, or `Grid-level`
- inheritance and reset behavior become easier to read

### Task 3.3

Add inheritance-source labels.

Acceptance criteria:

- inherited values name their source explicitly
- reset actions make the target source obvious

### Task 3.4

Regroup sidebar actions around the real workflow.

Acceptance criteria:

- actions are grouped into `Create`, `Transfer`, and `Manage`
- `Export` is visually stronger
- `Import` is visually demoted
- destructive actions remain isolated

### Task 3.5

Rename `Settings` to `Scopes`.

Acceptance criteria:

- top-level navigation and screen title use `Scopes`
- surrounding copy matches the narrower concept

## Epic 4: Inspector Hardening

### Task 4.1

Centralize Inspector capability logic.

Acceptance criteria:

- slot/control eligibility rules are auditable in one place
- future slot-type rules do not require duplicating ad hoc checks across many JSX branches
- current container/leaf/sidebar gating behavior is preserved

### Task 4.2

Add visible slot-type/context badges in Inspector.

Acceptance criteria:

- selected slot clearly shows `Leaf`, `Container`, `Sidebar`, or role context
- badge logic matches actual capability rules

### Task 4.3

Add regression coverage for container/sidebar gating.

Acceptance criteria:

- container slots do not regress to showing leaf-only controls
- sidebar-only trigger controls do not appear for non-sidebar slots

## Epic 5: Context Management

### Task 5.1

Replace external reload toast with a persistent banner.

Acceptance criteria:

- external YAML changes trigger a banner, not only a toast
- banner survives long enough to preserve context
- banner can optionally summarize the kind of change

### Task 5.2

Demote reference utilities while keeping them collapsed by default.

Acceptance criteria:

- `Slot Reference` remains collapsed by default
- `Design Tokens` remains collapsed by default
- both live in a clearly secondary utility area
- primary editing controls remain visually dominant

### Task 5.3

Add preview fixture messaging for `test-blocks`.

Acceptance criteria:

- block previews are labeled as local preview fixtures
- UI states that they are not exported to Studio
- empty preview state does not imply invalid layout authoring

## Epic 6: Stability

### Task 6.1

Remove render-phase Inspector draft-state sync.

Acceptance criteria:

- width/max-width drafts resync via effects or equivalent derived state, not `setState` during render
- slot switch, breakpoint switch, and external reload all keep inputs in sync

### Task 6.2

Verify responsive drawer inspection flows.

Acceptance criteria:

- no React internal error appears during breakpoint/drawer inspection
- responsive editing remains stable in `hidden`, `drawer`, and `push` states

## Suggested Delivery Order

1. Epic 1
2. Epic 2
3. Epic 6
4. Epic 3
5. Epic 4
6. Epic 5
