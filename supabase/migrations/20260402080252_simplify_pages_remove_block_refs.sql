-- Remove per-page block refs — global_elements handles this now
-- pages table has 0 rows, safe to drop
ALTER TABLE pages DROP COLUMN IF EXISTS header_block_id;
ALTER TABLE pages DROP COLUMN IF EXISTS footer_block_id;
ALTER TABLE pages DROP COLUMN IF EXISTS sidebar_block_id;

-- Also remove page_id from themes — global_elements scope 'layout:themes' handles this
ALTER TABLE themes DROP COLUMN IF EXISTS page_id;
