import type { MetadataRoute } from "next";

import { SITE_NAME, SITE_THEME_COLOR } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // var(--color-background) のライトの値
    background_color: "#ffffff",
    display: "standalone",
    icons: [
      {
        sizes: "192x192",
        src: "/icon/medium?v=20240329",
        type: "image/png",
      },
      {
        sizes: "512x512",
        src: "/icon/large?v=20240329",
        type: "image/png",
      },
    ],
    name: SITE_NAME,
    scope: "/",
    short_name: SITE_NAME,
    start_url: "/",
    theme_color: SITE_THEME_COLOR,
  };
}
