import type { MetadataRoute } from "next";

const SITE = "https://tablist.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE}/privacy`,
      lastModified: new Date("2026-10-02"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE}/terms`,
      lastModified: new Date("2026-10-02"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
