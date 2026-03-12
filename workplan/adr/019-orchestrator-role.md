---
id: 19
title: 'Orchestrator Role'
status: active
category: tooling
relatedADRs: [13, 17]
---

## Context

CMSMasters Portal is built by a hybrid team of human engineers and AI agents. ADR-13 (AI Support
Agent) introduced an AI assistant for end-user support tickets. ADR-17 (Monorepo Nx) established
the workspace structure within which all apps and packages live. However, no decision had been made
about how AI-assisted tasks are coordinated across the project planning, code generation, review,
and integration lifecycle.

Without a defined orchestration model, agents operate independently, may produce conflicting
artefacts, duplicate work, or exceed their intended scope. A human or system must decide task
boundaries, retry policy when an agent fails, escalation paths when output does not meet acceptance
criteria, and how agent actions are audited.

## Decision

Introduce an **AI Orchestrator** role responsible for coordinating project planning and agent
execution across all CMSMasters Portal work streams.

The orchestrator operates as follows:

- **Task dispatch:** The orchestrator receives a structured task (epic, story, task with acceptance
  criteria) and assigns it to the appropriate agent (code generation, review, integration, QA).
  Task assignments are stored as worktree branches following the `worktree-task-{id}` convention
  established in the Nx monorepo (ADR-17).
- **Agent boundaries:** Each agent receives a scoped task with explicit input files, output files,
  and acceptance criteria. Agents must not modify files outside their declared scope without
  escalating to the orchestrator.
- **Retry and escalation policy:** If an agent's output fails verification (build error, lint
  failure, AC not met), the orchestrator retries the task once with additional context. On second
  failure the task is escalated to a human reviewer with a structured failure report.
- **Audit trail:** Every agent execution produces a log file under `logs/{epic}/` (e.g.
  `logs/data-layer/CMS-286.md`). Logs include what was implemented, key decisions, verification
  results, and the git commit SHA. This audit trail is stored in the repository itself for
  reviewability without external tooling.
- **Integration surface with Supabase (ADR-18):** When an agent task modifies database schema or
  RLS policies, the orchestrator ensures the corresponding migration file and `supabase gen types`
  update are part of the same commit, preventing schema/type drift.

## Consequences

**Positive:**
- Explicit task boundaries prevent agents from overwriting each other's work.
- Audit logs in-repo make the AI contribution history visible to all team members via `git log`.
- Retry/escalation policy surfaces failures early rather than silently accumulating broken state.

**Negative / Trade-offs:**
- **Orchestration overhead:** Each task now requires a structured brief (files, AC, scope
  declaration). Writing briefs is additional upfront work for human leads.
- **Log discipline:** The audit trail only has value if every agent execution writes its log
  correctly. If an agent skips the log step, the audit trail has gaps. Enforcement is by convention,
  not by technical constraint.
- **Agent task boundaries vs. emergent refactoring:** Strict file-scope rules may prevent an agent
  from fixing an obvious adjacent bug. Agents must escalate rather than fix, which can slow
  iterations.
- **Integration with ADR-13:** The AI Support Agent (ADR-13) operates at runtime in response to
  user tickets. The orchestrator operates at development time. These are separate concerns; the
  orchestrator does not manage runtime AI agents.
- **Tooling maturity:** The orchestrator role is implemented through Claude Code with structured
  prompts and worktrees. If the underlying AI model is upgraded or changed, prompt contracts may
  need revision to maintain consistent output quality.
