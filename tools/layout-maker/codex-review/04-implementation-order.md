# Layout Maker Implementation Order

This document turns the fix plan into a pragmatic execution sequence.

## Phase 1: Contract Truth

### Goal

Remove the biggest remaining trust failures first.

### Work Items

1. Expose canonical vs resolved breakpoint state.
2. Disclose canonical-key materialization before first edit.
3. Add non-canonical breakpoint warnings.
4. Add live validation summary with blocking and non-blocking states.
5. Block export earlier when live validation already fails.

### Why First

These are the changes that directly reduce operator misunderstanding about what the tool is reading, writing, and exporting.

### Expected Outcome

- breakpoint truth becomes legible
- first edits no longer create hidden structure without explanation
- export errors become less surprising

## Phase 2: Boundary And Workflow Clarity

### Goal

Make the interaction model easier to follow without changing the core architecture.

### Work Items

1. Remove `status` from `ExportDialog`.
2. Add scope chips to Inspector sections.
3. Add explicit inheritance-source labels.
4. Regroup sidebar actions by workflow phase.
5. Demote `Import` visually.
6. Strengthen `Export` visually.
7. Rename `Settings` to `Scopes`.

### Expected Outcome

- lower cognitive load
- clearer progression through the tool
- cleaner product boundary between LM and Studio

## Phase 3: Inspector Hardening

### Goal

Make current slot gating auditable and regression-resistant.

### Work Items

1. Centralize slot capability logic in one auditable place.
2. Add visible slot-type/context badges.
3. Add targeted regression coverage for container/sidebar gating.

### Expected Outcome

- easier to understand why controls appear
- less risk of reintroducing invalid controls
- better operator context in the Inspector

## Phase 4: Context Management

### Goal

Improve resilience and clarity around state changes and secondary information.

### Work Items

1. Replace external-change toast with a persistent banner.
2. Add lightweight structural diff hints on reload.
3. Move collapsed reference utilities into a clearer secondary area.
4. Add product-language messaging for preview fixtures.

### Expected Outcome

- better awareness of context changes
- reduced visual clutter
- better distinction between editing and reference

## Phase 5: Stability

### Goal

Remove the remaining runtime instability in responsive/drawer inspection.

### Work Items

1. Move Inspector draft-state synchronization out of render.
2. Verify slot switching, breakpoint switching, drawer states, and external reload flows.

### Expected Outcome

- no React internal error during inspection
- draft inputs stay in sync without unsafe render-time updates
- responsive editing feels stable

## Suggested Delivery Shape

### Milestone A

- breakpoint truth state
- materialization disclosure
- non-canonical warnings

### Milestone B

- live validation
- export blocking
- `status` removal from export UI

### Milestone C

- scope chips
- inheritance labels
- sidebar regrouping
- `Settings` to `Scopes`

### Milestone D

- Inspector capability hardening
- slot-type/context badges
- stability fix

### Milestone E

- external reload banner
- reference utility demotion
- preview fixture messaging

## Fastest High-Value Sequence

If capacity is limited, do this exact order:

1. breakpoint mismatch and materialization warnings
2. live validation summary
3. Inspector stability fix
4. remove `status` from export UI
5. scope chips and sidebar regrouping
