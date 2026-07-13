import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack (default in Next.js 16) needs browser fallbacks for Node built-ins
  // that the Stellar SDK may reference in its bundle.
  turbopack: {
    resolveAlias: {
      // Node built-ins used transitively by @stellar/stellar-sdk
      fs: { browser: './lib/empty.ts' },
      net: { browser: './lib/empty.ts' },
      tls: { browser: './lib/empty.ts' },
      crypto: { browser: './lib/empty.ts' },
      stream: { browser: './lib/empty.ts' },
      path: { browser: './lib/empty.ts' },
      os: { browser: './lib/empty.ts' },
      http: { browser: './lib/empty.ts' },
      https: { browser: './lib/empty.ts' },
      zlib: { browser: './lib/empty.ts' },
    },
  },
};

export default nextConfig;
