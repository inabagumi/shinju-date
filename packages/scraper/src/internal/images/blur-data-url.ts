import sharp from "sharp";

/**
 * Creates the tiny JPEG shown, blurred, while an image loads
 * (`blur_data_url`).
 *
 * @throws When the image cannot be decoded.
 */
export async function createBlurDataURL(
  image: ArrayBuffer | Uint8Array
): Promise<string> {
  const buffer = await sharp(image).resize(10).jpeg().toBuffer();

  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}
