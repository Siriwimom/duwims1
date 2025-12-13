/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export", // สำหรับ static export
  basePath: "/duwims1",
  assetPrefix: "/duwims1/",
};

module.exports = nextConfig;
