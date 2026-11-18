import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: new URL("/sitemap.xml", publicEnv.NEXT_PUBLIC_BASE_URL).toString(),
  };
}
