/**
 * 環境変数設定ユーティリティ
 * 本番環境で適切なDATABASE_URLを自動設定
 */

export const setupEnvironment = () => {
  // 本番環境の判定
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.RENDER === 'true' ||
                      process.env.RENDER_SERVICE_ID;

  if (isProduction) {
    // 本番環境用のDATABASE_URLを設定
    process.env.DATABASE_URL = 'file:/app/data/production.db';
    console.log('🔧 Production environment detected, DATABASE_URL set to:', process.env.DATABASE_URL);
  } else {
    // 開発環境では既存の設定を使用
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./dev.db';
    }
    console.log('🔧 Development environment, DATABASE_URL:', process.env.DATABASE_URL);
  }

  // その他の環境変数の設定
  if (isProduction) {
    process.env.NODE_ENV = 'production';
  }

  console.log('🌍 Environment setup complete:', {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    RENDER: process.env.RENDER,
    RENDER_SERVICE_ID: process.env.RENDER_SERVICE_ID ? 'set' : 'not set'
  });
};

