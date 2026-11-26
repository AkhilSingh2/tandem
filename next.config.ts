import type { NextConfig } from "next";

// STATIC_DEMO=true builds a browser-only demo for GitHub Pages (see src/lib/demo).
const staticDemo = process.env.STATIC_DEMO === "true";
const basePath = "/tandem";

const nextConfig: NextConfig = {
  ...(staticDemo
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
        env: { NEXT_PUBLIC_STATIC_DEMO: "true", NEXT_PUBLIC_BASE_PATH: basePath },
      }
    : {}),
  // Partial prerendering cannot run in a static export.
  cacheComponents: !staticDemo,
  partialPrefetching: !staticDemo,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
