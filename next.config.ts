/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // ทำให้ build ออกมาเป็น static site (แทน next export)
  basePath: "/duwim1", // ชื่อ repo ของ Pat บน GitHub ต้องตรงเป๊ะ
  assetPrefix: "/duwim1",
  images: {
    unoptimized: true, // ปิด image optimization ตอน static export
  },
};

export default nextConfig;
