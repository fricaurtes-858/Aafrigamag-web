/*
# Add body column to our_story

Adds a long-text `body` column to hold the full multi-paragraph institutional
story. The existing `intro` column remains as a short introductory summary.

Non-destructive: only adds a column with a safe default.
*/

ALTER TABLE public.our_story
  ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '';
