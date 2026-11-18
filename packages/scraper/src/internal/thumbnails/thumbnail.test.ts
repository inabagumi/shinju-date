import { HttpResponse, http } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { StorageError } from "../errors.js";
import { createImage, mockStorage, serveImage } from "../testing/images.js";
import { postgresError, setupSupabase } from "../testing/supabase.js";
import { createThumbnail, removeThumbnail } from "./thumbnail.js";

const supabase = setupSupabase();

const IMAGE_URL = "https://images.test/thumbnail.jpg";
const STORAGE_URL = "https://fake.supabase.test/storage/v1/object/thumbnails";
const now = Temporal.Instant.from("2024-05-01T12:34:56.789Z");
const source = { height: 720, url: IMAGE_URL, width: 1280 };

let image: Buffer;

beforeAll(async () => {
  image = await createImage(32, 18);
});

describe("createThumbnail", () => {
  it("stores the image and registers it", async () => {
    const storage = mockStorage(supabase, "thumbnails");
    serveImage(supabase, IMAGE_URL, { body: image });
    supabase.respond(() => []);

    const thumbnail = await createThumbnail({
      folder: "yt-1",
      now,
      source,
      supabaseClient: supabase.supabaseClient,
    });

    expect(thumbnail?.path).toMatch(/^yt-1\/[\w-]+\.jpe?g$/);
    expect(storage.uploads).toEqual([
      { body: image, contentType: "image/jpeg", path: thumbnail?.path },
    ]);
    expect(supabase.written("POST", "thumbnails")[0]?.body).toEqual({
      blur_data_url: expect.stringMatching(/^data:image\/jpeg;base64,/),
      created_at: "2024-05-01T12:34:56Z",
      etag: '"etag-1"',
      height: 720,
      id: thumbnail?.id,
      path: thumbnail?.path,
      updated_at: "2024-05-01T12:34:56Z",
      width: 1280,
    });
  });

  it("stores nothing when the platform reports the image as not modified", async () => {
    const storage = mockStorage(supabase, "thumbnails");
    const requests = serveImage(supabase, IMAGE_URL, { body: image });
    supabase.respond(() => []);

    const thumbnail = await createThumbnail({
      etag: '"etag-1"',
      folder: "yt-1",
      now,
      source,
      supabaseClient: supabase.supabaseClient,
    });

    expect(thumbnail).toBeNull();
    expect(requests).toEqual([{ ifNoneMatch: '"etag-1"', url: IMAGE_URL }]);
    expect(storage.uploads).toHaveLength(0);
    expect(supabase.requests).toHaveLength(0);
  });

  it("stores nothing when the ETag is unchanged even without a 304", async () => {
    const storage = mockStorage(supabase, "thumbnails");
    serveImage(supabase, IMAGE_URL, { body: image, conditional: false });
    supabase.respond(() => []);

    const thumbnail = await createThumbnail({
      etag: '"etag-1"',
      folder: "yt-1",
      now,
      source,
      supabaseClient: supabase.supabaseClient,
    });

    expect(thumbnail).toBeNull();
    expect(storage.uploads).toHaveLength(0);
    expect(supabase.requests).toHaveLength(0);
  });

  it("stores the image when its ETag changed", async () => {
    const storage = mockStorage(supabase, "thumbnails");
    const requests = serveImage(supabase, IMAGE_URL, {
      body: image,
      etag: '"etag-2"',
    });
    supabase.respond(() => []);

    const thumbnail = await createThumbnail({
      etag: '"etag-1"',
      folder: "yt-1",
      now,
      source,
      supabaseClient: supabase.supabaseClient,
    });

    expect(thumbnail?.path).toMatch(/^yt-1\//);
    expect(requests).toEqual([{ ifNoneMatch: '"etag-1"', url: IMAGE_URL }]);
    expect(storage.uploads).toHaveLength(1);
    expect(supabase.written("POST", "thumbnails")[0]?.body).toMatchObject({
      etag: '"etag-2"',
    });
  });

  it("rejects responses that are not images without storing anything", async () => {
    const storage = mockStorage(supabase, "thumbnails");
    serveImage(supabase, IMAGE_URL, { body: image, contentType: "text/html" });
    supabase.respond(() => []);

    await expect(
      createThumbnail({
        folder: "yt-1",
        now,
        source,
        supabaseClient: supabase.supabaseClient,
      })
    ).rejects.toThrow("Expected an image");
    expect(storage.uploads).toHaveLength(0);
    expect(supabase.requests).toHaveLength(0);
  });

  it("rejects error responses without storing anything", async () => {
    const storage = mockStorage(supabase, "thumbnails");
    supabase.server.use(
      http.get(IMAGE_URL, () => new HttpResponse("Not Found", { status: 404 }))
    );
    supabase.respond(() => []);

    await expect(
      createThumbnail({
        folder: "yt-1",
        now,
        source,
        supabaseClient: supabase.supabaseClient,
      })
    ).rejects.toThrow("Failed to download an image (404)");
    expect(storage.uploads).toHaveLength(0);
    expect(supabase.requests).toHaveLength(0);
  });

  it("throws StorageError without registering when the upload fails", async () => {
    mockStorage(supabase, "thumbnails");
    serveImage(supabase, IMAGE_URL, { body: image });
    supabase.server.use(
      http.post(`${STORAGE_URL}/*`, () =>
        HttpResponse.json(
          { error: "Internal", message: "storage is down", statusCode: "500" },
          { status: 500 }
        )
      )
    );
    supabase.respond(() => []);

    const result = createThumbnail({
      folder: "yt-1",
      now,
      source,
      supabaseClient: supabase.supabaseClient,
    });

    await expect(result).rejects.toBeInstanceOf(StorageError);
    await expect(result).rejects.toMatchObject({
      operation: "Failed to upload an image to thumbnails",
    });
    expect(supabase.requests).toHaveLength(0);
  });

  it("removes the stored image when it cannot be registered", async () => {
    const storage = mockStorage(supabase, "thumbnails");
    serveImage(supabase, IMAGE_URL, { body: image });
    supabase.respond(() => postgresError("23502", "null value in column"));

    await expect(
      createThumbnail({
        folder: "yt-1",
        now,
        source,
        supabaseClient: supabase.supabaseClient,
      })
    ).rejects.toThrow("null value in column");
    expect(storage.removed).toEqual([[storage.uploads[0]?.path]]);
    expect(storage.uploads[0]?.path).toMatch(/^yt-1\//);
  });
});

describe("removeThumbnail", () => {
  const thumbnail = { id: "thumb-1", path: "yt-1/abc.jpg" };

  it("removes the row and the stored image", async () => {
    const reportError = vi.fn();
    const storage = mockStorage(supabase, "thumbnails");
    supabase.respond(() => []);

    await removeThumbnail(
      { reportError, supabaseClient: supabase.supabaseClient },
      thumbnail
    );

    expect(supabase.written("DELETE", "thumbnails")[0]?.query["id"]).toBe(
      "eq.thumb-1"
    );
    expect(storage.removed).toEqual([["yt-1/abc.jpg"]]);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("reports a thumbnail that is still used and keeps its image", async () => {
    const reportError = vi.fn();
    const storage = mockStorage(supabase, "thumbnails");
    supabase.respond(() => postgresError("23503", "foreign key violation"));

    await removeThumbnail(
      { reportError, supabaseClient: supabase.supabaseClient },
      thumbnail
    );

    expect(storage.removed).toHaveLength(0);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("still used"),
      }),
      { thumbnailId: "thumb-1", thumbnailPath: "yt-1/abc.jpg" }
    );
  });

  it("reports a row that cannot be deleted and keeps its image", async () => {
    const reportError = vi.fn();
    const storage = mockStorage(supabase, "thumbnails");
    supabase.respond(() => postgresError("42501", "permission denied"));

    await removeThumbnail(
      { reportError, supabaseClient: supabase.supabaseClient },
      thumbnail
    );

    expect(storage.removed).toHaveLength(0);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("permission denied"),
      }),
      { thumbnailId: "thumb-1", thumbnailPath: "yt-1/abc.jpg" }
    );
  });

  it("reports an image that cannot be removed", async () => {
    const reportError = vi.fn();
    mockStorage(supabase, "thumbnails");
    supabase.server.use(
      http.delete(STORAGE_URL, () =>
        HttpResponse.json(
          { error: "Internal", message: "storage is down", statusCode: "500" },
          { status: 500 }
        )
      )
    );
    supabase.respond(() => []);

    await removeThumbnail(
      { reportError, supabaseClient: supabase.supabaseClient },
      thumbnail
    );

    expect(supabase.written("DELETE", "thumbnails")).toHaveLength(1);
    expect(reportError).toHaveBeenCalledWith(expect.any(StorageError), {
      thumbnailId: "thumb-1",
      thumbnailPath: "yt-1/abc.jpg",
    });
    expect(reportError.mock.calls[0]?.[0]).toMatchObject({
      cause: expect.objectContaining({ message: "storage is down" }),
      operation: "Failed to remove images from thumbnails",
    });
  });
});
