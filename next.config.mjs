/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ensure these pages are not statically generated
  async generateBuildId() {
    return 'chorespace-build';
  },
};

export default nextConfig;