-- WP-014: Multi-block slots with configurable gap
-- Adds slot_config (gap per slot) to pages, sort_order to blocks.
-- layout_slots is already jsonb — arrays work natively, no ALTER needed.

-- Per-slot configuration (gap, future: direction, maxBlocks, etc.)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS slot_config jsonb NOT NULL DEFAULT '{}';

-- Default block ordering within a category (lower = first)
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
