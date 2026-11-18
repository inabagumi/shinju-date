import retryableFetch from "@shinju-date/retryable-fetch";

export interface DownloadImageOptions {
  /**
   * The ETag of the image stored before. When given, the image is requested
   * with `If-None-Match`, and counts as unchanged when the platform confirms
   * it (`304 Not Modified`, or the same ETag again).
   */
  etag?: string | null | undefined;
}

/** An image downloaded from its platform, not stored yet. */
export interface DownloadedImage {
  body: ArrayBuffer;
  /** `null` when the platform did not send a `Content-Type`. */
  contentType: string | null;
  etag: string | null;
}

/**
 * Downloads an image, unless it is unchanged since `etag` was received.
 *
 * @returns `null` when the image is unchanged.
 * @throws When the image cannot be downloaded (including an error response)
 *   or the response is not an image.
 */
export async function downloadImage(
  url: string,
  { etag }: DownloadImageOptions = {}
): Promise<DownloadedImage | null> {
  const response = await retryableFetch(url, {
    ...(etag ? { headers: { "If-None-Match": etag } } : {}),
  });

  if (!response.ok && response.status !== 304) {
    // The body is read to reuse the socket.
    await response.arrayBuffer();

    throw new Error(`Failed to download an image (${response.status}): ${url}`);
  }

  const responseEtag = response.headers.get("ETag");

  if (response.status === 304 || (etag && responseEtag === etag)) {
    // The body is read to reuse the socket.
    await response.arrayBuffer();

    return null;
  }

  const contentType = response.headers.get("Content-Type");
  const body = await response.arrayBuffer();

  // Without a Content-Type, decoding the image tells whether it is one.
  if (contentType !== null && !contentType.startsWith("image/")) {
    throw new TypeError(
      `Expected an image but received "${contentType}": ${url}`
    );
  }

  return { body, contentType, etag: responseEtag };
}
