import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // 通常のNext.jsアプリとしてデプロイ
  output: 'standalone',
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // 画像最適化設定
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
