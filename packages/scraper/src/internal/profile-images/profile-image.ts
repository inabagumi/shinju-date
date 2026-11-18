import type { Enums } from "@shinju-date/database";
import { toDBString } from "@shinju-date/temporal-fns";
import { nanoid } from "nanoid";
import sharp from "sharp";

import type { TypedSupabaseClient } from "../../types.js";
import { DatabaseError, StorageError } from "../errors.js";
import {
  createBlurDataURL,
  downloadImage,
  removeImage,
  removeStoredImages,
  storeImage,
} from "../images/index.js";

export const PROFILE_IMAGES_BUCKET = "profile-images";

/** Stored icons are square and at most this many pixels wide. */
export const MAX_PROFILE_IMAGE_SIZE = 256;

/** The YouTube channel or Twitch user an icon belongs to. */
export interface ProfileImageOwner {
  /** `youtube_channels.id` or `twitch_users.id`. */
  id: string;
  platform: Enums<"platform_type">;
  /**
   * The channel or user ID on the platform. Stored objects are grouped under
   * it so they can be traced back to their owner.
   */
  platformId: string;
}

/** A stored icon, as far as keeping it up to date is concerned. */
export interface StoredProfileImage {
  etag: string | null;
  id: string;
  path: string;
  sourceUrl: string;
}

/** An icon downloaded from its platform, not stored yet. */
export interface DownloadedProfileImage {
  body: ArrayBuffer;
  etag: string | null;
  sourceUrl: string;
}

/**
 * Downloads an icon unless it is known to be unchanged since `saved` was
 * stored.
 *
 * An icon is unchanged when it comes from the same URL and the platform
 * confirms its ETag (`304 Not Modified`, or the same ETag again). A new URL
 * always counts as a new icon, because platforms such as YouTube may send
 * version-like ETags that are the same for different images.
 *
 * @returns `null` when the icon is unchanged.
 * @throws When the icon cannot be downloaded (including an error response)
 *   or is not an image.
 */
export async function downloadProfileImage(
  sourceUrl: string,
  saved: StoredProfileImage | null
): Promise<DownloadedProfileImage | null> {
  const savedEtag = saved?.sourceUrl === sourceUrl ? saved.etag : null;

  if (saved?.sourceUrl === sourceUrl && !savedEtag) {
    // Nothing to compare the response with; the URL is the best evidence.
    return null;
  }

  const downloaded = await downloadImage(sourceUrl, { etag: savedEtag });

  if (!downloaded) {
    return null;
  }

  return { body: downloaded.body, etag: downloaded.etag, sourceUrl };
}

/**
 * Crops an image to a centred square no larger than
 * {@link MAX_PROFILE_IMAGE_SIZE} and encodes it as WebP.
 */
async function toSquareWebP(
  image: ArrayBuffer
): Promise<{ body: Buffer; size: number }> {
  const { height, width } = await sharp(image).metadata();
  const size = Math.min(width, height, MAX_PROFILE_IMAGE_SIZE);
  const body = await sharp(image)
    .rotate()
    .resize(size, size, { fit: "cover", position: "centre" })
    .webp()
    .toBuffer();

  return { body, size };
}

export interface CreateProfileImageOptions {
  image: DownloadedProfileImage;
  now: Temporal.Instant;
  owner: ProfileImageOwner;
  supabaseClient: TypedSupabaseClient;
}

/**
 * Stores a downloaded icon in the profile-images bucket and registers it in
 * the `profile_images` table. The icon is not assigned to its owner yet.
 *
 * @throws When the image cannot be decoded, stored or registered. Nothing is
 *   left behind in that case.
 */
export async function createProfileImage({
  image,
  now,
  owner,
  supabaseClient,
}: CreateProfileImageOptions): Promise<StoredProfileImage> {
  // Decoding first means a broken image is rejected before anything is stored.
  const { body, size } = await toSquareWebP(image.body);
  const blurDataURL = await createBlurDataURL(body);
  const stored: StoredProfileImage = {
    etag: image.etag,
    id: crypto.randomUUID(),
    path: `${owner.platform}/${owner.platformId}/${nanoid()}.webp`,
    sourceUrl: image.sourceUrl,
  };

  await storeImage(supabaseClient, {
    bucket: PROFILE_IMAGES_BUCKET,
    contentType: "image/webp",
    image: body,
    path: stored.path,
  });

  const timestamp = toDBString(now);
  const { error: insertError } = await supabaseClient
    .from("profile_images")
    .insert({
      blur_data_url: blurDataURL,
      created_at: timestamp,
      etag: stored.etag,
      height: size,
      id: stored.id,
      path: stored.path,
      source_url: stored.sourceUrl,
      updated_at: timestamp,
      width: size,
    });

  if (insertError) {
    await removeStoredImages(supabaseClient, {
      bucket: PROFILE_IMAGES_BUCKET,
      paths: [stored.path],
    }).catch(() => {
      // Ignored: the insert error is the one to throw, and an object without
      // its row is never served.
    });

    throw new DatabaseError("Failed to insert a profile image", insertError);
  }

  return stored;
}

/**
 * Deletes an icon that is no longer used: first its row, then its object.
 *
 * The database refuses to delete an icon that a channel or user still uses,
 * so this is safe to call for any icon believed to be unused. The object is
 * only removed once the row is gone, so a used icon never loses its image.
 *
 * @returns Whether the icon was deleted (`false` when it is still in use).
 * @throws When the row cannot be deleted for another reason. A failure to
 *   remove the object is ignored: without its row it is never served.
 */
export async function removeProfileImage(
  supabaseClient: TypedSupabaseClient,
  image: Pick<StoredProfileImage, "id" | "path">
): Promise<boolean> {
  try {
    return await removeImage(supabaseClient, {
      bucket: PROFILE_IMAGES_BUCKET,
      image,
      table: "profile_images",
    });
  } catch (error) {
    if (error instanceof StorageError) {
      // Ignored on purpose, see above.
      return true;
    }

    throw error;
  }
}
