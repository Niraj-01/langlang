import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // .opus ships as application/octet-stream by default; Chromium sniffs
        // it but Safari refuses media without a real type (and 18.4+ plays
        // opus only in an ogg container). Immutable is safe: gen-audio never
        // rewrites a variant slot in place (see scripts/gen-audio.mjs).
        source: "/audio/:path*",
        headers: [
          { key: "Content-Type", value: "audio/ogg" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
