# Layout Maker Acceptance Checklist

Use this checklist to verify the review changes after implementation.

## Breakpoint Truth

- Breakpoint bar shows canonical breakpoint separately from resolved config.
- Non-canonical resolved widths are visibly flagged.
- Fallback nearest-match resolution is communicated to the operator.
- If the canonical key is missing, the UI explains whether the next edit will materialize it.
- After the first canonicalizing edit, the new canonical key is visible in the UI.
- Operators can tell both what width export will use and what structure the next edit will write.

## Validation

- Validation runs during editing, not only on export.
- Blocking errors are visible before export is opened.
- Warnings are visible but non-blocking.
- Validation messages identify the relevant slot or breakpoint when possible.
- Export no longer acts as the first discovery point for structural problems.

## Export Surface

- Export UI does not show `status`.
- Export clearly reports blocked state when live validation contains errors.
- Export preview remains focused on handoff-relevant data only.

## Workflow Clarity

- Sidebar actions are grouped by workflow phase.
- `Export` is visually stronger than `Import`.
- `Delete` remains clearly destructive.
- Inspector sections show scope labels such as `Base`, `Role`, or breakpoint override.
- Inherited values identify their source clearly.
- `Settings` is renamed or reframed as `Scopes`.

## Inspector Trust

- Container slots do not expose leaf-only controls.
- Sidebar-only trigger controls appear only for sidebar slots.
- Selected slot type or context is visible in Inspector.
- Capability logic is centralized or covered by targeted regression coverage.
- Inspector controls no longer suggest edits that generator/export silently ignore.

## Context Handling

- External YAML reloads show a persistent banner, not only a toast.
- Operators can tell that the current layout was reloaded from disk.
- Reference utilities remain collapsed by default and visually secondary.
- Preview fixtures are labeled as non-exported authoring aids.

## Product Boundary

- LM UI contains no Studio lifecycle language.
- LM UI does not imply that preview fixtures are part of export.
- LM continues to focus on structure, validation, preview, and export only.

## Stability

- No React internal error appears during responsive/drawer inspection flows.
- Breakpoint switching remains stable.
- Drawer/push inspection remains stable.
- Draft input values stay in sync after slot changes, breakpoint changes, and external reloads.
- Inspector no longer performs render-phase state sync for responsive draft fields.

## Final Trust Test

- For a layout with clean canonical breakpoint data, the UI truth matches export truth.
- For a layout with non-canonical breakpoint data, the UI clearly warns about divergence.
- For a missing canonical breakpoint key, the UI explains what the first edit will create.
- For a container slot, the UI no longer promises leaf behavior.
- An operator can describe what will be exported without reading the code.
