# Layout Maker UI/UX Audit

This audit evaluates `Layout Maker` as an operator tool for authoring layout contracts for Studio and Portal.

The main review criterion is not aesthetics. It is operator trust.

If the interface shows something that export or Portal does not actually honor, that is a defect.

## Critical Findings

### 1. Breakpoint truth is still masked instead of exposed

The UI presents canonical breakpoint labels such as `tablet`, while the actual config may resolve to a non-canonical width such as `1400px`.

There is a second trust problem on top of that: when a canonical key is missing, the current edit path can materialize a new canonical grid entry cloned from the fallback source without warning the operator first.

Impact:

- operators can believe they are editing an existing tablet config when they are actually previewing a nearest-match fallback
- a first edit can write new structure to YAML as a side effect that was never explained in UI
- parity between canvas truth, edit truth, and export truth becomes unreliable

Required direction:

- show canonical breakpoint and resolved config separately
- warn whenever the resolved config diverges from canonical expectations
- explain when the next edit will materialize a canonical grid key from a fallback source

### 2. Validation feedback arrives too late

The tool acts like a forge and validator, but most meaningful validation only becomes visible at export time.

Impact:

- operators spend time editing in an invalid state
- the tool fails late instead of guiding early
- export becomes a surprise checkpoint instead of a final confirmation

Required direction:

- validate continuously during editing
- expose errors and warnings before export
- make invalid states legible in the main workflow

### 3. Runtime stability is still a UX issue

During live inspection on April 23, 2026, the UI surfaced a React internal error in responsive/drawer inspection flows.

This matters as UX, not only engineering debt, because this tool depends on operator confidence.

Likely code-level cause:

- Inspector draft state is synchronized during render for width/max-width inputs, which is a risky pattern under responsive slot switching and external reloads

Impact:

- reduced trust in state accuracy
- hesitation around breakpoint-specific editing
- unclear whether the current Inspector values are authoritative

Required direction:

- move Inspector draft-state resync out of render and into effects or equivalent derived state
- verify breakpoint, drawer, and external-reload inspection paths explicitly
- treat runtime stability as part of UX quality, not a separate cleanup lane

## Major Findings

### 4. Inspector gating is better than before, but still too implicit to audit

The current build already avoids several of the earlier trust failures:

- container and leaf editing paths are mostly separated
- drawer-trigger label/icon/color controls are already sidebar-only
- reference utilities already start collapsed

The remaining problem is that the rule system is still spread across JSX branches and slot-name heuristics.

Impact:

- hard to audit why a control is shown
- easy to regress slot-type behavior in future edits
- no visible slot-type/context cue for operators

Required direction:

- centralize slot capability logic in one auditable place
- add visible slot-type/context badges in Inspector
- add regression coverage for container/sidebar gating

### 5. Layout Maker leaks Studio-only concepts into its UI

The export surface shows `status`, even though LM has no status model of its own.

Impact:

- boundary confusion between LM and Studio
- unnecessary semantic noise for operators
- a stronger impression that LM is responsible for lifecycle decisions that belong elsewhere

Required direction:

- remove `status` from LM UI immediately
- later remove it from LM payload generation when ingest compatibility allows

### 6. Editing scope is powerful but not sufficiently legible

The real editing model is `selected slot x active breakpoint`, with additional distinctions between:

- base values
- per-breakpoint overrides
- role-level fields
- grid-level controls

The tool supports this model, but the UI explains it weakly.

Impact:

- high cognitive load
- frequent operator uncertainty about where a change is actually stored
- difficult debugging of inheritance behavior

Required direction:

- label each Inspector section with its storage scope
- show inheritance source explicitly
- make base vs override decisions visible at the point of editing

### 7. External file changes are acknowledged too softly

When YAML changes externally, the UI reloads and shows a toast.

Technically that is correct, but UX-wise it is too weak for a tool where the operator is building a structural model.

Impact:

- silent loss of local mental context
- difficult recovery after external edits
- poor awareness of why the interface suddenly changed

Required direction:

- promote external changes to a more persistent banner-level interruption
- summarize what kind of structural change occurred when possible

### 8. Primary and secondary actions are mixed in the sidebar

The left sidebar combines daily actions and rare actions in one undifferentiated stack:

- `New`
- `Import`
- `Rename`
- `Clone`
- `Export`
- `Delete`

Impact:

- weak workflow signaling
- unnecessary visual importance for rare actions such as `Import`
- no clear progression toward the primary final action, which is `Export`

Required direction:

- regroup actions by task phase
- visually prioritize export as the main downstream handoff

## Minor Findings

### 9. Breakpoint bar is information-dense in a debug-heavy way

The breakpoint bar is useful, but it combines too many concerns at once:

- breakpoint switching
- viewport width
- resolved grid key
- widths
- gap
- shortcuts
- device presets

Impact:

- high scanning cost
- weak visual hierarchy between controls and diagnostics

Required direction:

- distinguish control region from diagnostic region
- reduce the feeling of a debug ribbon

### 10. `test-blocks` behavior is under-explained

Preview fixtures appear in the canvas, but their role as local authoring aids is not clearly communicated in product language.

Impact:

- confusion about whether blocks are part of export
- confusion about why some slots render content and others do not

Required direction:

- explain that preview blocks are fixtures only
- state clearly that they are not exported to Studio

### 11. Reference utilities are collapsed, but still compete with editing controls

The current build already defaults `Slot Reference` and `Design Tokens` to closed, which is a meaningful improvement.

The remaining issue is placement: they still live in the same main Inspector scroll path as primary editing controls.

Impact:

- reduced focus
- longer visual paths between action and feedback

Required direction:

- keep them collapsed by default
- move them into a clearer utility zone, secondary tab, or lower-priority drawer

### 12. `Settings` is too broad a label

That section currently manages `scopes`, not a full application settings system.

Impact:

- misleading navigation semantics
- larger-than-necessary conceptual footprint

Required direction:

- rename it to `Scopes`, or move it into project-level secondary configuration

## What Already Works Well

- The three-panel structure is correct for this class of tool.
- The separation between structural authoring and block assignment is conceptually strong.
- Canvas plus Inspector is the right interaction pairing.
- Slot roles, nested slots, and off-canvas modes already provide a capable authoring foundation.
- Inspector now distinguishes container vs leaf editing more clearly than earlier builds.
- Reference utilities already starting collapsed reduces some of the original noise.

## Priority Summary

### P0

- expose breakpoint divergence and canonical-key materialization explicitly
- move validation into the live editing flow
- fix Inspector render-phase instability in responsive/drawer inspection

### P1

- remove Studio status semantics from LM UI
- make editing scope more legible
- improve external-change signaling
- regroup sidebar actions around the real workflow
- harden Inspector capability logic and add slot-type/context badges

### P2

- reduce reference utility prominence further
- explain `test-blocks`
- reframe `Settings` as `Scopes`
- simplify the breakpoint bar hierarchy
