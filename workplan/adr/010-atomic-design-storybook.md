---
id: 10
title: Atomic Design and Storybook
status: active
category: product
relatedADRs: [7, 9]
---

## Context

The portal design system must serve five applications (Portal, Dashboard, Support, Studio, Admin) with a consistent visual language across all 65 themes. Without a structured component taxonomy, UI elements proliferate as one-off implementations that drift in spacing, color, and behavior. ADR 7 (Split-Stack Architecture) defines that each application shares the same React + Tailwind frontend base, creating an opportunity for a single component library consumed by all surfaces. ADR 9 (Component Theme Pages) establishes that theme pages are assembled from reusable components, making a disciplined component hierarchy a hard dependency for page-level composition.

## Decision

The design system adopts atomic design methodology, organizing UI components into atoms (Card, Checkbox, Input, Modal, Select, StatusBadge, ProgressBar), molecules (form groups, filter bars, stat panels), and organisms (page headers, theme preview cards, navigation shells). All components are documented and developed in Storybook, with each story demonstrating variants, states, and design token usage. No component ships to production without a corresponding Storybook entry. Design tokens from `theme/tokens.ts` are the single source of truth for all visual values; components never hardcode colors, spacing, or typography.

## Consequences

Storybook becomes the canonical reference for designers and developers, reducing ambiguity about component behavior and reducing QA cycles. Components built as atoms in this system are directly consumed by the theme page compositions described in ADR 9, so breaking changes to atom APIs require coordinated updates across all page assemblies. The cost of maintaining Storybook stories adds a small overhead per component, but this is offset by the elimination of visual regressions and the ability to test dark-theme token application in isolation. New applications added to the monorepo inherit the full atom library immediately, consistent with the split-stack model in ADR 7.
