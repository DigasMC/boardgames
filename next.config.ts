import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import path from "path";

const revision = crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  cacheOnNavigation: true,
  reloadOnOnline: false,
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/manifest.webmanifest", revision },
  ],
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cf.geekdo-images.com" },
      { protocol: "https", hostname: "boardgamegeek.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default withSerwist(nextConfig);
