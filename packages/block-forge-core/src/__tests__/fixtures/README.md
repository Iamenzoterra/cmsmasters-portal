# Frozen fixtures — DO NOT /content-pull into this folder

These block payloads are extracted from `content/db/blocks/` and frozen for snapshot stability.

## Contract

| Fixture | Source file | sha256 at freeze time | Role |
|---|---|---|---|
| `block-spacing-font` | `content/db/blocks/fast-loading-speed.json` | `91aa6aefea1c267379c45dfd79bbcf80c510179726c0a1b1d2320a25e38d343a` | spacing-clamp + font-clamp E2E |
| `block-plain-copy` | `content/db/blocks/sidebar-perfect-for.json` | `263a76bc95d4ea803f86d4f457290287118265e3922370d4bc40e3922cb31452` | negative-case baseline |
| `block-nested-row` | `content/db/blocks/header.json` | `36e52be3ee1b50abc7bb74c0493a8702b21e13cfd2ceda056be49700974cba91` | nested flex-row (documents NO-trigger contract at E2E level) |

Frozen: WP-025 Phase 0 (2026-04-22).

Updating these fixtures is a deliberate act — never an automatic side-effect of `/content-pull` or any content sync. If the source block evolves and the fixture needs to reflect that, re-extract manually + update sha256 in this README + refresh snapshot + document the why in a commit.
