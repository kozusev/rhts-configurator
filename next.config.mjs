/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // @react-pdf/renderer and sharp are native/heavy — keep them external on the server
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer", "sharp"],
  },
};

export default nextConfig;
