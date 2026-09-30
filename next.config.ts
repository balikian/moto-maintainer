import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Room for the owner's-manual pages sent to the schedule import (see lib/actions/schedules.ts).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
