# Layout Maker Engineering Spec

This document defines the implementation-oriented engineering surface for the review changes.

## 1. Inspector Capability Logic

### Objective

Harden the current Inspector gating without pretending the current build is still completely ungated.

### Required Structure

Introduce a centralized capability definition layer or equivalent shared helper that maps:

- field or section id
- slot traits
- scope behavior
- downstream support status

Example dimensions:

- `isContainer`
- `isLeaf`
- `isSidebar`
- `isTopOrBottom`
- `isGridParticipant`
- `supportsPerBreakpoint`
- `supportsRoleLevelOnly`

### Expected Output

Inspector visibility should derive from centralized capability logic rather than from duplicated ad hoc checks spread across many JSX branches.

### Engineering Constraints

- avoid duplicating slot-type logic across multiple components
- keep the capability source readable enough to audit against product rules
- preserve currently correct container/sidebar gating while refactoring

## 2. Breakpoint Truth Model

### Objective

Expose canonical breakpoint state, resolved config state, and first-write behavior separately.

### Required Data Model

For the active viewport state, compute:

- `canonicalBreakpointId`
- `canonicalBreakpointWidth`
- `resolvedGridKey`
- `resolvedGridMinWidth`
- `hasCanonicalGridKey`
- `willMaterializeCanonicalKey`
- `materializationSourceKey`
- `isNonCanonicalMatch`
- `isFallbackResolved`

### Required UI Consumers

- breakpoint bar
- Inspector breakpoint section
- validation system
- edit-target hinting near breakpoint-specific controls

### Engineering Constraints

- preserve existing recovery behavior for loading old layouts
- do not silently collapse canonical and resolved states into one display string
- do not let the first breakpoint-specific write materialize a canonical key without clear UI disclosure

## 3. Live Validation Pipeline

### Objective

Run contract validation continuously during editing.

### Required Data Flow

Validation should run after:

- slot role changes
- slot visual changes
- nested-slot changes
- grid property changes
- breakpoint property changes
- layout property changes

### Validation Output Shape

Use a normalized UI result:

- `errors: ValidationItem[]`
- `warnings: ValidationItem[]`

Each item should support:

- `id`
- `severity`
- `message`
- `slotName?`
- `breakpointId?`
- `field?`

### Engineering Constraints

- reuse existing runtime validation rules when possible
- do not fork product rules in two places without a clear owner
- if runtime validation cannot be shared directly, keep UI validator intentionally narrow and additive

## 4. Export Guarding

### Objective

Prevent export from being the first place where invalid state becomes visible.

### Required Behavior

- if blocking errors exist in live validation, disable or intercept export
- export modal should explain why export is blocked before payload generation
- runtime validation remains authoritative on submit

### Engineering Constraints

- client-side validation must not replace runtime validation
- blocked export state must stay in sync with live validation state

## 5. External Change Banner

### Objective

Replace transient reload feedback with durable context signaling.

### Required State

Track:

- `externalChangeVisible`
- `externalChangeSummary?`
- `externalChangeTimestamp`

### Trigger

Set banner state when SSE reports a change for the active layout and the layout reload completes.

### Clear Conditions

Banner may clear on:

- explicit dismiss
- selecting another layout
- successful export

### Engineering Constraints

- keep this distinct from generic toast messaging
- do not rely on timing alone for visibility

## 6. Sidebar Action Grouping

### Objective

Reflect workflow priority in sidebar layout.

### Required Group Model

- `Create`
- `Transfer`
- `Manage`

### Engineering Constraints

- keep button behavior unchanged in first pass
- change grouping and hierarchy before deeper redesign

## 7. Export Surface Cleanup

### Objective

Remove lifecycle noise from LM UI.

### Required Change

- hide `status` from `ExportDialog`

### Follow-up Change

- remove `status` from payload generation once Studio ingest owns it

### Engineering Constraints

- preserve compatibility while compatibility is still required
- separate UI removal from payload removal if rollout must be staged

## 8. Reference Utility Demotion

### Objective

Reduce primary-flow noise while preserving the current collapsed-by-default behavior.

### Required Change

- keep `Slot Reference` collapsed by default
- keep `Design Tokens` collapsed by default
- place both in a clearly secondary utility region

### Engineering Constraints

- preserve token search/filter capability
- avoid remounting expensive sections unnecessarily if collapse becomes stateful

## 9. Inspector Stability

### Objective

Remove render-phase state updates that destabilize responsive inspection.

### Required Change

- move draft synchronization for width/max-width inputs into effects or equivalent derived state
- avoid calling `setState` during render in response to slot, breakpoint, or external config changes
- verify slot switch, breakpoint switch, and SSE reload flows explicitly

### Engineering Constraints

- preserve current draft-edit UX
- do not let external reloads leave stale values in draft inputs

## 10. Suggested Technical Breakdown

### Package A

- breakpoint truth state
- materialization hinting
- warning badges

### Package B

- live validation
- export blocking

### Package C

- status removal from export UI
- sidebar grouping
- scope chips
- inheritance labels

### Package D

- Inspector capability hardening
- slot-type/context badges

### Package E

- external change banner
- reference utility demotion
- preview fixture messaging

### Package F

- Inspector stability remediation
