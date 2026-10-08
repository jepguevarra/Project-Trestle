import type { NextConfig } from "next";

// Importing the env module validates every variable when the config loads, so a missing or
// malformed variable fails `pnpm build` (and `pnpm dev`) instead of the first request.
import "./lib/env";

const nextConfig: NextConfig = {
  typedRoutes: true,
};

export default nextConfig;
