/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['jspdf', 'nodemailer'],
  async rewrites() {
    return [
      {
        source: '/empresa/:path*',
        destination: '/api/empresa/:path*',
      },
    ];
  },
};

export default nextConfig;
