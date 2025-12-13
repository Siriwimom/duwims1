/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",          // ใช้ static export
  basePath: "/duwims1",      // ชื่อตรงกับ repo
  // อย่าใส่ assetPrefix ตรงนี้ ให้ปล่อยว่างไว้
};

module.exports = nextConfig;
