import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    // Card media in Cloud Storage (Firebase mode). Token download URLs, card folders only.
    remotePatterns: [{ protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/v0/b/tapik-ph-media/o/**" }],
  },
  partialPrefetching: true,
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
