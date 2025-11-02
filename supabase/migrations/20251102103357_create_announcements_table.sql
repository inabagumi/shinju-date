-- Create announcements table for site-wide notifications
-- Supports maintenance announcements, feature updates, and incident notices

-- Create the announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  -- 'info', 'warning', 'alert' etc. for different display styles
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Allow public read access to enabled announcements only
CREATE POLICY "Allow public read access to enabled announcements"
ON public.announcements
FOR SELECT
USING (enabled = true);

-- Allow authenticated users (admins) full access
CREATE POLICY "Allow admin full access"
ON public.announcements
FOR ALL
USING (auth.role() = 'authenticated');

-- Create index for efficient querying of active announcements
CREATE INDEX idx_announcements_active 
ON public.announcements (enabled, start_at, end_at)
WHERE enabled = true;
