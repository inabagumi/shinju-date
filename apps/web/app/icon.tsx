import { notFound } from "next/navigation";

import { createSiteIcon } from "@/lib/site-icon";

const ICONS = [
  { id: "medium", size: 192 },
  { id: "large", size: 512 },
] as const;

export const generateImageMetadata = () =>
  ICONS.map(({ id, size }) => ({
    contentType: "image/png",
    id,
    size: {
      height: size,
      width: size,
    },
  }));

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const iconId = await id;
  const icon = ICONS.find((item) => item.id === iconId);

  if (!icon) {
    notFound();
  }

  return createSiteIcon({ rounded: true, size: icon.size });
}
