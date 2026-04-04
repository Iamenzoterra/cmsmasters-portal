---
domain: app-command-center
description: "Internal project management tool. Own dark theme, fully isolated from Portal DS."
source_of_truth: src/__arch__/domain-manifest.ts
status: skeleton
---

## Start Here

1. `apps/command-center/app/page.tsx` — dashboard home page
2. `apps/command-center/tailwind.config.ts` — own dark zinc theme definition
3. `apps/command-center/lib/data.ts` — data loading from workplans/ADRs

## Public API

(none — fully isolated internal tool, no other domains import from it)

## Traps & Gotchas

- **Own dark theme.** CC uses hardcoded zinc colors in its tailwind.config.ts. Do NOT apply Portal DS tokens.
- **`ui/` directory is CC-local components** — Card, Input, Modal, etc. These are NOT from @cmsmasters/ui.
- **localhost:4000 only.** Not deployed to production. Dev-only tool.
