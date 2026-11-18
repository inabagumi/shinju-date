// @vitest-environment node
import type { cacheTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProfileImage,
  createTalent,
  createYouTubeChannel,
} from "@/test/factories";
import { seedSupabase, setupSupabase, supabaseRequests } from "@/test/supabase";

// Vitest does not run `'use cache'`, so `fetchTalent` queries every time
vi.mock(import("next/cache"), () => ({
  // A name of a profile or an object, which every overload of cacheLife takes
  cacheLife: vi.fn<(profile: string | object) => void>(),
  cacheTag: vi.fn<typeof cacheTag>(),
}));

import Image, { contentType, size } from "./opengraph-image";

setupSupabase();

// The name is in ASCII, so that no fonts are fetched for it in the tests
const TALENT = createTalent({ name: "Mio Asagiri", theme_color: "#FF6B9D" });
const ICON = createProfileImage({ path: "youtube/UC1/a.webp" });
const CHANNEL = createYouTubeChannel({
  name: "Mio Asagiri",
  profile_image_id: ICON.id,
  talent_id: TALENT.id,
  youtube_channel_id: "UC1",
  youtube_handle: "@mio",
});

const render = (id = TALENT.id): Promise<Response> =>
  Image({ params: Promise.resolve({ id }) });

/** The width and height in the IHDR chunk of a PNG */
const getPNGSize = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);

  return { height: view.getUint32(20), width: view.getUint32(16) };
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("opengraph-image of a talent", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    await seedSupabase({
      profileImages: [ICON],
      talents: [TALENT],
      youtubeChannels: [CHANNEL],
    });
  });

  it("should declare a 1200x630 PNG", () => {
    expect(contentType).toBe("image/png");
    expect(size).toStrictEqual({ height: 630, width: 1200 });
  });

  it("should be a 1200x630 PNG with the icon of the talent", async () => {
    const response = await render();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");

    const body = await response.arrayBuffer();

    expect([...new Uint8Array(body.slice(0, 8))]).toStrictEqual(PNG_SIGNATURE);
    expect(getPNGSize(body)).toStrictEqual({ height: 630, width: 1200 });
    // The icon of the channel is looked up to be drawn
    expect(
      supabaseRequests("profile_images").map(({ url }) =>
        url.searchParams.get("id")
      )
    ).toStrictEqual([`eq.${ICON.id}`]);
  });

  it("should not be cached as immutable", async () => {
    const response = await render();

    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=3600, s-maxage=86400"
    );
  });

  it("should be generated without a theme color or an icon", async () => {
    await seedSupabase({ talents: [{ ...TALENT, theme_color: null }] });

    const response = await render();

    expect(response.status).toBe(200);
    expect(getPNGSize(await response.arrayBuffer())).toStrictEqual({
      height: 630,
      width: 1200,
    });
    expect(supabaseRequests("profile_images")).toStrictEqual([]);
  });

  it.each([
    ["an ID that is not a UUID", "not-a-uuid"],
    ["a talent that does not exist", crypto.randomUUID()],
  ])("should be not found for %s", async (_, id) => {
    await expect(render(id)).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    expect(supabaseRequests("profile_images")).toStrictEqual([]);
  });
});
