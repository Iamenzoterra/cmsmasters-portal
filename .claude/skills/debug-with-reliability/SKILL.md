---
name: debug-with-reliability
description: How to use the Living Documentation system to find and fix bugs. Skill-first debugging — use domain skills as diagnostic maps instead of guessing.
type: workflow
---

# Debug with Living Documentation

## When to Use

When you have a bug, unexpected behavior, or "something doesn't work" — before reading random source files.

## The Algorithm

### Step 1: Identify the domain

Ask: **which domain owns this behavior?**

```
"Block preview blank"         → studio-blocks (preview iframe, block-editor)
"Token suggestions wrong"     → studio-blocks (block-processor, token-map)
"Theme page not rendering"    → app-portal (BlockRenderer, hooks, blocks.ts)
"API returns 401"             → app-api (auth middleware, JWT validation)
"Login not working"           → pkg-auth (PKCE flow, magic link, callback)
"Block styles leaking"        → app-portal (CSS scoping .block-{slug})
"Save fails in editor"        → studio-core (block-api authHeaders, CRUD)
"Tokens look wrong"           → pkg-ui (tokens.css, Tailwind conventions)
"Revalidation not working"    → app-portal (revalidate route) + app-api (revalidate call)
"Type error after DB change"  → pkg-db (types.ts auto-generated)
```

If unclear → check `src/__arch__/domain-manifest.ts` → use `getOwnerDomain('path/to/file')` from `helpers.ts`.

### Step 2: Read the skill

```
.claude/skills/domains/{slug}/SKILL.md
```

Read in this order:

1. **Traps & Gotchas** — the bug is probably already described here. Most "unexpected behaviors" are documented traps.

2. **Invariants** — what MUST be true. If one is violated → that's your root cause.

3. **Start Here** — the 3 key files. Open them to understand the data flow.

4. **Blast Radius** — who depends on this? Is the bug actually here or downstream?

### Step 3: Check the invariant

The bug is almost always a **violated invariant**. Use the skill to check:

| Symptom | Domain | Invariant to check |
|---------|--------|--------------------|
| Block preview blank | studio-blocks | "Preview uses srcdoc — CSP can block" (Trap) |
| Token suggestions stale | studio-blocks | "token-map has hardcoded values — must update after tokens.css sync" (Trap) |
| Theme page 404 | app-portal | "getThemeBySlug uses .eq('status', 'published')" — draft themes invisible |
| New page not showing | app-portal | "SSG pages built at deploy — need revalidation" (Trap) |
| Styles leak between blocks | app-portal | "CSS scoping: .block-{slug} prefix" (Invariant) |
| 401 on API call | app-api | "auth middleware validates via supabase.auth.getUser(token)" |
| Profile not found on login | pkg-auth | "on_auth_user_created trigger race condition" (Trap) |
| RequireAuth flickers | pkg-auth | "fetchedUserIdRef skips re-fetch on token refresh" (Invariant) |
| Wrong data from mappers | pkg-db | "mappers.ts has no runtime validation" (Known Gap) |
| All API wrappers broken | studio-core | "block-api.ts authHeaders/parseError used by ALL wrappers" (Invariant) |

### Step 4: Verify with arch tests

```bash
npm run arch-test
```

If tests pass but bug exists → the invariant isn't tested yet (note it in known_gaps).
If tests fail → the failure message tells you what's wrong.

### Step 5: Fix → verify → check blast radius

1. Fix the root cause (not the symptom)
2. `npm run arch-test` — all green
3. Re-read skill's **Blast Radius** — did your fix break downstream?
4. If you discovered a new trap → add it to the skill's Traps section

## Prompt Templates

### For bug fix:

```
Bug: [description].

1. Identify domain via domain-manifest.ts or getOwnerDomain()
2. Read .claude/skills/domains/{slug}/SKILL.md
3. Check Traps — is this bug already documented?
4. Check Invariants — which invariant is violated?
5. Find root cause via Start Here files
6. Fix, run npm run arch-test
```

### For unexpected behavior:

```
[Component/file X] behaves unexpectedly: [description].

Before reading code:
1. Find domain owner in domain-manifest.ts (owned_files)
2. Open the domain skill
3. Read Traps & Gotchas — is this documented behavior?
4. If not — check Invariants and find the violated one
```

### For cross-domain issue:

```
Problem at boundary of [domain A] and [domain B]: [description].

1. Read skills of both domains
2. Check Public API — is A importing correctly from B?
3. Check allowed_imports_from in domain-manifest.ts
4. npm run arch-test — boundary violation?
```

## Anti-patterns

**DO NOT:**
- Grep all apps/ blindly → identify the domain first, then read 3 Start Here files
- Fix the symptom without understanding the invariant → read Invariants
- Ignore Blast Radius → your fix may break 5 other files
- Fix and skip arch-test → you might violate a boundary or parity check
- Add workarounds instead of fixing root cause → check why the invariant was violated

## The Key Insight

**Skill = diagnostic map.** Traps describe 80% of "unexpected behaviors". Invariants describe 100% of "what must be true". If the bug isn't described as a trap and doesn't violate an invariant — you found a new trap. Add it.
