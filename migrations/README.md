# Database Migrations

This directory contains SQL migration files for the SHINJU DATE database schema.

## Applying Migrations

To apply a migration to your Supabase database:

1. Open the Supabase Dashboard for your project
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Paste and execute the SQL

### Migration 001: Create audit_logs table

File: `001_create_audit_logs_table.sql`

This migration creates the `audit_logs` table used for tracking administrative actions in the admin UI. The table includes:

- `id`: Primary key (auto-incrementing)
- `user_email`: Email of the user who performed the action
- `action`: Type of action performed (e.g., VIDEO_DELETE, TERM_CREATE)
- `target_slug`: Optional identifier for the resource affected
- `created_at`: Timestamp when the action was performed

After applying this migration, the admin dashboard will display recent administrative activities.
