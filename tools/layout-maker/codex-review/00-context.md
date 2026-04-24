# Layout Maker Review Context

## Product Model

`Layout Maker` is an operator-facing forge for creating and exporting layout contracts for Studio and Portal.

Primary flow:

1. Create or open a layout.
2. Define slot structure, grid, responsive behavior, and slot parameters.
3. Export from Layout Maker.
4. Import into Studio.
5. Assign blocks to slots in Studio.
6. Produce the final page from the mapped layout.

## Canonical Architecture Decisions

- YAML on disk is the canonical source of truth.
- Layout Maker is a structural forge + validator + parity-faithful preview.
- Layout Maker is not a WYSIWYG content editor.
- Studio is the downstream consumer.
- Studio owns block assignment, theme/meta content, hooks, publishing, and status.
- `test-blocks` are a local authoring/preview aid only.
- `allowed-block-types` are hints for Studio, not an LM rendering contract.
- All off-canvas modes are considered supported: `visible`, `hidden`, `drawer`, `push`.

## Domain Model Notes

- The model is slot-based, with all slots stored in one flat map.
- Hierarchy is expressed through `nested-slots`.
- `top` and `bottom` slots are role-based and sit outside the grid.
- Canonical breakpoints are `desktop`, `tablet`, and `mobile`.
- Non-canonical breakpoint keys or `min-width` values are tolerated by code today, but should be treated as data-integrity defects, not as acceptable legacy behavior.

## Policy Decisions For This Review

### 1. Breakpoint leniency

`resolveGridKey()` nearest-match behavior is a recovery path, not a valid authoring model.

Review consequence:

- any hidden mismatch between canonical breakpoint labels and real config widths is a defect
- the UI should expose the divergence explicitly

### 2. Status in export

`status: 'draft'` is not part of Layout Maker's product model.

Review consequence:

- it is an architectural smell
- it is also a UX smell if surfaced in LM UI

### 3. Container controls

If a container slot receives leaf-only controls in Inspector, that is a confirmed bug, not an open question.

Review consequence:

- Inspector/generator mismatches are defects by default
- parity is treated as a strict requirement, not a soft aspiration

## Audit Standard

The main review standard is trust:

- if Layout Maker shows a value, the exported contract and Portal behavior must honor it
- if the UI allows editing something, that edit must have a valid downstream meaning
- if the UI hides a structural divergence, the tool is lying to the operator
