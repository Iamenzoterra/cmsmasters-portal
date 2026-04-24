# Layout Maker Audit Summary

## What Layout Maker Is

`Layout Maker` is an operator tool for authoring, validating, previewing, and exporting layout contracts for Studio and Portal.

It is not a content editor and it is not a publishing surface.

## Main Review Standard

Trust.

If the UI shows a thing, export and Portal must honor that thing.

## Core Problems

### 1. Hidden breakpoint divergence

The UI can present canonical breakpoint language while the underlying config resolves to non-canonical widths.

Result:

- canvas truth and export truth drift apart
- Portal behavior can differ from what the operator thinks they authored

### 2. Hidden first-write breakpoint materialization

When a canonical key is missing, the current edit path can create a new canonical grid entry as a side effect of the first edit.

Result:

- structure changes are written without enough UI disclosure
- operators cannot easily predict what YAML the next edit will create

### 3. Validation happens too late

Important structural problems are discovered mostly at export time.

Result:

- the tool guides too late for a forge/validator workflow

### 4. LM leaks Studio concepts

The export UI shows `status`, even though lifecycle belongs to Studio.

Result:

- blurred product boundary
- unnecessary semantic noise

### 5. Responsive inspection still has a stability bug

Responsive/drawer inspection can still surface a React internal error.

Result:

- reduced trust in Inspector state
- hesitation around breakpoint-specific editing

## Most Important Fixes

### P0

- expose canonical vs resolved breakpoint truth
- explain canonical-key materialization before first edit
- add live validation before export
- fix Inspector render-phase instability

### P1

- remove `status` from LM UI
- clarify base vs breakpoint vs role-level editing scope
- regroup sidebar actions around the real workflow
- improve external-change signaling
- harden Inspector capability logic and add slot-type/context badges

### P2

- reduce reference utility prominence further
- explain preview fixtures
- rename `Settings` to `Scopes`

## What Good Looks Like

An operator should be able to:

- understand what contract they are authoring
- see when data diverges from canonical expectations
- predict what the next edit will write when a canonical key is missing
- trust that every visible control has real downstream meaning
- export without surprises

## One-Line Product Positioning

`Layout Maker defines structure; Studio fills structure with content.`
