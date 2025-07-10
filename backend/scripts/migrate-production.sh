#!/bin/bash

# 本番環境でのPrismaマイグレーションスクリプト
# 安全なマイグレーションのためのチェックとバックアップを含む

set -e  # エラーが発生したら即座に終了

echo "🔄 Starting production database migration..."

# 環境変数チェック
if [ "$NODE_ENV" != "production" ]; then
    echo "❌ Error: This script should only be run in production environment"
    exit 1
fi

# データベース接続確認
echo "📊 Checking database connection..."
npx prisma db pull --print 2>&1 > /dev/null || {
    echo "❌ Error: Cannot connect to database"
    exit 1
}

# バックアップの作成（PostgreSQLの場合）
if [[ $DATABASE_URL == *"postgresql"* ]]; then
    echo "💾 Creating database backup..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump $DATABASE_URL > "/app/backups/$BACKUP_FILE" || {
        echo "❌ Error: Failed to create backup"
        exit 1
    }
    echo "✅ Backup created: $BACKUP_FILE"
fi

# マイグレーションの実行
echo "🚀 Running migrations..."
npx prisma migrate deploy

# マイグレーション成功
echo "✅ Migration completed successfully!"

# Prismaクライアントの再生成
echo "🔧 Regenerating Prisma Client..."
npx prisma generate

echo "✨ All done!"