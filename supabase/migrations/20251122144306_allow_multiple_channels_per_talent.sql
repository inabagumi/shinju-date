-- Allow multiple YouTube channels and Twitch users per talent
-- This migration removes the unique constraint on talent_id to enable one-to-many relationships

-- Drop unique constraint on youtube_channels.talent_id if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'youtube_channels_talent_id_key'
    ) THEN
        ALTER TABLE public.youtube_channels 
        DROP CONSTRAINT youtube_channels_talent_id_key;
    END IF;
END $$;

-- Drop unique constraint on twitch_users.talent_id if it exists  
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'twitch_users_talent_id_key'
    ) THEN
        ALTER TABLE public.twitch_users 
        DROP CONSTRAINT twitch_users_talent_id_key;
    END IF;
END $$;

-- Add comments to document the change
COMMENT ON COLUMN public.youtube_channels.talent_id IS 'Foreign key to talents table - allows multiple channels per talent';
COMMENT ON COLUMN public.twitch_users.talent_id IS 'Foreign key to talents table - allows multiple users per talent';
