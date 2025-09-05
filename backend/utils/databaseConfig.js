/**
 * データベース設定ユーティリティ
 * 環境に応じて適切なDATABASE_URLを返す
 */

const getDatabaseUrl = () => {
  // 本番環境（Render）の場合
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    return 'file:/app/data/production.db';
  }
  
  // 開発環境の場合
  return process.env.DATABASE_URL || 'file:./dev.db';
};

module.exports = {
  getDatabaseUrl
};

