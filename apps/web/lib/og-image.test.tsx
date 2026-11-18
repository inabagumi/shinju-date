// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// Vitest does not run `'use cache'`, whose settings need Next.js
vi.mock(import("next/cache"), () => ({
  // A name of a profile or an object, which every overload of cacheLife takes
  cacheLife: vi.fn<(profile: string | object) => void>(),
}));

import {
  createOgImage,
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
} from "./og-image";

/** The width and height in the IHDR chunk of a PNG */
const getPNGSize = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);

  return { height: view.getUint32(20), width: view.getUint32(16) };
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe(createOgImage, () => {
  it("should declare a 1200x630 PNG", () => {
    expect(OG_IMAGE_CONTENT_TYPE).toBe("image/png");
    expect(OG_IMAGE_SIZE).toStrictEqual({ height: 630, width: 1200 });
  });

  it("should be a 1200x630 PNG with the key visual", async () => {
    // The title is in ASCII, so that no fonts are fetched for it in the tests
    const response = await createOgImage("Videos");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");

    const body = await response.arrayBuffer();

    expect([...new Uint8Array(body.slice(0, 8))]).toStrictEqual(PNG_SIGNATURE);
    expect(getPNGSize(body)).toStrictEqual({ height: 630, width: 1200 });
  });
});
