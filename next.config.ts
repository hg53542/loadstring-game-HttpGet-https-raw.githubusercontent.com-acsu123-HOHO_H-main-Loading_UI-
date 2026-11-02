import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three-vrm e three são ESM puros; transpilar evita problemas no bundle do servidor.
  transpilePackages: ['three', '@pixiv/three-vrm'],
};

export default nextConfig;
