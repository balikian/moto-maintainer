import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root to this folder, so a stray package-lock.json in a
  // parent folder can't make Next.js treat the parent as the workspace.
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      // Room for the owner's-manual pages sent to the schedule import (see lib/actions/schedules.ts).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
