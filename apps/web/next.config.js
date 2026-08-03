const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@aether/ui", "@aether/types"],
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  output: 'export',
};

module.exports = nextConfig;
