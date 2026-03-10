---
id: 3
title: Distribute Exclusively Through ThemeForest
status: active
category: core
relatedADRs: [1, 2]
supersededBy: null
date: 2026-03-09
---

## Context

WordPress themes and plugins can be distributed through multiple channels: Envato (ThemeForest / CodeCanyon), direct sales via WooCommerce or EDD, Creative Market, TemplateMonster, Elegant Themes marketplace, and others. Each channel has different revenue share models, different customer demographics, different review processes, and different support expectations.

Running a multi-channel distribution strategy requires maintaining separate product listings, separate license systems, separate payment processors, and separate customer records across platforms. It also introduces pricing consistency challenges — discounts on one platform can create arbitrage pressure on others. Customer support becomes fragmented when purchase history lives in multiple systems.

ThemeForest is the world's largest theme marketplace with millions of active buyers. CMSMasters has operated on ThemeForest long enough to achieve Power Elite Author status, which carries meaningful business advantages: preferred placement in search results, dedicated account management, early access to marketplace programs, and higher trust signals for new buyers. This status was earned through sustained sales volume and cannot easily be replicated on alternative platforms.

## Decision

CMSMasters themes and plugins will be distributed exclusively through ThemeForest (for themes) and CodeCanyon (for plugins) within the Envato marketplace ecosystem. No direct sales storefront will be operated. No listings will be created or maintained on alternative marketplaces. License management and purchase records will be sourced from the Envato API.

## Consequences

**Positive:**
- Power Elite Author status provides preferred placement and marketplace visibility that would be lost by splitting attention across channels
- Single distribution channel simplifies license validation — the portal integrates with one API (Envato) rather than multiple payment processors
- Envato handles payment processing, fraud prevention, tax compliance, and refund disputes — reducing operational overhead significantly
- Customer trust is reinforced by the established Envato brand and buyer protection guarantees
- Focus on a single channel allows deeper investment in ThemeForest listing quality, SEO, and conversion optimization

**Negative:**
- No direct sales means Envato takes a revenue share on every transaction — margin is permanently constrained by marketplace fees
- Platform dependency: Envato policy changes, fee increases, or platform decline directly impact all revenue
- Customer relationship is mediated through the marketplace — direct customer acquisition and email list building are limited by Envato's terms
- Bundle deals, subscription pricing, and custom enterprise contracts are difficult or impossible to structure within ThemeForest's product model
