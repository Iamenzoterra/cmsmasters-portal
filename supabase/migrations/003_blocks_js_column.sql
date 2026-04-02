-- WP-006 Phase 4: Add js column to blocks table
-- Stores animation/behavioral JavaScript separately from HTML
-- ADR-023: Block Animation Architecture

ALTER TABLE public.blocks
  ADD COLUMN IF NOT EXISTS js text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.blocks.js IS 'Block animation/behavioral JS — rendered as <script type="module"> by Portal';
