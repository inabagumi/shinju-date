# Search Modal Stability Fix

## Problem

The search modal (using Next.js Intercepting Routes and Parallel Routes) was experiencing stability issues:

1. **Modal closing unexpectedly**: The modal would sometimes close without user action
2. **Navigation issues**: When closing the modal, `router.back()` would fail when there was no history to go back to (e.g., when directly navigating to `/search`)
3. **Race conditions**: The navigation state flags were being reset before navigation completed, causing unpredictable behavior
4. **Modal not closeable**: In some scenarios, the modal couldn't be closed properly

## Root Causes

### 1. Using `router.back()` for Modal Closing

The original implementation used `router.back()` to close the modal:

```typescript
const handleClose = useCallback(
  (open: boolean) => {
    if (open) return
    setIsOpen(false)
    if (!isNavigating.current) {
      router.back() // ❌ Fails when no history exists
    }
    isNavigating.current = false
  },
  [router],
)
```

**Problem**: When a user directly navigates to `/search` (e.g., by typing the URL or refreshing the page), there's no history to go back to. This causes the modal to either stay open or behave unpredictably.

### 2. Single Navigation Flag

Using a single `isNavigating` flag for both "user clicked a link" and "modal is closing" scenarios caused conflicts:

```typescript
const isNavigating = useRef(false)

// When closing modal
if (!isNavigating.current) {
  router.back()
}
isNavigating.current = false // ❌ Reset immediately
```

**Problem**: The flag was reset immediately after calling `router.back()`, potentially before the navigation completed, leading to race conditions.

### 3. Insufficient Cleanup

No cleanup was performed on component unmount, which could leave dangling refs in memory.

## Solution

### 1. Use `router.push('/')` Instead of `router.back()`

```typescript
const handleClose = useCallback(
  (open: boolean) => {
    if (open) return
    setIsOpen(false)
    
    // Only navigate if we haven't already navigated (e.g., via clicking a link)
    if (!isNavigating.current && !hasNavigated.current) {
      // ✅ Use router.push('/') for consistent behavior
      router.push('/')
    }
    
    // Reset after a short delay to allow navigation to complete
    setTimeout(() => {
      isNavigating.current = false
      hasNavigated.current = false
    }, 100)
  },
  [router],
)
```

**Benefits**:
- Always returns to the homepage, regardless of how the user reached `/search`
- No dependency on browser history
- Consistent behavior across all scenarios

### 2. Separate Navigation State Tracking

```typescript
const isNavigating = useRef(false)  // Currently navigating
const hasNavigated = useRef(false)  // Has navigated at least once

const handleNavigate = useCallback(() => {
  isNavigating.current = true
  hasNavigated.current = true  // ✅ Track that navigation happened
  setIsOpen(false)
}, [])
```

**Benefits**:
- `hasNavigated` tracks whether navigation has occurred (e.g., user clicked a suggestion link)
- `isNavigating` tracks the current navigation state
- Better separation of concerns prevents conflicts

### 3. Delayed Flag Reset

```typescript
// Reset after a short delay to allow navigation to complete
setTimeout(() => {
  isNavigating.current = false
  hasNavigated.current = false
}, 100)
```

**Benefits**:
- Gives navigation time to complete before resetting flags
- Prevents race conditions where flags are reset too early

### 4. Proper Cleanup

```typescript
useEffect(() => {
  return () => {
    isNavigating.current = false
    hasNavigated.current = false
  }
}, [])
```

**Benefits**:
- Cleans up refs on component unmount
- Prevents memory leaks
- Ensures clean state on remount

### 5. Reset Flags on Pathname Change

```typescript
useEffect(() => {
  // Reset flags when pathname changes
  hasNavigated.current = false
  setIsOpen(true)
}, [pathname])
```

**Benefits**:
- Resets navigation state when URL changes
- Ensures modal reopens properly when navigating back to search

## Testing

Comprehensive E2E tests were added in `apps/web/e2e/search-modal.spec.ts`:

1. **Opening/Closing Tests**: Verify modal opens and closes correctly via button, ESC, overlay, and keyboard shortcuts
2. **Direct Navigation Tests**: Ensure direct navigation to `/search` works correctly
3. **Search Functionality Tests**: Validate search queries, real-time updates, and empty submissions
4. **Suggestion Tests**: Test suggestion links and keyboard navigation
5. **Stability Tests**: Verify rapid opening/closing, multiple searches, and browser back button behavior

## Verification

To verify the fix:

1. **Setup environment**:
   ```bash
   cd apps/web
   cp .env.test .env.local  # Use MSW for testing
   pnpm install
   ```

2. **Run E2E tests**:
   ```bash
   pnpm test:e2e
   ```

3. **Manual testing**:
   ```bash
   ENABLE_MSW=true pnpm dev
   ```
   
   Then test:
   - Open modal with search button → should open
   - Close with ESC → should return to homepage
   - Open modal with Cmd/Ctrl+K → should open
   - Close with overlay click → should return to homepage
   - Navigate directly to `/search` → modal should open
   - Close modal → should return to homepage (not browser back)
   - Type query and press Enter → should navigate to videos page
   - Rapidly open/close modal → should remain stable

## Related Files

- `apps/web/app/@modal/(.)search/_components/search-modal.tsx` - Main fix
- `apps/web/e2e/search-modal.spec.ts` - E2E tests
- `apps/web/app/@modal/(.)search/page.tsx` - Modal page
- `apps/web/app/_components/search-button.tsx` - Search button component
