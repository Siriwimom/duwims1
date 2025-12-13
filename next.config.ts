/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export", // ใช้แทน next export
  basePath: isProd ? "/duwims1" : "",
  assetPrefix: isProd ? "/duwims1/" : "",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
