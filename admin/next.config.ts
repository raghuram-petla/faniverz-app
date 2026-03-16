import type { NextConfig } from 'next';

// @contract: expose R2_PUBLIC_BASE_URL_* server vars to the client bundle via next.config env.
// This replaces the NEXT_PUBLIC_R2_BASE_URL_* duplicate set — only one set of vars needed in Vercel.
const nextConfig: NextConfig = {
  transpilePackages: ['../shared'],
  env: {
    R2_PUBLIC_BASE_URL_POSTERS: process.env.R2_PUBLIC_BASE_URL_POSTERS,
    R2_PUBLIC_BASE_URL_BACKDROPS: process.env.R2_PUBLIC_BASE_URL_BACKDROPS,
    R2_PUBLIC_BASE_URL_ACTORS: process.env.R2_PUBLIC_BASE_URL_ACTORS,
    R2_PUBLIC_BASE_URL_AVATARS: process.env.R2_PUBLIC_BASE_URL_AVATARS,
    R2_PUBLIC_BASE_URL_PLATFORMS: process.env.R2_PUBLIC_BASE_URL_PLATFORMS,
    R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES: process.env.R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES,
  },
};

export default nextConfig;
