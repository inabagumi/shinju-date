// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

// Vitest does not run `'use cache'`, whose settings need Next.js
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
}));

import {
  createOgImage,
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
} from "./og-image";

/** The width and height in the IHDR chunk of a PNG */
function getPNGSize(buffer: ArrayBuffer) {
  const view = new DataView(buffer);

  return { height: view.getUint32(20), width: view.getUint32(16) };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("createOgImage", () => {
  test("should be a 1200x630 PNG with the key visual", async () => {
    // The title is in ASCII, so that no fonts are fetched for it in the tests
    const response = await createOgImage("Videos");

    expect(OG_IMAGE_CONTENT_TYPE).toBe("image/png");
    expect(OG_IMAGE_SIZE).toEqual({ height: 630, width: 1200 });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");

    const body = await response.arrayBuffer();

    expect([...new Uint8Array(body.slice(0, 8))]).toEqual(PNG_SIGNATURE);
    expect(getPNGSize(body)).toEqual({ height: 630, width: 1200 });
  });
});
