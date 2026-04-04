## Canonical References (Read These)

1. **CC Workflow Protocol (Brain ↔ Hands execution rules)**
   See: `CC-WORKFLOW.md`

2. **Workplan template (WP) — the strategy + phase map**
   See: `WP-TEMPLATE.md`

3. **Phase task template — the single-phase prompt handed to Claude Code**
   See: `TASK-TEMPLATE.md`

4. **Living Documentation — domain ownership, invariants, enforcement**
   See: `CLAUDE.md` (entry point) → `.claude/skills/domains/{slug}/SKILL.md` (per domain)

> Rule of thumb: **Workflow tells you *how* we move. WP tells you *what* we're building. Task tells you *exactly what to do next*. Domain skill tells you *what's true and what breaks*.**

---

## Mental Model

We separate roles to keep execution deterministic:

- **Brain (this chat / planning):** RECON → WP strategy → write *only the next phase prompt* → review logs → adapt.
- **Hands (Claude Code / implementation):** run audits, implement Phase N, verify, **write execution log**, commit.
- **User (approval + manual tests):** shuttles prompt/log between Brain and Hands, runs any requested manual checks.

This separation is mandatory because **reality updates every phase** (audit discoveries, drift, hidden dependencies).

---

## The Core Loop (Always Linear)

1. **RECON first (Phase 0)**
   Before making promises, we audit what's actually in the codebase.
   **Identify affected domains** via `src/__arch__/domain-manifest.ts`.
   **Read domain skills** for each affected domain before planning.

2. **Write a WP (strategy + phases, not prompts)**
   The WP is a map: problem → solution overview → "What changes" → phased plan → risks → acceptance criteria.
   Use the WP template. **Include Domain Impact section** — which domains are touched, which invariants matter.

3. **Execute one phase at a time**
   For Phase 1, Brain writes a **Phase Task** prompt using the task template.
   Hands executes Phase 1 → verifies (including `npm run arch-test`) → logs → commits.

4. **Review Phase log → then write Phase 2 prompt**
   Phase 2 is written only after Phase 1 evidence exists.
   No skipping. No "Phase 1-5 detailed prompts upfront."

5. **Repeat until all phases are complete**

6. **Docs are updated at the end (mandatory final phase)**
   WP's final phase is always "Documentation Update", based on actual logs.
   **Update domain skills if contracts changed.**

---

## What You Produce (Deliverables)

### A) Workplan (WP)
A single Markdown file following `WP-TEMPLATE.md`.
It must contain:
- Phases list (high-level), each with goals and verification
- **Domain impact: which domains are affected, key invariants**
- A mandatory final documentation phase
- Acceptance criteria (Definition of Done)
- Risks + mitigations
- Explicit file impact (new/modified/migrations)

### B) Phase Tasks (per phase)
Each phase is executed via a **Phase Task** prompt following `TASK-TEMPLATE.md`.
It must include:
- Phase 0 audit commands (**including domain skill read + manifest check**)
- Concrete "what to build" + integration notes
- Verification script (**including `npm run arch-test`**)
- Mandatory execution log instructions

### C) Execution Logs (per phase, evidence)
Each phase must produce a log file at `logs/wp-{NNN}/phase-{N}-result.md`.
Logs are not optional — they are the evidence used to:
- adjust the next phase prompt
- update docs accurately
- close a WP confidently

---

## Practical "Do This" Sequence

When you start a new piece of work:

1. **Read the workflow** (the rules of movement).
2. **Identify affected domains** (`src/__arch__/domain-manifest.ts`). Read their skills.
3. **Create a WP using the WP template** (strategy + phase map + domain impact).
4. **Write only Phase 1 Task prompt using the task template**.
5. **Run Phase 1, log, commit** (`npm run arch-test` in verification — always).
6. **Review the log, then write Phase 2 Task prompt**.
7. **Repeat until the final docs phase closes the WP**.

---

## Non-Negotiables (If You Remember Nothing Else)

- **RECON before planning.**
- **Read domain skill before modifying a domain.**
- **One phase at a time.**
- **Everything logged.**
- **`npm run arch-test` before every commit.**
- **Docs last, based on logs.**
- **Domain skills updated if contracts changed.**
