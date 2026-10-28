import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root to this folder, so a stray package-lock.json in a
  // parent folder can't make Next.js treat the parent as the workspace.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Dev only: let a phone on the home network use the dev server by the PC's
  // address (the phone app pointed at http://<PC>:3000; see CLAUDE.md).
  allowedDevOrigins: ["192.168.*.*"],
  experimental: {
    serverActions: {
      // Room for the owner's-manual pages sent to the schedule import (see lib/actions/schedules.ts).
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        // The push service worker: always fetch the latest, never a cached copy.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
