import type { MetadataRoute } from "next";

const BASE_URL = "https://intelliquery.shaikhaman.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/settings",
        "/connections",
        "/invite",
        "/api/",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
