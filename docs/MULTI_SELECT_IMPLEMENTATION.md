# Multi-Select Filter Implementation

This document describes the implementation of multi-select filters in the admin video listing page using Radix UI components.

## Overview

The multi-select filter feature allows users to select multiple values for each filter column (Talents, Status, Visibility, Deleted state) using a custom UI built with Radix UI's Popover and Checkbox components.

![MultiSelect Component Demo](./images/multiselect-demo.png)

## Components Created

### MultiSelect Component (`packages/ui/src/multi-select.tsx`)

A reusable multi-select component with the following features:

- **Radix UI Integration**: Built with `@radix-ui/react-popover` and `@radix-ui/react-checkbox`
- **Select All/Deselect All**: Quickly toggle all options with a single button
- **Visual Feedback**: 
  - Shows placeholder when no items selected
  - Shows single item name when one item selected
  - Shows count (e.g., "2件選択中") when multiple items selected
- **Scrollable List**: Configurable `maxHeight` prop for handling many options
- **Accessibility**: Proper ARIA labels and keyboard navigation support
- **Responsive**: Works on mobile and desktop

#### Props

```typescript
interface MultiSelectProps {
  options: MultiSelectOption[]  // Array of {label, value} objects
  value: string[]               // Array of selected values
  onChange: (value: string[]) => void  // Callback when selection changes
  placeholder?: string          // Text shown when no selection
  maxHeight?: string           // Max height of options list (default: '300px')
  className?: string           // Additional CSS classes
}
```

## Implementation Details

### 1. Search Params Schema Updates

Updated `apps/admin/app/(dashboard)/videos/_lib/search-params-schema.ts` to handle arrays:

- `talentId`: Changed from `string | undefined` to `string[] | undefined`
- `status`: Changed from `VideoStatus | undefined` to `VideoStatus[] | undefined`
- `visible`: Changed from `boolean | undefined` to `boolean[] | undefined`
- `deleted`: Changed from `boolean | undefined` to `boolean[] | undefined`

Each parameter now accepts multiple values via URL query parameters (e.g., `?status=LIVE&status=UPCOMING`).

### 2. Backend Filter Logic

Updated `apps/admin/app/(dashboard)/videos/_lib/get-videos.ts`:

- Uses Supabase's `.in()` operator for OR filtering
- Handles single and multiple values gracefully
- Maintains backward compatibility with empty filters

Example:
```typescript
if (filters?.status && filters.status.length > 0) {
  query = query.in('status', filters.status)
}
```

### 3. Frontend Component

Updated `apps/admin/app/(dashboard)/videos/_components/video-filters.tsx`:

- Replaced native `<select>` dropdowns with `MultiSelect` components
- Uses `searchParams.getAll()` to retrieve multiple values from URL
- Updates URL with all selected values using `params.append()`
- Maintains existing debounced search functionality

## Usage Example

```tsx
import { MultiSelect } from '@shinju-date/ui'

const statusOptions = [
  { label: '待機中', value: 'UPCOMING' },
  { label: '配信中', value: 'LIVE' },
  { label: '配信済み', value: 'ENDED' },
  { label: '公開済み', value: 'PUBLISHED' },
]

function MyFilter() {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  return (
    <MultiSelect
      options={statusOptions}
      value={selectedStatuses}
      onChange={setSelectedStatuses}
      placeholder="すべて"
    />
  )
}
```

## Testing

### Unit Tests

Location: `packages/ui/src/__tests__/multi-select.test.tsx`

Tests cover:
- Rendering with different states (empty, single, multiple selections)
- Opening/closing popover
- Selecting/deselecting items
- Select all/deselect all functionality
- Custom className support

Run tests with:
```bash
cd packages/ui
pnpm run test
```

### Integration

The admin app build passes successfully, confirming type safety and integration correctness.

## Design Decisions

1. **Radix UI over other solutions**: Chosen for accessibility, headless architecture, and project consistency
2. **OR Logic for filters**: Multiple selections in the same filter use OR logic (e.g., "status=LIVE OR status=UPCOMING")
3. **URL-based state**: Filter state is maintained in URL query parameters for bookmarking and sharing
4. **Visual feedback**: Clear indication of selection count helps users understand current filter state

## Future Enhancements

Potential improvements for future iterations:

- Add clear/reset button for each filter
- Add badges/chips to show selected items outside the popover
- Implement search/filter within long option lists
- Add keyboard shortcuts for power users
- Support for mobile-specific interactions (e.g., bottom sheet on small screens)
- Animation improvements for open/close transitions

## Browser Support

Works on all modern browsers that support:
- CSS Grid and Flexbox
- ES2022+ JavaScript features
- Radix UI's browser requirements

## Performance Considerations

- Efficient re-rendering using React state management
- Minimal DOM updates when toggling selections
- Virtualization could be added for extremely long lists (100+ items)
