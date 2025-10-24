import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase'

export const metadata: Metadata = {
  description: 'Demonstration of MSW handlers working with Supabase calls',
  title: 'MSW Demo',
}

async function getDemoData() {
  // This will be intercepted by MSW in development
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select('id, title, slug, thumbnails(path, blur_data_url)')
    .limit(3)

  if (error) {
    console.error('Supabase error:', error)
    return []
  }

  return videos
}

export default async function MSWDemoPage() {
  // Only show this page when MSW is explicitly enabled
  if (process.env['ENABLE_MSW'] !== 'true') {
    notFound()
  }

  const videos = await getDemoData()

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 font-bold text-3xl">MSW Handlers Demo</h1>

      <div className="mb-8 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h2 className="mb-2 font-semibold text-lg">
          🎯 What's happening here?
        </h2>
        <p className="text-gray-600 text-sm dark:text-gray-300">
          In development mode, MSW intercepts the Supabase API calls and returns
          mock data. In production, this would make real API calls to Supabase.
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-semibold text-xl">
          📹 Sample Videos from MSW
        </h2>

        {videos.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <div
                className="rounded-lg border p-4 shadow-sm dark:border-gray-700"
                key={video.id}
              >
                <h3 className="mb-2 font-semibold">{video.title}</h3>
                <p className="mb-2 text-gray-600 text-sm dark:text-gray-400">
                  Slug: {video.slug}
                </p>
                {video.thumbnails && (
                  <div className="text-gray-500 text-xs">
                    <p>Thumbnail: {video.thumbnails.path}</p>
                    <p>
                      Has blur data:{' '}
                      {video.thumbnails.blur_data_url ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-700 dark:text-red-300">
              No videos found. MSW might not be running or there's an error.
            </p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-semibold text-xl">🛠️ Technical Details</h2>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Environment:</strong> {process.env.NODE_ENV}
          </p>
          <p>
            <strong>MSW Package:</strong> @shinju-date/msw-handlers
          </p>
          <p>
            <strong>Query Used:</strong>{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
              videos.select('id, title, slug, thumbnails(path,
              blur_data_url)').limit(3)
            </code>
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-semibold text-xl">📚 How to Use</h2>
        <div className="prose prose-sm dark:prose-invert">
          <ol>
            <li>MSW automatically starts in development mode</li>
            <li>All Supabase and Upstash calls are intercepted</li>
            <li>Mock data is returned instead of making real API calls</li>
            <li>
              GitHub Copilot gets consistent data structures for better
              completions
            </li>
          </ol>
        </div>
      </section>
    </main>
  )
}
