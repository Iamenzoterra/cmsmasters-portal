# Tests — strategy split

Block Forge Core has two distinct test modes. Both live here; know which one you're writing.

## Per-heuristic and per-function unit tests

Inline synthetic CSS/HTML strings as test input. Short, focused, read like tables. No fixture files. Pin trigger/non-trigger/adaptive-skip/confidence contracts cleanly.

Files: `analyze-block.test.ts`, `heuristic-*.test.ts`, `apply-suggestions.test.ts`, `emit-tweak.test.ts`, `compose-variants.test.ts`, `render-preview.test.ts`, `rules-dispatcher.test.ts`, `smoke.test.ts`.

## Snapshot test

`snapshot.test.ts` runs the full pipeline `analyze → suggest → applyAll → compose → renderForPreview` against the 3 frozen real-block fixtures under `fixtures/`. It captures end-to-end behavior on actual content shapes.

Grid and root-flex-row heuristics do not currently fire on any block in `content/db/blocks/`. The snapshot chronicles this — it is information, not a coverage gap. Per-heuristic unit tests exercise those heuristics with synthetic inputs.

## When to update

- Inline test fails → probably the heuristic / compose function changed behavior. Update test if intentional, investigate if not.
- Snapshot fails → either the engine changed OR a fixture's source JSON drifted (never run `/content-pull` into `fixtures/`). Re-run `sha256sum` against the source paths in `fixtures/README.md` first. If source matches and snapshot changed, update snapshot deliberately.
