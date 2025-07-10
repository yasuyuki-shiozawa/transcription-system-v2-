#!/bin/bash

# 議会議事録作成システム デプロイスクリプト
# 使用方法: ./deploy.sh [staging|production]

set -e  # エラーが発生したら即座に終了

# カラー出力の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ヘルパー関数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 環境の検証
if [ -z "$1" ]; then
    log_error "環境を指定してください: staging または production"
    echo "使用方法: ./deploy.sh [staging|production]"
    exit 1
fi

ENVIRONMENT=$1

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    log_error "無効な環境: $ENVIRONMENT"
    echo "staging または production を指定してください"
    exit 1
fi

log_info "🚀 $ENVIRONMENT 環境へのデプロイを開始します..."

# 環境変数ファイルの確認
log_info "環境変数ファイルを確認中..."

if [ "$ENVIRONMENT" = "production" ]; then
    if [ ! -f ".env.production" ]; then
        log_error ".env.production ファイルが見つかりません"
        log_info ".env.production.example をコピーして設定してください"
        exit 1
    fi
    
    # 本番環境の重要な環境変数チェック
    required_vars=("DB_PASSWORD" "JWT_SECRET" "API_BASE_URL")
    source .env.production
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "必須の環境変数 $var が設定されていません"
            exit 1
        fi
    done
fi

# Git の状態確認
log_info "Gitリポジトリの状態を確認中..."
if [[ -n $(git status -s) ]]; then
    log_warn "コミットされていない変更があります"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 最新のコードを取得
log_info "最新のコードを取得中..."
git pull origin main

# Dockerイメージのビルド
log_info "Dockerイメージをビルド中..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.production.yml build --no-cache
else
    docker-compose build
fi

# 既存のコンテナを停止
log_info "既存のコンテナを停止中..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.production.yml down
else
    docker-compose down
fi

# データベースのバックアップ（本番環境のみ）
if [ "$ENVIRONMENT" = "production" ]; then
    log_info "データベースのバックアップを作成中..."
    mkdir -p backups
    docker-compose -f docker-compose.production.yml run --rm postgres \
        pg_dump -U postgres transcription_db > "backups/backup_$(date +%Y%m%d_%H%M%S).sql"
fi

# 新しいコンテナを起動
log_info "新しいコンテナを起動中..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.production.yml up -d
else
    docker-compose up -d
fi

# データベースマイグレーションの実行
log_info "データベースマイグレーションを実行中..."
sleep 10  # データベースの起動を待つ

if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.production.yml exec backend npm run prisma:migrate
else
    docker-compose exec backend npm run prisma:migrate
fi

# ヘルスチェック
log_info "ヘルスチェックを実行中..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost/health/live > /dev/null 2>&1; then
        log_info "✅ ヘルスチェック成功"
        break
    fi
    
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        log_error "ヘルスチェックがタイムアウトしました"
        exit 1
    fi
    
    sleep 2
done

# デプロイ完了
log_info "🎉 デプロイが完了しました！"
log_info "アプリケーション URL: http://localhost"

if [ "$ENVIRONMENT" = "production" ]; then
    log_info "本番環境のログを確認: docker-compose -f docker-compose.production.yml logs -f"
else
    log_info "ログを確認: docker-compose logs -f"
fi