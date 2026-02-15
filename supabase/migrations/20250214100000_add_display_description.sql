-- Add display_description to closet_items: short AI-generated product-style label (e.g. "Beige leather crossbody bag")
-- for use as title in pairing and elsewhere. Set on upload via AI analysis.
ALTER TABLE closet_items
  ADD COLUMN IF NOT EXISTS display_description TEXT;
