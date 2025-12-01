# Video Delete/Restore Confirmation Dialog Implementation

## Overview

This document describes the implementation of a custom confirmation dialog that replaces the simple `window.confirm` for video delete/restore operations in the admin interface.

## Problem Statement

The previous implementation used `window.confirm`, which:
- Provided minimal information to users
- Lacked visual warnings for dangerous operations
- Had no safeguards against accidental bulk deletions
- Offered poor user experience with generic browser dialogs

## Solution

Implemented a custom `VideoActionConfirmDialog` component that provides:

### 1. Visual Warnings
- **Color-coded themes** based on action type:
  - 🔴 **Red** for delete operations (warning)
  - 🟢 **Green** for restore operations (positive)
  - 🔵 **Blue** for visibility toggle (neutral)
- **Emoji icons** for quick visual recognition:
  - ⚠️ for delete
  - 🔄 for restore
  - 👁️ for visibility toggle

### 2. Detailed Information
- Displays the **exact count** of videos being affected
- Shows a **scrollable list** of all video titles
- Clear descriptions of what will happen

### 3. Safety Features

#### Keyword Confirmation for Bulk Deletes
When deleting **3 or more videos**, the dialog requires users to type "削除" (delete) before allowing the operation:

```
┌─────────────────────────────────────────┐
│ ⚠️ 動画を削除                            │
│                                         │
│ 5件の動画を削除しようとしています。      │
│ この操作は取り消せません。              │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ 対象動画 (5件):                  │   │
│ │ ▶ Video Title 1                  │   │
│ │ ▶ Video Title 2                  │   │
│ │ ▶ Video Title 3                  │   │
│ │ ▶ Video Title 4                  │   │
│ │ ▶ Video Title 5                  │   │
│ └─────────────────────────────────┘   │
│                                         │
│ 続行するには「削除」と入力してください:  │
│ ┌─────────────────────────────────┐   │
│ │ [入力欄]                          │   │
│ └─────────────────────────────────┘   │
│                                         │
│         [キャンセル]  [削除する] (disabled) │
└─────────────────────────────────────────┘
```

#### Error Handling
- Displays error messages within the dialog
- Prevents dialog from closing on error
- Shows clear feedback for validation failures

### 4. Responsive Design
- Maximum height with scrollable content
- Works on mobile and desktop
- Uses Radix UI Dialog primitives for accessibility

## Component Architecture

### VideoActionConfirmDialog Component

```typescript
interface VideoActionConfirmDialogProps {
  action: 'toggle' | 'delete' | 'restore'
  videos: VideoInfo[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}
```

**Key Features:**
- Controlled component (parent manages open state)
- Async onConfirm handler with loading states
- Transition management via `useTransition`
- Automatic keyword validation for bulk deletes

### Integration with VideoList

The dialog is integrated into the video list page, replacing the previous custom modal:

```typescript
// Before (custom modal)
{showConfirmModal.open && (
  <div className="fixed inset-0 z-50...">
    <div className="w-full max-w-md...">
      <h3>確認</h3>
      <p>本当に削除しますか？</p>
      <button>キャンセル</button>
      <button>実行</button>
    </div>
  </div>
)}

// After (Dialog component)
<VideoActionConfirmDialog
  action={confirmDialog.action}
  videos={selectedVideos}
  open={confirmDialog.open}
  onOpenChange={handleOpenChange}
  onConfirm={handleConfirm}
/>
```

## Usage Examples

### Single Video Delete
```typescript
// User clicks delete on a single video
handleSingleAction('delete', videoId)
// → Shows dialog with 1 video
// → No keyword confirmation required
// → Button enabled immediately
```

### Bulk Delete (3+ videos)
```typescript
// User selects 5 videos and clicks bulk delete
handleBulkAction('delete')
// → Shows dialog with 5 videos
// → Requires typing "削除" 
// → Button disabled until correct keyword entered
```

### Restore Operation
```typescript
// User restores deleted videos
handleBulkAction('restore')
// → Shows green-themed dialog
// → No keyword confirmation required
// → Clear "復元する" button
```

## Testing

Comprehensive test coverage includes:

✅ Renders correct content for each action type  
✅ Shows keyword input only for bulk deletes (3+)  
✅ Disables confirm button until keyword is entered  
✅ Displays all videos in the affected list  
✅ Shows correct icons and colors per action  
✅ Validates button text matches action  
✅ Handles dialog open/close state properly  
✅ Shows error messages when operations fail  

**Test Results:** 113/113 tests passing

## Benefits

### Safety Improvements
1. **Keyword confirmation** prevents accidental mass deletions
2. **Clear visual warnings** make users think twice
3. **Detailed information** shows exactly what will be affected
4. **Error handling** prevents silent failures

### User Experience
1. **Professional appearance** using design system components
2. **Responsive design** works on all devices
3. **Accessible** using Radix UI primitives
4. **Clear feedback** during loading states

### Code Quality
1. **Reusable component** can be used for other operations
2. **Type-safe** with TypeScript
3. **Well-tested** with comprehensive unit tests
4. **Follows patterns** from existing codebase (DeleteConfirmDialog)

## Future Enhancements

Possible improvements for the future:
- Add undo functionality for delete operations
- Show thumbnails in the video list
- Add confirmation count (e.g., "Type 'delete 5 videos'")
- Support for custom confirmation messages per video type
- Keyboard shortcuts for power users

## Technical Details

### Dependencies
- `@shinju-date/ui` - Dialog, Button, Input components
- `@radix-ui/react-dialog` - Accessible dialog primitives (via @shinju-date/ui)
- React hooks: `useState`, `useTransition`

### File Structure
```
apps/admin/app/(dashboard)/videos/_components/
├── video-action-confirm-dialog.tsx       # Dialog component
├── video-action-confirm-dialog.test.tsx  # Unit tests
└── video-list.tsx                        # Integration point
```

### State Management
The component uses controlled state pattern:
- Parent component manages `open` state
- Dialog manages internal state (keyword input, errors, pending)
- Parent handles actual action execution via `onConfirm`

## Conclusion

The new confirmation dialog significantly improves safety and user experience for critical video operations while maintaining a clean, reusable architecture that follows the project's existing patterns and standards.
