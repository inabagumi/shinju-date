# 404 Not Found Handling Implementation

## Overview

This document explains how the admin application handles 404 Not Found errors when users access detail pages for non-existent content (videos or channels).

## Implementation Summary

Both video and channel detail pages in the admin application properly handle cases where the requested resource does not exist in the database. Instead of throwing a 500 server error, the application returns a proper 404 Not Found response.

## Affected Pages

### Video Detail Page
- **Path**: `apps/admin/app/(dashboard)/videos/[id]/page.tsx`
- **Route**: `/videos/[id]`

### Channel Detail Page
- **Path**: `apps/admin/app/(dashboard)/channels/[id]/page.tsx`
- **Route**: `/channels/[id]`

## Implementation Details

### 1. Data Fetching Functions

Both pages use helper functions to fetch data from the database:

#### `getVideo(id: string)` 
Location: `apps/admin/app/(dashboard)/videos/_lib/get-video.ts`

```typescript
const { data: video, error } = await supabaseClient
  .from('videos')
  .select('...')
  .eq('id', id)
  .single()

if (error) {
  if (error.code === 'PGRST116') {
    // Row not found - return null
    return null
  }
  // Other errors - throw exception
  throw new TypeError(error.message, { cause: error })
}
```

**Key behavior**: 
- Returns `null` when the video is not found (Supabase error code `PGRST116`)
- Throws an error for other database issues

#### `getChannel(id: string)`
Location: `apps/admin/app/(dashboard)/channels/_lib/get-channel.ts`

```typescript
const { data: channel, error } = await supabaseClient
  .from('channels')
  .select('...')
  .eq('id', id)
  .single()

if (error) {
  if (error.code === 'PGRST116') {
    // Row not found - return null
    return null
  }
  // Other errors - throw exception
  throw new TypeError(error.message, { cause: error })
}
```

**Key behavior**: 
- Returns `null` when the channel is not found (Supabase error code `PGRST116`)
- Throws an error for other database issues

### 2. Page Components

Both page components check for null values and call Next.js's `notFound()` function:

#### Video Detail Page
```typescript
export default async function VideoDetailPage({ params }: Props) {
  const { id } = await params
  const video = await getVideo(id)

  if (!video) {
    notFound()  // Returns 404 response
  }

  // Render the video detail page...
}
```

#### Channel Detail Page
```typescript
export default async function ChannelDetailPage({ params }: Props) {
  const { id } = await params
  const channel = await getChannel(id)

  if (!channel) {
    notFound()  // Returns 404 response
  }

  // Render the channel detail page...
}
```

### 3. Metadata Generation

Both pages also handle missing data gracefully in their metadata generation:

#### Video Detail Page
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const video = await getVideo(id)

  if (!video) {
    return {
      title: '動画が見つかりません',  // "Video not found"
    }
  }

  return {
    title: `${video.title} - 動画詳細`,
  }
}
```

#### Channel Detail Page
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const channel = await getChannel(id)

  if (!channel) {
    return {
      title: 'チャンネルが見つかりません',  // "Channel not found"
    }
  }

  return {
    title: `${channel.name} - チャンネル詳細`,
  }
}
```

## How It Works

1. **User accesses a detail page** with an ID (e.g., `/videos/abc123` or `/channels/xyz789`)

2. **Data fetching function is called** (`getVideo(id)` or `getChannel(id)`)

3. **Database query is executed** using Supabase client with `.single()` to fetch exactly one row

4. **Error handling**:
   - If no row is found: Supabase returns error code `PGRST116`
   - The function catches this specific error and returns `null`
   - Other database errors are thrown as exceptions

5. **Page component checks the result**:
   - If `null` is returned: Call `notFound()` from Next.js
   - Otherwise: Render the detail page normally

6. **Next.js `notFound()` function**:
   - Sets HTTP status code to 404
   - Renders the default Next.js 404 page (or custom `not-found.tsx` if it exists)
   - Prevents the rest of the page component from executing

## Benefits

### 1. Correct HTTP Status Codes
- Returns `404 Not Found` instead of `500 Internal Server Error`
- Helps search engines and browsers understand that the resource doesn't exist
- Better SEO and web standards compliance

### 2. Better User Experience
- Users see a clear "Page Not Found" message
- Prevents confusion caused by server error pages
- Maintains application stability

### 3. Application Robustness
- Prevents the application from crashing when invalid IDs are accessed
- Gracefully handles edge cases
- Separates "not found" errors from actual application errors

### 4. Proper Error Categorization
- `404 Not Found`: Client error - the requested resource doesn't exist
- `500 Internal Server Error`: Server error - something went wrong with the application

## Testing

A test has been added to verify the 404 handling behavior:

**Location**: `apps/admin/app/(dashboard)/channels/_lib/get-channel.test.ts`

The test verifies:
- ✅ `getChannel()` returns `null` when receiving PGRST116 error (row not found)
- ✅ `getChannel()` throws an error for other database errors

## Related Code

- Video detail page: `apps/admin/app/(dashboard)/videos/[id]/page.tsx`
- Channel detail page: `apps/admin/app/(dashboard)/channels/[id]/page.tsx`
- Get video function: `apps/admin/app/(dashboard)/videos/_lib/get-video.ts`
- Get channel function: `apps/admin/app/(dashboard)/channels/_lib/get-channel.ts`
- Channel test: `apps/admin/app/(dashboard)/channels/_lib/get-channel.test.ts`

## Next.js `notFound()` Documentation

For more information about Next.js's `notFound()` function, see:
https://nextjs.org/docs/app/api-reference/functions/not-found
