/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export",         // สำหรับ static export
  basePath: isProd ? "/duwims1" : "",
  assetPrefix: isProd ? "/duwims1/" : "",
};

module.exports = nextConfig;
