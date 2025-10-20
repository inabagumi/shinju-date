# Audit Logs and Recent Activity Dashboard Implementation

## Overview

This implementation adds audit logging functionality and a "Recent Activity" dashboard widget to track administrative actions in the SHINJU DATE admin UI.

## What's Been Implemented

### 1. Database Schema

- **New Table**: `audit_logs`
  - `id` (BIGSERIAL PRIMARY KEY): Unique identifier
  - `user_email` (TEXT NOT NULL): Email of the user who performed the action
  - `action` (TEXT NOT NULL): Type of action (e.g., VIDEO_DELETE, VIDEO_VISIBILITY_TOGGLE)
  - `target_slug` (TEXT): Optional identifier for the affected resource
  - `created_at` (TIMESTAMPTZ): Timestamp of the action
  - Indexes on `created_at` and `user_email` for efficient querying

### 2. Audit Logging System

- **File**: `apps/admin/lib/audit-log.ts`
- Provides `createAuditLog()` function for logging actions
- Automatically captures user email from authenticated session
- Supported action types:
  - `VIDEO_DELETE`: When a video is soft-deleted
  - `VIDEO_VISIBILITY_TOGGLE`: When video visibility is toggled
  - `TERM_CREATE`: When a term is created (reserved for future use)
  - `TERM_UPDATE`: When a term is updated (reserved for future use)
  - `TERM_DELETE`: When a term is deleted (reserved for future use)

### 3. Integration with Existing Actions

- **File**: `apps/admin/app/(dashboard)/videos/_actions/index.ts`
- Modified `toggleVisibilityAction()` to log VIDEO_VISIBILITY_TOGGLE
- Modified `softDeleteAction()` to log VIDEO_DELETE
- Logs are created after successful operations
- Multiple videos affected in one action result in multiple log entries

### 4. Recent Activity Widget

- **Component**: `apps/admin/app/(dashboard)/_components/recent-activity.tsx`
- Displays up to 10 most recent administrative actions
- Shows:
  - User who performed the action
  - Human-readable action description in Japanese
  - Target resource (video slug or term)
  - Relative time (e.g., "5分前", "2時間前")
- Responsive design with shadow card styling

### 5. Time Formatting Utility

- **File**: `apps/admin/lib/format-time.ts`
- Formats timestamps as relative time in Japanese
- Supports: seconds, minutes, hours, days, weeks, months, years

### 6. Dashboard Page

- **File**: `apps/admin/app/(dashboard)/page.tsx`
- Updated to display the Recent Activity widget
- Fetches latest 10 audit log entries
- Proper page heading and layout

### 7. Data Access Layer

- **File**: `apps/admin/app/(dashboard)/_lib/get-audit-logs.ts`
- Fetches audit logs from database
- Orders by `created_at` descending
- Configurable limit (default: 10)

## Database Migration

To apply the database schema changes:

1. Navigate to your Supabase Dashboard
2. Go to the SQL Editor
3. Execute the SQL migrations in order from `migrations/001_create_channels_table.sql` through `migrations/005_create_audit_logs_table.sql`

## UI Preview

The dashboard will display a card titled "最近のアクティビティ" (Recent Activity) with a list of actions:

```
┌────────────────────────────────────────────────┐
│ 最近のアクティビティ                             │
├────────────────────────────────────────────────┤
│ admin@example.com が動画を削除しました:          │
│ video-slug-123                                 │
│ 5分前                                          │
├────────────────────────────────────────────────┤
│ user@example.com が動画の表示設定を変更しました:  │
│ another-video-slug                             │
│ 1時間前                                        │
├────────────────────────────────────────────────┤
│ ...                                            │
└────────────────────────────────────────────────┘
```

## Security Considerations

- User email is obtained from authenticated Supabase session
- Audit logs are write-only from the application (no update/delete operations)
- Failed audit log creation is logged to console but doesn't block the main action
- CodeQL security scan passed with no issues

## Testing

To test the implementation:

1. Apply the database migration
2. Log in to the admin UI
3. Navigate to the dashboard (main page)
4. Perform some actions:
   - Go to 動画管理 (Videos)
   - Select one or more videos
   - Toggle visibility or soft delete them
5. Return to the dashboard
6. Verify that the actions appear in the "Recent Activity" widget

## Future Enhancements

Potential improvements for future iterations:

- Add audit logging for term CRUD operations
- Add filtering capabilities (by user, action type, date range)
- Add pagination for viewing older logs
- Add export functionality for compliance/reporting
- Add more detailed action metadata (e.g., before/after values)
- Consider adding user avatars or profile pictures
- Add action rollback/undo functionality
