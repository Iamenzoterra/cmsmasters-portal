---
id: 2
title: Elementor-Only — Exclusive Support for Elementor Page Builder
status: active
category: core
relatedADRs: [1, 3]
supersededBy: null
date: 2026-03-09
---

## Context

The WordPress theme ecosystem supports multiple competing page builders: Elementor, WPBakery, Divi, Beaver Builder, Gutenberg, and others. For several years CMSMasters shipped themes with support for two or more builders simultaneously, bundling multiple template sets, custom widgets, and compatibility shims for each. This multi-builder approach was adopted to maximize marketplace reach, but it created compounding costs: every new feature required parallel implementation, QA ran multiple builder environments, and documentation had to cover builder-specific workflows.

As Elementor emerged as the dominant professional page builder — capturing the majority of the premium theme market — the business case for maintaining WPBakery and Divi compatibility weakened. Customer support tickets relating to builder conflicts became the single largest category of support volume. Internal analysis showed that more than 80% of active customers used Elementor exclusively, while multi-builder bundles increased theme file size and update complexity without proportional revenue benefit.

The team evaluated three options: continue multi-builder support, adopt Gutenberg as the future-forward standard, or standardize on Elementor. Gutenberg was ruled out due to its limited widget ecosystem for the design-heavy themes CMSMasters produces. Multi-builder support was ruled out on sustainability grounds.

## Decision

CMSMasters will support **only Elementor** as the page builder for all themes. New themes will ship with Elementor templates exclusively. Existing themes will sunset WPBakery and Divi templates on their next major version release. Theme architecture, widget registration, and documentation will be authored with Elementor as the sole target environment.

## Consequences

**Positive:**
- Development effort for new features is halved — no parallel builder implementations required.
- QA scope is reduced to a single builder environment, reducing the release cycle length.
- Support ticket volume for builder conflicts is expected to drop significantly.
- Theme file size decreases due to removal of unused builder template bundles.
- Elementor's active development roadmap and large ecosystem align with CMSMasters' direction.

**Negative:**
- Customers using WPBakery or Divi will need to migrate or remain on legacy theme versions.
- Marketplace listings must be updated to clearly communicate the Elementor requirement; some buyers may be lost.
- CMSMasters is now dependent on Elementor's continued market position and API stability.
- Future page builder fragmentation (e.g., Elementor's own ecosystem splits) could force a revisit of this decision.
