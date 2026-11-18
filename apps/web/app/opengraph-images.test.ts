// @vitest-environment node
import { globSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const APP_DIR = fileURLToPath(new URL('.', import.meta.url))

/** The directories of the pages, relative to `app/` */
const PAGE_DIRS = globSync('**/page.{mdx,tsx}', { cwd: APP_DIR }).map((path) =>
  dirname(path),
)

/**
 * The directory of the image of the page in `dir`. A catch-all segment
 * cannot have an image file, so its page takes over that of the parent
 * segment (`app/videos/[[...queries]]/page.tsx`).
 */
function getImageDir(dir: string): string {
  return /^\[\[?\.\.\./.test(dir.split('/').at(-1) ?? '') ? dirname(dir) : dir
}

/**
 * Next.js merges the metadata of the segments shallowly, so `openGraph` of a
 * page replaces the image of its parent segments. Each page has its own
 * image, or it has none.
 */
describe('Open Graph images of the pages', () => {
  test('there are pages', () => {
    expect(PAGE_DIRS).toContain('.')
  })

  test.each(PAGE_DIRS)('the page of app/%s has its own image', (dir) => {
    const imageDir = join(APP_DIR, getImageDir(dir))
    const images = globSync('opengraph-image.{jpg,png,tsx}', {
      cwd: imageDir,
    })

    expect(
      images,
      `add opengraph-image.tsx to ${relative(APP_DIR, imageDir) || '.'}`,
    ).toHaveLength(1)
  })
})
