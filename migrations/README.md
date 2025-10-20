# Database Migrations

This directory contains SQL migration files for the SHINJU DATE database schema.

## Applying Migrations

To apply migrations to your Supabase database:

1. Open the Supabase Dashboard for your project
2. Navigate to the SQL Editor
3. Copy the contents of each migration file in order
4. Paste and execute the SQL

**Important**: Apply migrations in numerical order (001, 002, 003, etc.) to ensure proper table dependencies.

## Migration Files

### Migration 001: Create channels table

File: `001_create_channels_table.sql`

Creates the `channels` table for storing YouTube channel information:
- `id`: Primary key (auto-incrementing)
- `name`: Channel name
- `slug`: Unique identifier for the channel
- `created_at`, `updated_at`, `deleted_at`: Timestamps

### Migration 002: Create thumbnails table

File: `002_create_thumbnails_table.sql`

Creates the `thumbnails` table for storing video thumbnail metadata:
- `id`: Primary key (auto-incrementing)
- `path`: Path to the thumbnail file
- `width`, `height`: Dimensions
- `blur_data_url`: Placeholder for progressive loading
- `etag`: Cache validation
- `created_at`, `updated_at`, `deleted_at`: Timestamps

### Migration 003: Create videos table

File: `003_create_videos_table.sql`

Creates the `videos` table for storing video information:
- `id`: Primary key (auto-incrementing)
- `channel_id`: Foreign key to channels table
- `slug`: Unique identifier for the video
- `title`: Video title
- `duration`: Video duration
- `published_at`: Publication timestamp
- `thumbnail_id`: Foreign key to thumbnails table (optional)
- `visible`: Visibility flag
- `created_at`, `updated_at`, `deleted_at`: Timestamps

### Migration 004: Create terms table

File: `004_create_terms_table.sql`

Creates the `terms` table for storing searchable terms:
- `id`: Primary key (auto-incrementing)
- `term`: The term text (unique)
- `synonyms`: Array of synonym terms
- `readings`: Array of readings (furigana)
- `created_at`, `updated_at`: Timestamps

### Migration 005: Create audit_logs table

File: `005_create_audit_logs_table.sql`

Creates the `audit_logs` table for tracking administrative actions in the admin UI:
- `id`: Primary key (auto-incrementing)
- `user_email`: Email of the user who performed the action
- `action`: Type of action performed (e.g., VIDEO_DELETE, TERM_CREATE)
- `target_slug`: Optional identifier for the resource affected
- `created_at`: Timestamp when the action was performed

After applying this migration, the admin dashboard will display recent administrative activities.
