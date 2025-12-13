/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // basePath ถ้าใช้ repo เป็น subpath
  // เช่น URL จะเป็น https://username.github.io/duwims-dashboard
  basePath: "/duwims1",
  assetPrefix: "/duwims1/",
};

export default nextConfig;
