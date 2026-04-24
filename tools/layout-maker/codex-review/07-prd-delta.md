# Layout Maker PRD Delta

This document captures the product-level changes implied by the review.

It is not a full PRD. It is a delta against the current behavior.

## Product Positioning

### Current reality

Layout Maker already behaves like a structural forge and contract authoring tool.

### Required clarification

The product should explicitly position itself as:

- a layout contract forge
- a parity-faithful preview tool
- a validator

It should not present itself as:

- a content editor
- a page builder
- a publishing surface

## Product Boundary Changes

### Keep inside LM

- layout structure
- slot definitions
- nested slot structure
- responsive grid behavior
- slot visual parameters
- validation
- preview parity
- export handoff

### Keep outside LM

- content assignment
- publish status
- page lifecycle
- content ordering inside Studio
- theme/meta/hook authoring

## Required Product Rules

### Rule 1: No hidden contract divergence

If LM resolves a non-canonical breakpoint or other fallback behavior, the UI must expose it.

Implication:

- recovery logic is allowed
- silent masking is not allowed
- if editing at a canonical breakpoint will materialize a new canonical grid key, the UI must say so before the write

### Rule 2: No invalid editable controls

If a control does not have a valid and parity-safe downstream meaning for the current slot type, it must not be shown as editable.

Implication:

- current builds already enforce most container/sidebar gating
- remaining work is to make those rules auditable and regression-resistant

### Rule 3: Validation is part of authoring, not only export

Validation belongs to the main editing loop.

Implication:

- LM must show structural errors before export
- export should confirm readiness, not discover basic issues late

### Rule 4: LM should not surface Studio lifecycle semantics

Status and publish semantics belong to Studio.

Implication:

- LM should stop showing status
- LM export should eventually stop generating status once compatibility allows

## UX Strategy Changes

### From

- powerful editor with many controls
- diagnostics mostly at the end
- permissive UI with some hidden generator constraints
- hidden breakpoint fallback and hidden first-write canonicalization

### To

- stricter but more trustworthy authoring surface
- diagnostics throughout the flow
- UI that exposes only meaningful, contract-safe controls
- breakpoint behavior that makes preview state and write state explicit

## Success Criteria For The Delta

### Trust

- operators can explain what will be exported from what they see in UI
- operators are warned when current data diverges from canonical expectations
- operators can tell what the next edit will write when a canonical breakpoint key is missing

### Clarity

- operators can tell whether they are editing base, role-level, or breakpoint-level data
- operators can distinguish structural authoring from preview fixtures

### Boundary Hygiene

- LM UI contains no accidental Studio lifecycle concepts
- LM does not imply responsibility for content authoring

### Parity

- Inspector promises only what generator/export/Portal actually honor
- breakpoint behavior is legible and not silently normalized

## Product-Level Decisions To Preserve

The following should remain intact:

- YAML as source of truth
- Studio as downstream consumer
- operator-only mental model
- slot-based structural authoring
- support for all off-canvas modes
- `test-blocks` as local preview aid only

## Recommended Narrative For Internal Alignment

Suggested one-line description:

`Layout Maker is the operator tool for authoring, validating, previewing, and exporting layout contracts for Studio and Portal.`

Suggested boundary sentence:

`Layout Maker defines structure; Studio fills structure with content.`
