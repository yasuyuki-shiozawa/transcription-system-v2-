import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Render環境では静的エクスポート、それ以外はスタンドアロン
  output: process.env.RENDER ? 'export' : 'standalone',
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Render環境用の画像最適化設定
  images: {
    unoptimized: process.env.RENDER ? true : false,
  },
  
  async rewrites() {
    // Render環境では不要（直接APIを呼ぶため）
    if (process.env.RENDER) {
      return {
        beforeFiles: [],
        fallback: [],
      };
    }
    
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
        },
      ],
      fallback: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
