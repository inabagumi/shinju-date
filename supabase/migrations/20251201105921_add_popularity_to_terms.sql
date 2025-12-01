-- Add popularity column to terms table

ALTER TABLE public.terms
ADD COLUMN popularity INTEGER NOT NULL DEFAULT 0;

-- Create index for performance optimization on sorting by popularity
CREATE INDEX IF NOT EXISTS idx_terms_popularity_desc ON public.terms (popularity DESC);

COMMENT ON COLUMN public.terms.popularity IS '人気度（検索回数）';
