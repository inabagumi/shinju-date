# Video Restore Functionality Implementation

## Overview

This document describes the implementation of the video restore functionality in the admin interface, allowing administrators to restore videos that have been soft-deleted.

## Features

### User Interface

#### Video List Page (`/videos`)
- **Bulk Operations**: When deleted videos are selected, a green "復元" (Restore) button appears in the selection bar
- **Row Actions**: Each video row has a dropdown menu with context-appropriate actions:
  - Deleted videos: Show "復元" (Restore) option
  - Non-deleted videos: Show "表示/非表示を切り替え" (Toggle visibility) and "削除" (Delete) options
- **Smart Button Rendering**: The bulk action bar dynamically shows only relevant buttons based on the selection state

#### Video Detail Page (`/videos/[id]`)
- **Always Visible Actions**: Action buttons are now always visible, even for deleted videos
- **Deleted Videos**: Show a green "復元" (Restore) button with confirmation dialog
- **Non-deleted Videos**: Show standard "表示する/非表示にする" (Show/Hide) and "削除" (Delete) buttons
- **Status Indicator**: Deleted videos display a warning banner explaining the video is deleted

### Backend Implementation

#### Server Actions

**Location**: `apps/admin/app/(dashboard)/videos/_actions/index.ts`

##### `restoreAction(ids: string[])`
Bulk restore for multiple videos.

**Behavior**:
1. Validates input (non-empty array)
2. Fetches video and thumbnail information
3. Sets `deleted_at` to `NULL` for selected videos
4. Sets `deleted_at` to `NULL` for associated thumbnails
5. Creates audit log entries (using `Promise.allSettled` to prevent cascade failures)
6. Revalidates cache and paths
7. Returns success/error response

##### `restoreSingleVideoAction(id: string)`
Single video restore with similar behavior to bulk restore.

**Behavior**:
1. Validates video existence
2. Sets `deleted_at` to `NULL` for video
3. Sets `deleted_at` to `NULL` for associated thumbnail (if exists)
4. Creates audit log entry (non-blocking)
5. Revalidates cache and paths
6. Returns success/error response

#### Database Changes

**Migration**: `supabase/migrations/20251124164756_add_video_restore_audit_action.sql`

Added `VIDEO_RESTORE` to the `audit_action` enum to track restore operations in audit logs.

**TypeScript Types**: `packages/database/types/supabase.ts`

Updated enum type definitions to include `VIDEO_RESTORE`.

### Key Design Decisions

1. **Cascade Restore**: When restoring a video, the associated thumbnail is also restored automatically to maintain data integrity.

2. **Non-blocking Audit Logs**: Audit log creation failures don't cause the restore operation to fail. This ensures videos can be restored even if audit logging has issues.

3. **Conditional UI**: The interface intelligently shows only relevant actions based on the video's state, preventing invalid operations and improving UX.

4. **Confirmation Dialogs**: All restore operations require user confirmation to prevent accidental restoration.

5. **Immediate Cache Invalidation**: After successful restore, both Next.js paths and cache tags are revalidated to ensure immediate UI updates across the application.

6. **Performance Optimization**: Uses `useMemo` to prevent unnecessary re-computation of selected videos in the list view.

## Testing

### Unit Tests

**Location**: `apps/admin/app/(dashboard)/videos/_actions/restore.test.ts`

Comprehensive test coverage includes:
- Input validation (empty arrays, null values)
- Thumbnail ID filtering logic
- Error message generation
- Update payload structure validation

**Test Results**: 13 tests, all passing

### Quality Checks
- ✅ Biome linting and formatting
- ✅ TypeScript compilation
- ✅ Next.js build
- ✅ Unit tests

## Code Examples

### Using the Restore Action

```typescript
// Bulk restore
const result = await restoreAction(['video-id-1', 'video-id-2'])
if (result.success) {
  // Handle success
} else {
  // Handle error: result.error
}

// Single restore
const result = await restoreSingleVideoAction('video-id')
if (result.success) {
  // Handle success
} else {
  // Handle error: result.error
}
```

### Conditional Rendering in Components

```tsx
// Show restore button for deleted videos
{video.deleted_at ? (
  <button onClick={() => handleRestore(video.id)}>
    復元
  </button>
) : (
  <>
    <button onClick={() => handleToggle(video.id)}>
      表示/非表示を切り替え
    </button>
    <button onClick={() => handleDelete(video.id)}>
      削除
    </button>
  </>
)}
```

## Files Modified

1. `apps/admin/app/(dashboard)/videos/_actions/index.ts` - Server actions
2. `apps/admin/app/(dashboard)/videos/_components/video-list.tsx` - List UI
3. `apps/admin/app/(dashboard)/videos/[id]/_components/video-actions-buttons.tsx` - Detail page actions
4. `apps/admin/app/(dashboard)/videos/[id]/page.tsx` - Detail page layout
5. `apps/admin/app/(dashboard)/_components/log-item.tsx` - Audit log display
6. `packages/database/types/supabase.ts` - TypeScript types
7. `supabase/migrations/20251124164756_add_video_restore_audit_action.sql` - Database migration

## Future Enhancements

Potential improvements for future iterations:

1. **Undo Functionality**: Add ability to undo restore operations within a time window
2. **Batch Operation Progress**: Show progress indicators for bulk operations
3. **Restore History**: Track and display restore history in video details
4. **Soft Delete Expiration**: Implement automatic permanent deletion after a certain period
5. **Restore Conflicts**: Handle cases where restored videos might conflict with existing data

## Related Documentation

- [Audit Log Implementation](../docs/audit-log.md)
- [Video Management](../docs/video-management.md)
- [Soft Delete Pattern](../docs/soft-delete.md)
