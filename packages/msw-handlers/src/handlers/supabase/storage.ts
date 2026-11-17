import { HttpResponse, http } from 'msw'

/**
 * The handlers of Supabase Storage (`/storage/v1/*`). Use `:path*` to match
 * any nested path structure.
 */
export const storageHandlers = [
  http.post(
    'https://fake.supabase.test/storage/v1/object/sign/thumbnails/:path*',
    async ({ request, params }) => {
      const url = new URL(request.url)
      // Log the full URL for debugging
      console.error('[MSW Storage] createSignedUrl called with URL:', url.href)

      // Extract path from params (handles nested paths correctly)
      // :path* returns an array when there are multiple segments
      const pathParam = params['path']
      const path = Array.isArray(pathParam) ? pathParam.join('/') : pathParam

      console.error('[MSW Storage] Extracted path:', path)

      // Don't add thumbnails/ prefix again - the path parameter from the SDK
      // is relative to the bucket, so it's just "video1.jpg" not "/thumbnails/video1.jpg"
      const signedUrl = `https://fake.supabase.test/storage/v1/object/public/thumbnails/${path}`
      console.error('[MSW Storage] Returning signedURL:', signedUrl)

      // Return a mock signed URL
      // The Supabase storage-js expects { signedURL } from the API
      return HttpResponse.json({
        signedURL: signedUrl,
      })
    },
  ),

  http.post(
    'https://fake.supabase.test/storage/v1/object/sign/profile-images/:path*',
    ({ params }) => {
      const pathParam = params['path']
      const path = Array.isArray(pathParam) ? pathParam.join('/') : pathParam

      return HttpResponse.json({
        signedURL: `https://fake.supabase.test/storage/v1/object/public/profile-images/${path}`,
      })
    },
  ),

  // Profile images are always square
  http.get(
    'https://fake.supabase.test/storage/v1/object/public/profile-images/:path*',
    () =>
      new HttpResponse(
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" />',
        {
          headers: {
            'Accept-Ranges': 'none',
            'Content-Type': 'image/svg+xml',
          },
        },
      ),
  ),

  // Downloads with the service role, as the Open Graph images of the talents
  // do. The icon is filled, so that it can be told from the placeholder.
  http.get(
    'https://fake.supabase.test/storage/v1/object/profile-images/:path*',
    () =>
      new HttpResponse(
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#87ceeb" /></svg>',
        {
          headers: {
            'Content-Type': 'image/svg+xml',
          },
        },
      ),
  ),

  // Handle all thumbnail image fetches with a flexible pattern
  // Use :path* to match any path including nested directories
  http.get(
    'https://fake.supabase.test/storage/v1/object/public/thumbnails/:path*',
    async ({ request }) => {
      console.error('[MSW Storage] GET thumbnail image called:', request.url)
      const dummyImage =
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" />'

      return new HttpResponse(dummyImage, {
        headers: {
          'Accept-Ranges': 'none',
          'Content-Type': 'image/svg+xml',
        },
      })
    },
  ),
]
