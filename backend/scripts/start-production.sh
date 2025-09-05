#!/bin/bash

# 本番環境用の起動スクリプト
echo "🚀 Starting production server..."

# データディレクトリを作成
mkdir -p /app/data

# 環境変数を設定
export DATABASE_URL="file:/app/data/production.db"
export NODE_ENV="production"

echo "📊 Environment variables:"
echo "DATABASE_URL=$DATABASE_URL"
echo "NODE_ENV=$NODE_ENV"

# Prismaデータベースを初期化
echo "🗄️ Initializing database..."
npx prisma db push

# サーバーを起動
echo "⚡ Starting server..."
node dist/index.js

