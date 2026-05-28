-- 0021_comment_edits.sql
-- Track edits made to comments by their authors so the UI can show an
-- "Edited" indicator and offer a "view original" toggle.
--
-- Approach (kept deliberately small):
--   - `original_text` captures the pre-edit body on the FIRST edit only;
--     subsequent edits leave it alone. NULL = comment has never been edited.
--   - `edited_at` is updated on every user-initiated edit. NULL = never
--     edited. Distinct from the existing `updated_at` (which is bumped by
--     any UPDATE, including system updates), so the UI has a clean signal.
--
-- This is additive — existing comments stay NULL on both columns and render
-- exactly as before. The application is responsible for populating the
-- columns (see updateComment in commentsService.js). RLS already gates who
-- can update which row; we don't change it here.
--
-- Idempotent; safe to re-run.

alter table public.comments
  add column if not exists original_text text,
  add column if not exists edited_at     timestamptz;
