---
id: 2
title: Support Only Elementor Page Builder
status: active
category: core
relatedADRs: [1, 3]
supersededBy: null
date: 2026-03-09
---

## Context

The WordPress theme and plugin ecosystem supports multiple competing page builders: Elementor, Divi, WPBakery, Beaver Builder, Gutenberg (block editor), and Bricks, among others. Each builder has a different architecture, different hooks system, different template structure, and different approach to dynamic data. Supporting multiple builders simultaneously means maintaining separate template files, separate compatibility layers, and separate QA matrices for every product.

CMSMasters has historically shipped products that attempted broad compatibility. This led to sprawling codebases where builder-specific edge cases caused regression bugs. Support tickets frequently traced back to builder compatibility issues rather than core product defects. Development velocity suffered because every new feature required verification across multiple builder environments.

Market data shows Elementor holding dominant market share among professional WordPress developers — the primary CMSMasters customer segment. Elementor's Pro ecosystem, its widget architecture, and its template kit format are the de facto standards for the agency and freelancer workflows that our themes serve.

## Decision

CMSMasters themes and plugins will support Elementor as the sole page builder. All theme templates, demo content, one-click imports, and widget integrations will be built exclusively for Elementor. Documentation, tutorials, and support resources will cover Elementor workflows only. Products will not include WPBakery, Divi, Bricks, or other builder compatibility layers.

## Consequences

**Positive:**
- Focused development effort — engineering time goes toward deeper, higher-quality Elementor integrations rather than surface-level multi-builder support
- Simpler compatibility matrix — QA tests one builder environment per product instead of five or six
- Demo content and one-click imports are stable and reliable because they target a single import format
- Support team handles a narrower range of configuration scenarios, improving resolution times
- Tighter alignment with Elementor's roadmap enables early adoption of new features (loop widgets, dynamic tags, custom code)

**Negative:**
- Explicitly excludes potential customers using Divi, WPBakery, Bricks, or Gutenberg-only setups
- Dependency on Elementor's continued health as a product — pricing changes, feature deprecations, or market share shifts affect the entire catalog
- Customers who migrate away from Elementor cannot continue using CMSMasters products without rebuilding their sites
