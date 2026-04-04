# CC Workflow Protocol

> **Brain:** Claude Opus (planning chat)
> **Hands:** Claude Code (local Windows)
> **User:** approval, manual tests

---

## Execution Flow

```
Brain does RECON (via CC audit or past context)
  │  ← includes: identify domains, read skills, check manifest
  ▼
Brain writes WP strategy (high-level phases + domain impact)
  │
  ▼
Brain writes Phase 1 prompt ONLY
  │  ← includes: domain context, invariants to preserve, Public API boundaries
  ▼
CC executes Phase 1 → Code → Verify → **Write Log** → Commit
  │
  ├── Simple task → CC executes, User sends log to Brain
  └── Complex task → CC writes plan first → Brain + User approve → CC executes
  │
  │  CC MUST before coding:
  │    1. Read domain skill: .claude/skills/domains/{slug}/SKILL.md
  │    2. Check Invariants (what must remain true)
  │    3. Check Traps (what goes wrong)
  │    4. Check Public API (what can be imported cross-domain)
  │
  │  CC MUST before committing:
  │    1. npm run arch-test (286 tests — path existence, parity, ownership)
  │    2. Write execution log
  │
  │  Log goes to: logs/wp-{NNN}/phase-{N}-result.md
  ▼
Brain reviews Phase 1 log
  │
  ├── ✅ OK → Brain writes Phase 2 prompt (based on ACTUAL results)
  └── ❌ Issue → fix now OR adjust plan
  │
  ▼
Repeat for each phase...
  │
  ▼
All phases done → CC gets all logs → CC plans doc updates
  │  ← includes: update domain skills if contracts changed
  ▼
Brain approves doc plan → CC updates docs → WP closed
```

---

## Rules

1. **Linear execution** — no skipping, no jumping ahead
2. **One phase at a time** — Brain writes ONLY the next phase prompt, waits for log, then writes next
3. **Recon before planning** — Brain must audit actual codebase state before writing WP (via CC or past context)
4. **Domain skill before coding** — CC reads `.claude/skills/domains/{slug}/SKILL.md` for every domain it touches
5. **Parallelize only when Brain says so**
6. **Every step logged** — `logs/wp-{NNN}/phase-{N}-result.md`
7. **No quick wins** — full linear path is fastest path
8. **Fix or log** — issues fixed immediately or go to known_gaps
9. **Docs updated at end** — not during, not before
10. **Adapt to reality** — each phase prompt incorporates learnings from previous phase logs
11. **`npm run arch-test` before every commit** — path existence, parity, ownership validated
12. **Use public entrypoints only** — cross-domain imports go through Public API listed in skills

---

## Anti-Patterns

### Writing all phases upfront

**Wrong:**
```
Brain writes WP with Phase 1, 2, 3, 4, 5 detailed prompts
CC executes all
```

**Why bad:** If Phase 1 reveals unexpected architecture, Phases 2-5 are invalid.

**Right:**
```
Brain writes WP overview (phases listed, not detailed)
Brain writes Phase 1 prompt
CC executes → log
Brain reads log → writes Phase 2 prompt (informed by Phase 1 results)
...repeat
```

### Planning from docs alone

**Wrong:**
```
Brain reads .context/ → writes detailed implementation
```

**Why bad:** Docs drift from reality. Code has nuances docs don't capture.

**Right:**
```
Brain requests RECON phase first
CC runs audit commands → reports actual state
Brain writes implementation based on ACTUAL state
```

### Coding without reading domain skill

**Wrong:**
```
CC gets task "fix block rendering" → starts reading source files randomly
```

**Why bad:** Domain skill has Traps (80% of bugs), Invariants (root causes), Blast Radius (what else breaks).

**Right:**
```
CC reads .claude/skills/domains/app-portal/SKILL.md
  → Traps explain the likely issue
  → Invariants define what must be true
  → Start Here gives the 3 key files
CC fixes with context, runs npm run arch-test
```

---

## RECON Phase (Phase 0)

Before writing any implementation phase, Brain should request audit:

```
# WP-XXX Phase 0: RECON

## Goal
Understand actual codebase state before implementation planning.

## Domain Analysis
1. Which domains does this work touch?
2. Read their skills: .claude/skills/domains/{slug}/SKILL.md
3. What invariants must be preserved?
4. What traps are documented for this area?

## Audit Commands
[specific grep/find/cat commands to understand current state]

## Questions to Answer
1. [specific question about architecture]
2. [specific question about existing code]

## Output
Report findings — do NOT write any code yet.
Include: affected domains, relevant invariants, potential traps.
```

---

## Debugging with Living Documentation

When CC encounters a bug during execution:

1. **Identify domain** — check `domain-manifest.ts` for owner of the file
2. **Read domain skill** — Traps section describes most common issues
3. **Check invariants** — the bug is usually a violated invariant
4. **Start Here files** — the 3 key files for understanding the data flow
5. **Blast Radius** — understand who else is affected before fixing

---

## Log Format

Each phase log captures:
- What was planned
- What was actually done
- Files created/modified
- Test results (**including `npm run arch-test` output**)
- Deviations from plan
- Issues found
- **Discoveries** — things learned that affect future phases

---

## Brain-CC Communication

**User's role:** Shuttle between Brain and CC
- Copy phase prompt from Brain → paste to CC
- Copy phase log from CC → paste to Brain
- Run manual tests when Brain requests
- Approve/reject at checkpoints

**Brain NEVER assumes** — if unsure about codebase state, request RECON first.
**CC NEVER skips domain skill** — if unsure about a domain, read the skill first.
