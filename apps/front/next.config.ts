import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Raiz do monorepo (evita o Turbopack inferir root errado por lockfiles fora do projeto)
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'icons.brapi.dev',
        pathname: '/icons/**',
      },
    ],
  },
};

export default nextConfig;
