import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Load `.env*` from this package root (where `next.config.ts` lives), not only `process.cwd()`.
const envDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(envDir);

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Explicitly expose public env to the client bundle (avoids empty inlining when .env was stale).
  env: {
    NEXT_PUBLIC_MAP_KEY: process.env.NEXT_PUBLIC_MAP_KEY ?? "",
    NEXT_PUBLIC_GENERATED_API_KEY: process.env.NEXT_PUBLIC_GENERATED_API_KEY ?? "",
    NEXT_PUBLIC_IP_ADV_GENERATED_API_KEY: process.env.NEXT_PUBLIC_IP_ADV_GENERATED_API_KEY ?? "",
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
  },
};

export default nextConfig;
