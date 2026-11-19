import type { MetadataRoute } from "next";

import { fetchActiveTalents } from "@/lib/data/talents";
import { publicEnv } from "@/lib/env";
import { SCHEDULE_PATH } from "@/lib/schedule";
import { getTalentPath } from "@/lib/talent-links";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseURL = new URL(publicEnv.NEXT_PUBLIC_BASE_URL);
  const talents = await fetchActiveTalents();
  const sitemapItems: MetadataRoute.Sitemap = [
    {
      changeFrequency: "daily",
      priority: 1,
      url: new URL("/", baseURL).toString(),
    },
    {
      changeFrequency: "daily",
      priority: 0.7,
      url: new URL("/videos", baseURL).toString(),
    },
    // Only the week that includes today. The pages of the other weeks are not
    // indexed.
    {
      changeFrequency: "daily",
      priority: 0.7,
      url: new URL(SCHEDULE_PATH, baseURL).toString(),
    },
    {
      changeFrequency: "weekly",
      priority: 0.7,
      url: new URL("/talents", baseURL).toString(),
    },
    // The pages of the active talents. Their videos change every day.
    ...talents.map((talent): MetadataRoute.Sitemap[number] => ({
      changeFrequency: "daily",
      priority: 0.5,
      url: new URL(getTalentPath(talent.id), baseURL).toString(),
    })),
    {
      changeFrequency: "monthly",
      priority: 0.7,
      url: new URL("/about", baseURL).toString(),
    },
    {
      changeFrequency: "monthly",
      priority: 0.1,
      url: new URL("/privacy", baseURL).toString(),
    },
    {
      changeFrequency: "monthly",
      priority: 0.1,
      url: new URL("/terms", baseURL).toString(),
    },
  ];

  return sitemapItems;
}
