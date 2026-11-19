// @vitest-environment node
import { DUMMY_THUMBNAIL_PNG } from "@shinju-date/constants";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import { serveStorageImage } from "./storage-image";
import type { ServeStorageImageOptions } from "./storage-image";

const SIGNED_URL = "https://storage.test/signed/youtube/UC1/a.webp?token=t";

interface SignedUrlResult {
  data: { signedUrl: string } | null;
  error: unknown;
}

/** The part of `createSignedUrl` of Supabase Storage that is used */
type CreateSignedUrl = (
  path: string,
  expiresIn: number
) => Promise<SignedUrlResult>;

const createClient = (
  signed: SignedUrlResult
): {
  createSignedUrl: Mock<CreateSignedUrl>;
  options: ServeStorageImageOptions;
} => {
  const createSignedUrl = vi.fn<CreateSignedUrl>().mockResolvedValue(signed);
  const supabaseClient = {
    storage: {
      from: vi.fn<(bucket: string) => { createSignedUrl: CreateSignedUrl }>(
        () => ({ createSignedUrl })
      ),
    },
  } as unknown as ServeStorageImageOptions["supabaseClient"];

  return {
    createSignedUrl,
    options: {
      bucket: "profile-images",
      path: "youtube/UC1/a.webp",
      supabaseClient,
    },
  };
};

/** `fetch` that answers the object of the signed URL */
const mockFetchOfImage = (): Mock<typeof fetch> =>
  vi.fn<typeof fetch>().mockResolvedValue(
    new Response("webp", {
      headers: { "Content-Length": "4", "Content-Type": "image/webp" },
    })
  );

const request = new Request("https://shinju.date/images/profile-images/1", {
  headers: { Accept: "image/webp", Cookie: "session=secret" },
});

describe(serveStorageImage, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("streams the object through a short-lived signed URL", async () => {
    vi.stubGlobal("fetch", mockFetchOfImage());
    const { createSignedUrl, options } = createClient({
      data: { signedUrl: SIGNED_URL },
      error: null,
    });

    const response = await serveStorageImage(request, options);

    expect(createSignedUrl).toHaveBeenCalledWith("youtube/UC1/a.webp", 600);
    await expect(response.text()).resolves.toBe("webp");
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=600");
  });

  it("fetches the signed URL with the Accept header but without the cookies", async () => {
    const fetchMock = mockFetchOfImage();
    vi.stubGlobal("fetch", fetchMock);
    const { options } = createClient({
      data: { signedUrl: SIGNED_URL },
      error: null,
    });

    await serveStorageImage(request, options);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Headers;

    expect(url).toBe(SIGNED_URL);
    expect(headers.get("Accept")).toBe("image/webp");
    expect(headers.has("Cookie")).toBeFalsy();
  });

  it("falls back to a transparent PNG when the object cannot be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 404 }))
    );
    const { options } = createClient({
      data: { signedUrl: SIGNED_URL },
      error: null,
    });

    const response = await serveStorageImage(request, options);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toStrictEqual(
      DUMMY_THUMBNAIL_PNG
    );
  });

  it("answers 500 when no signed URL can be created", async () => {
    const { options } = createClient({
      data: null,
      error: new Error("Object not found"),
    });

    const response = await serveStorageImage(request, options);

    expect(response.status).toBe(500);
  });
});
