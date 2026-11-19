// @vitest-environment node
import { globSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP_DIR = import.meta.dirname;

/** The directories of the pages, relative to `app/` */
const PAGE_DIRS = globSync("**/page.{mdx,tsx}", { cwd: APP_DIR }).map((file) =>
  path.dirname(file)
);

/**
 * The directory of the image of the page in `dir`. A catch-all segment
 * cannot have an image file, so its page takes over that of the parent
 * segment (`app/videos/[[...queries]]/page.tsx`).
 */
const getImageDir = (dir: string): string =>
  /^\[\[?\.\.\./u.test(dir.split("/").at(-1) ?? "") ? path.dirname(dir) : dir;

/**
 * Next.js merges the metadata of the segments shallowly, so `openGraph` of a
 * page replaces the image of its parent segments. Each page has its own
 * image, or it has none.
 */
describe("Open Graph images of the pages", () => {
  it("there are pages", () => {
    expect(PAGE_DIRS).toContain(".");
  });

  it.each(PAGE_DIRS)("the page of app/%s has its own image", (dir) => {
    const imageDir = path.join(APP_DIR, getImageDir(dir));
    const images = globSync("opengraph-image.{jpg,png,tsx}", {
      cwd: imageDir,
    });

    expect(
      images,
      `add opengraph-image.tsx to ${path.relative(APP_DIR, imageDir) || "."}`
    ).toHaveLength(1);
  });
});
