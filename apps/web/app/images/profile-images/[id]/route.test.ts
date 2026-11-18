// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { createProfileImage } from "@/test/factories";
import {
  failSupabase,
  seedSupabase,
  setupSupabase,
  supabaseRequests,
} from "@/test/supabase";

const mocks = vi.hoisted(() => ({
  serveStorageImage: vi.fn(),
}));

vi.mock("@/lib/storage-image", () => ({
  serveStorageImage: mocks.serveStorageImage,
}));

import { GET } from "./route";

setupSupabase();

function get(id: string): Promise<Response> {
  return GET(
    new NextRequest(`https://shinju.date/images/profile-images/${id}`),
    {
      params: Promise.resolve({ id }),
    }
  );
}

describe("GET /images/profile-images/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.serveStorageImage.mockResolvedValue(new Response("image"));
  });

  it("serves an icon from the profile-images bucket with the service role", async () => {
    const icon = createProfileImage({ path: "youtube/UC1/a.webp" });

    await seedSupabase({ profileImages: [createProfileImage(), icon] });

    const response = await get(icon.id);

    expect(await response.text()).toBe("image");
    // The lookup is sent with the public key, so RLS applies
    expect(supabaseRequests("profile_images").map(({ role }) => role)).toEqual([
      "anon",
    ]);
    expect(mocks.serveStorageImage).toHaveBeenCalledWith(expect.any(Request), {
      bucket: "profile-images",
      path: "youtube/UC1/a.webp",
      supabaseClient: getSupabaseAdminClient(),
    });
  });

  // RLS hides the icons that are not in use from the public key, which the
  // lookup is sent with
  it("answers 404 for icons that cannot be read", async () => {
    await seedSupabase({ profileImages: [createProfileImage()] });

    const response = await get(crypto.randomUUID());

    expect(response.status).toBe(404);
    expect(mocks.serveStorageImage).not.toHaveBeenCalled();
  });

  it("answers 404 when the lookup fails", async () => {
    failSupabase("profile_images", "invalid input syntax for type uuid");

    const response = await get("not-a-uuid");

    expect(response.status).toBe(404);
    expect(mocks.serveStorageImage).not.toHaveBeenCalled();
  });
});
