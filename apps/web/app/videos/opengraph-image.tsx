import { createOgImage } from "@/lib/og-image";

export {
  OG_IMAGE_CONTENT_TYPE as contentType,
  OG_IMAGE_SIZE as size,
} from "@/lib/og-image";

const title = "動画一覧";

export const alt = title;

/**
 * The image of the list of videos, which the search results share. The page
 * of `[[...queries]]` takes it over, as a catch-all segment cannot have an
 * image file. Search terms are not drawn, so that anyone cannot make an image
 * of the site with any text in it.
 */
export default function Image() {
  return createOgImage(title);
}
