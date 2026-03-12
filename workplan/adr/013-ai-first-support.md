---
id: 13
title: AI-First Support
version: 1
status: active
category: roles-security
relatedADRs: [11, 18]
supersededBy: null
date: 2026-03-12
---

## Context

The Support app serves customers who need help with CMSMasters products — theme setup, licensing, and plugin configuration. Traditional ticket-based support creates a bottleneck: support agents handle a high volume of repetitive questions that could be resolved without human intervention. The five-role model defined in ADR-011 identifies support agent as a distinct role, but the original scope assumed human-only triage. As the product catalog grows across 65 themes and multiple plugins, an AI-first deflection layer becomes necessary to scale support without linearly growing the agent headcount. ADR-018 defines the infrastructure backbone that provides the Supabase and Edge Function primitives on which this support layer is built.

## Decision

The Support app adopts an AI-first workflow: every inbound support request is first routed through an AI resolution layer before reaching a human support agent. The pipeline is as follows:

1. **RAG pipeline** — customer questions are matched against a vector index of documentation, theme changelogs, and historical resolved tickets. Retrieval is powered by pgvector embeddings stored in Supabase (as established in ADR-018), enabling semantic similarity search across the full support knowledge base.
2. **Claude API** — retrieved context is passed to the Claude API to generate a contextually accurate, product-specific response. Claude was chosen over alternative LLMs (OpenAI GPT-4, Gemini) because of its superior instruction-following on structured documentation, its long context window for handling multi-document retrieval results, and Anthropic's data-processing terms compatible with customer PII handling requirements.
3. **pgvector embeddings** — all documentation chunks and resolved-ticket summaries are embedded using a text-embedding model and stored as vector columns in Supabase. This co-locates retrieval state with the existing Supabase data layer (ADR-018), avoiding a separate vector database dependency (e.g., Pinecone, Weaviate).
4. **Escalation path** — when AI confidence falls below a defined threshold or the customer explicitly requests a human, the ticket is escalated to a support agent as defined by the ADR-011 role model. Agents review AI-generated drafts and can approve or override before sending.

This approach was preferred over a purely human-triage model because it reduces median resolution time and scales deflection capacity independently of headcount. A fully automated model (no human escalation) was rejected because edge cases involving licensing disputes and billing require human judgment and accountability.

## Consequences

**Positive:**
- AI deflection reduces repetitive tier-1 ticket volume, freeing support agents for complex cases.
- pgvector in Supabase avoids introducing a separate vector database service, keeping infrastructure complexity low in alignment with ADR-018.
- Claude API's long context window allows retrieval of multiple documentation chunks in a single prompt, improving answer completeness.
- The escalation path preserves the ADR-011 support agent role and its defined access surface without requiring a role model revision.

**Negative:**
- RAG pipeline quality depends on documentation coverage; incomplete or outdated docs produce low-quality AI responses and increase escalation rate.
- Embedding and retrieval latency adds overhead to the first response time compared to direct agent triage for simple queries.
- Claude API introduces a third-party SaaS dependency with cost-per-token pricing that scales with support volume.
- Maintaining embedding freshness (re-embedding updated docs and changelogs) requires an automated sync job that adds operational complexity to the ADR-018 infrastructure.
