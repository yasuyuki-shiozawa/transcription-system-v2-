import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // 通常のNext.jsアプリとしてデプロイ
  output: 'standalone',
  
  // Runtime環境変数設定
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://transcription-system-obfr.onrender.com',
  },
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://transcription-system-obfr.onrender.com',
  },
  
  // 画像最適化設定
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
