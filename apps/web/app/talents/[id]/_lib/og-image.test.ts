// @vitest-environment node

import { HttpResponse, http } from "msw";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SITE_THEME_COLOR } from "@/lib/site";
import { createProfileImage } from "@/test/factories";
import {
  failSupabase,
  seedSupabase,
  setupSupabase,
  supabaseRequests,
  supabaseServer,
} from "@/test/supabase";

vi.mock("@shinju-date/logger", () => ({
  logger: { warn: vi.fn() },
}));

import { fetchTalentIconDataURL, getTalentThemeColor } from "./og-image";

setupSupabase();

const ICON = createProfileImage({ path: "youtube/UC1/a.webp" });

/** The URL the icons are downloaded from with the service role */
const DOWNLOAD_URL =
  "https://fake.supabase.test/storage/v1/object/profile-images/*";

describe("getTalentThemeColor", () => {
  it("should use the theme color of the talent", () => {
    expect(getTalentThemeColor("#FF6B9D")).toBe("#ff6b9d");
    expect(getTalentThemeColor("#87ceeb")).toBe("#87ceeb");
  });

  it("should use the site theme color without a theme color", () => {
    expect(getTalentThemeColor(null)).toBe(SITE_THEME_COLOR);
    expect(getTalentThemeColor(undefined)).toBe(SITE_THEME_COLOR);
    expect(getTalentThemeColor("")).toBe(SITE_THEME_COLOR);
  });

  it("should use the site theme color for values that are not #rrggbb", () => {
    for (const value of [
      "#fff",
      "#ff6b9d80",
      "FF6B9D",
      "red",
      "#GGGGGG",
      " #FF6B9D",
      "#FF6B9D\n",
      "rgb(255, 0, 0)",
      "url(https://example.com)",
    ]) {
      expect(getTalentThemeColor(value)).toBe(SITE_THEME_COLOR);
    }
  });
});

describe("fetchTalentIconDataURL", () => {
  const profileImage = { blur_data_url: ICON.blur_data_url, id: ICON.id };

  beforeEach(async () => {
    vi.clearAllMocks();

    await seedSupabase({ profileImages: [ICON] });
  });

  it("should convert the icon to a PNG of the given size", async () => {
    const webp = await sharp({
      create: {
        background: "#ff0000",
        channels: 3,
        height: 64,
        width: 64,
      },
    })
      .webp()
      .toBuffer();
    const downloads: string[] = [];

    supabaseServer.use(
      http.get(DOWNLOAD_URL, ({ request }) => {
        downloads.push(new URL(request.url).pathname);

        return new HttpResponse(new Uint8Array(webp), {
          headers: { "Content-Type": "image/webp" },
        });
      })
    );

    const dataURL = await fetchTalentIconDataURL(profileImage, 320);

    expect(dataURL).toMatch(/^data:image\/png;base64,/);
    // The lookup is sent with the public key, so RLS applies
    expect(supabaseRequests("profile_images").map(({ role }) => role)).toEqual([
      "anon",
    ]);
    expect(downloads).toEqual([
      "/storage/v1/object/profile-images/youtube/UC1/a.webp",
    ]);

    const png = Buffer.from(
      (dataURL ?? "").replace("data:image/png;base64,", ""),
      "base64"
    );

    await expect(sharp(png).metadata()).resolves.toMatchObject({
      format: "png",
      height: 320,
      width: 320,
    });
  });

  it("should return null for a talent without an icon", async () => {
    await expect(fetchTalentIconDataURL(null, 320)).resolves.toBeNull();

    expect(supabaseRequests()).toEqual([]);
  });

  // RLS hides the icons that are not in use from the public key
  it("should return null for an icon that cannot be read", async () => {
    await seedSupabase();

    await expect(fetchTalentIconDataURL(profileImage, 320)).resolves.toBeNull();
  });

  it("should return null when the lookup fails", async () => {
    failSupabase("profile_images", "failed");

    await expect(fetchTalentIconDataURL(profileImage, 320)).resolves.toBeNull();
  });

  it("should return null when the download fails", async () => {
    supabaseServer.use(
      http.get(DOWNLOAD_URL, () =>
        HttpResponse.json(
          {
            error: "not_found",
            message: "Object not found",
            statusCode: "404",
          },
          { status: 400 }
        )
      )
    );

    await expect(fetchTalentIconDataURL(profileImage, 320)).resolves.toBeNull();
  });

  it("should return null for an icon that cannot be converted", async () => {
    supabaseServer.use(
      http.get(DOWNLOAD_URL, () => new HttpResponse("not an image"))
    );

    await expect(fetchTalentIconDataURL(profileImage, 320)).resolves.toBeNull();
  });
});
