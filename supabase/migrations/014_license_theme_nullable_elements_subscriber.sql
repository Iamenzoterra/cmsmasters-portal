-- Migration 014: Make licenses.theme_id nullable + add elements_subscriber to profiles
-- Required by WP-017 Phase 3 API endpoints

ALTER TABLE licenses ALTER COLUMN theme_id DROP NOT NULL;

ALTER TABLE profiles ADD COLUMN elements_subscriber boolean NOT NULL DEFAULT false;
