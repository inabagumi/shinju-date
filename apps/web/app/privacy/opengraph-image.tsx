import { createOgImage } from "@/lib/og-image";

export {
  OG_IMAGE_CONTENT_TYPE as contentType,
  OG_IMAGE_SIZE as size,
} from "@/lib/og-image";

const title = "プライバシーポリシー";

export const alt = title;

export default function Image() {
  return createOgImage(title);
}
