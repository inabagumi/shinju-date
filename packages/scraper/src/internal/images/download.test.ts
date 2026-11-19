import { HttpResponse, http } from "msw";
import { beforeAll, describe, expect, it } from "vitest";

import { createImage, serveImage } from "../testing/images.js";
import { setupSupabase } from "../testing/supabase.js";
import { downloadImage } from "./download.js";

const supabase = setupSupabase();

const IMAGE_URL = "https://images.test/image.jpg";

let image: Buffer;

describe(downloadImage, () => {
  beforeAll(async () => {
    image = await createImage(32, 18);
  });

  it("downloads an image with its Content-Type and ETag", async () => {
    const requests = serveImage(supabase, IMAGE_URL, { body: image });

    const downloaded = await downloadImage(IMAGE_URL);

    expect(downloaded).toMatchObject({
      contentType: "image/jpeg",
      etag: '"etag-1"',
    });
    expect(Buffer.from(downloaded?.body ?? new ArrayBuffer(0))).toStrictEqual(
      image
    );
    expect(requests).toStrictEqual([{ ifNoneMatch: null, url: IMAGE_URL }]);
  });

  it("returns null when the platform reports the image as not modified", async () => {
    const requests = serveImage(supabase, IMAGE_URL, { body: image });

    await expect(
      downloadImage(IMAGE_URL, { etag: '"etag-1"' })
    ).resolves.toBeNull();
    expect(requests).toStrictEqual([
      { ifNoneMatch: '"etag-1"', url: IMAGE_URL },
    ]);
  });

  it("returns null when the ETag is unchanged even without a 304", async () => {
    serveImage(supabase, IMAGE_URL, { body: image, conditional: false });

    await expect(
      downloadImage(IMAGE_URL, { etag: '"etag-1"' })
    ).resolves.toBeNull();
  });

  it("downloads an image whose ETag changed", async () => {
    serveImage(supabase, IMAGE_URL, { body: image, etag: '"etag-2"' });

    await expect(
      downloadImage(IMAGE_URL, { etag: '"etag-1"' })
    ).resolves.toMatchObject({ etag: '"etag-2"' });
  });

  it("accepts an image without a Content-Type", async () => {
    supabase.server.use(
      http.get(
        IMAGE_URL,
        () => new HttpResponse(new Uint8Array(image).buffer, { headers: {} })
      )
    );

    await expect(downloadImage(IMAGE_URL)).resolves.toMatchObject({
      contentType: null,
      etag: null,
    });
  });

  it("rejects error responses", async () => {
    supabase.server.use(
      http.get(IMAGE_URL, () => new HttpResponse("Not Found", { status: 404 }))
    );

    await expect(
      downloadImage(IMAGE_URL, { etag: '"etag-1"' })
    ).rejects.toThrow(`Failed to download an image (404): ${IMAGE_URL}`);
  });

  it("rejects responses that are not images", async () => {
    serveImage(supabase, IMAGE_URL, { body: image, contentType: "text/html" });

    await expect(downloadImage(IMAGE_URL)).rejects.toThrow(
      'Expected an image but received "text/html"'
    );
  });
});
