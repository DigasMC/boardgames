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
    { url: "/tablist.png", revision },
    { url: "/favicon/web-app-manifest-192x192.png", revision },
    { url: "/favicon/web-app-manifest-512x512.png", revision },
    { url: "/favicon/apple-touch-icon.png", revision },
    { url: "/favicon/favicon.ico", revision },
    { url: "/favicon/favicon-96x96.png", revision },
    { url: "/widgets/random-game-template.json", revision },
    { url: "/widgets/random-game-data.json", revision },
  ],
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Hosted MCP (/api/mcp) uses the SDK's Web Standard Streamable HTTP transport.
  // Keep the SDK external so optional Node transports aren't bundled into the route.
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  transpilePackages: ["@tablist/mcp-server"],
  // packages/mcp-server uses NodeNext-style `.js` import specifiers that map to `.ts` sources.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cf.geekdo-images.com" },
      { protocol: "https", hostname: "boardgamegeek.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default withSerwist(nextConfig);
