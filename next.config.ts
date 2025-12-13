/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  // ใช้ static export
  output: "export",

  // ถ้าใช้ GitHub Pages แบบ project page: https://username.github.io/duwims1
  basePath: isProd ? "/duwims1" : "",
  assetPrefix: isProd ? "/duwims1/" : "",

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
