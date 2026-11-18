import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { DatabaseError, StorageError } from "../errors.js";
import { mockStorage } from "../testing/images.js";
import { postgresError, setupSupabase } from "../testing/supabase.js";
import {
  IMAGE_CACHE_CONTROL,
  removeImage,
  removeStoredImages,
  storeImage,
} from "./storage.js";

const supabase = setupSupabase();

const BUCKET = "images";
const BUCKET_URL = `https://fake.supabase.test/storage/v1/object/${BUCKET}`;
const image = { id: "image-1", path: "a/b.webp" };

function storageError(): Response {
  return HttpResponse.json(
    { error: "Internal", message: "storage is down", statusCode: "500" },
    { status: 500 }
  );
}

describe("storeImage", () => {
  it("uploads the image to a new path, cached for a year", async () => {
    const storage = mockStorage(supabase, BUCKET);

    await storeImage(supabase.supabaseClient, {
      bucket: BUCKET,
      contentType: "image/webp",
      image: new Uint8Array([1, 2, 3]),
      path: image.path,
    });

    expect(storage.uploads).toEqual([
      {
        body: Buffer.from([1, 2, 3]),
        contentType: "image/webp",
        path: image.path,
      },
    ]);
  });

  it("asks storage to cache the image for a year and never overwrite", async () => {
    const headers: Headers[] = [];
    supabase.server.use(
      http.post(`${BUCKET_URL}/*`, ({ request }) => {
        headers.push(request.headers);

        return HttpResponse.json({ Key: `${BUCKET}/${image.path}` });
      })
    );

    await storeImage(supabase.supabaseClient, {
      bucket: BUCKET,
      contentType: "image/webp",
      image: new Uint8Array([1, 2, 3]),
      path: image.path,
    });

    expect(IMAGE_CACHE_CONTROL).toBe("31536000");
    expect(headers[0]?.get("cache-control")).toBe("max-age=31536000");
    expect(headers[0]?.get("x-upsert")).toBe("false");
  });

  it("throws StorageError when the image cannot be uploaded", async () => {
    supabase.server.use(http.post(`${BUCKET_URL}/*`, storageError));

    await expect(
      storeImage(supabase.supabaseClient, {
        bucket: BUCKET,
        contentType: "image/webp",
        image: new Uint8Array([1, 2, 3]),
        path: image.path,
      })
    ).rejects.toMatchObject({
      name: "StorageError",
      operation: `Failed to upload an image to ${BUCKET}`,
    });
  });
});

describe("removeStoredImages", () => {
  it("removes the images in one request", async () => {
    const storage = mockStorage(supabase, BUCKET);

    await removeStoredImages(supabase.supabaseClient, {
      bucket: BUCKET,
      paths: ["a/1.jpg", "b/2.jpg"],
    });

    expect(storage.removed).toEqual([["a/1.jpg", "b/2.jpg"]]);
  });

  it("throws StorageError when the images cannot be removed", async () => {
    supabase.server.use(http.delete(BUCKET_URL, storageError));

    await expect(
      removeStoredImages(supabase.supabaseClient, {
        bucket: BUCKET,
        paths: ["a/1.jpg"],
      })
    ).rejects.toMatchObject({
      name: "StorageError",
      operation: `Failed to remove images from ${BUCKET}`,
    });
  });
});

describe("removeImage", () => {
  it("deletes the row, then the stored image", async () => {
    const storage = mockStorage(supabase, BUCKET);
    supabase.respond(() => []);

    await expect(
      removeImage(supabase.supabaseClient, {
        bucket: BUCKET,
        image,
        table: "thumbnails",
      })
    ).resolves.toBe(true);
    expect(supabase.written("DELETE", "thumbnails")[0]?.query["id"]).toBe(
      "eq.image-1"
    );
    expect(storage.removed).toEqual([[image.path]]);
  });

  it("keeps an image that is still used", async () => {
    const storage = mockStorage(supabase, BUCKET);
    supabase.respond(() =>
      postgresError("23503", "violates foreign key constraint")
    );

    await expect(
      removeImage(supabase.supabaseClient, {
        bucket: BUCKET,
        image,
        table: "profile_images",
      })
    ).resolves.toBe(false);
    expect(storage.removed).toHaveLength(0);
  });

  it("throws DatabaseError and keeps the image when the row cannot be deleted", async () => {
    const storage = mockStorage(supabase, BUCKET);
    supabase.respond(() => postgresError("42501", "permission denied"));

    const result = removeImage(supabase.supabaseClient, {
      bucket: BUCKET,
      image,
      table: "thumbnails",
    });

    await expect(result).rejects.toBeInstanceOf(DatabaseError);
    await expect(result).rejects.toThrow("permission denied");
    expect(storage.removed).toHaveLength(0);
  });

  it("throws StorageError when the image cannot be removed after its row", async () => {
    supabase.server.use(http.delete(BUCKET_URL, storageError));
    supabase.respond(() => []);

    await expect(
      removeImage(supabase.supabaseClient, {
        bucket: BUCKET,
        image,
        table: "thumbnails",
      })
    ).rejects.toBeInstanceOf(StorageError);
    expect(supabase.written("DELETE", "thumbnails")).toHaveLength(1);
  });
});
