import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // monorepo: the pnpm workspace root holds node_modules
  turbopack: { root: path.join(__dirname, '../..') },
  output: 'standalone',
};

export default nextConfig;
