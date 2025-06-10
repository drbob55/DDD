// apps/web/next.config.js

/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // This is crucial for monorepos - tells Next.js to transpile workspace packages
  transpilePackages: ['@dental/core', '@dental/shared', '@dental/database'],
  
  // Optional: Enable SWC minification
  swcMinify: true,

  // Configure webpack to resolve Prisma client correctly
  webpack: (config, { isServer }) => {
    // Add alias for Prisma client in the database package
    config.resolve.alias = {
      ...config.resolve.alias,
      '.prisma/client/default': path.resolve(__dirname, '../../packages/database/node_modules/.prisma/client/default.js'),
      '.prisma/client': path.resolve(__dirname, '../../packages/database/node_modules/.prisma/client'),
      '@prisma/client/runtime': path.resolve(__dirname, '../../packages/database/node_modules/@prisma/client/runtime'),
    };

    // Add the database node_modules to resolve paths
    config.resolve.modules.push(
      path.resolve(__dirname, '../../packages/database/node_modules')
    );

    // Fallback for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    return config;
  },

  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@dental/database'],
  },
}

module.exports = nextConfig