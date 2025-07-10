#!/bin/bash

# 本番環境起動スクリプト（共有用）
# ポート3003で起動し、ネットワーク上の他のPCからアクセス可能にする

echo "============================================"
echo "議会議事録作成システム - 本番環境起動"
echo "============================================"

# 現在のディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# 既存のプロセスを確認
echo "既存のプロセスを確認中..."
if lsof -i :3003 >/dev/null 2>&1; then
    echo "ポート3003が使用中です。既存のプロセスを停止しますか？ (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        # Next.jsプロセスを停止
        pkill -f "next.*3003" || true
        sleep 2
    else
        echo "起動を中止します。"
        exit 1
    fi
fi

# バックエンドサーバーの確認と起動
echo "バックエンドサーバーを確認中..."
cd backend
if ! lsof -i :3001 >/dev/null 2>&1; then
    echo "バックエンドサーバーを起動します..."
    npm run dev > ../logs/backend-production.log 2>&1 &
    echo "バックエンドサーバーを起動しました (PID: $!)"
    sleep 5
else
    echo "バックエンドサーバーは既に起動しています"
fi

# フロントエンドサーバーの起動
echo "フロントエンドサーバーを起動中..."
cd ../frontend

# 本番用環境変数の設定
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=http://localhost:3001/api
export NEXT_PUBLIC_VPN_OPTIMIZATION=true
export PORT=3003

# 本番ビルドの作成（初回またはコード変更時）
if [ ! -d ".next" ] || [ "$1" == "--build" ]; then
    echo "本番ビルドを作成中..."
    npm run build:vpn
fi

# 本番サーバーの起動
echo "本番サーバーを起動します..."
npm run start -- -H 0.0.0.0 -p 3003 > ../logs/frontend-production.log 2>&1 &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "起動完了！"
echo "============================================"
echo ""
echo "アクセス方法："
echo "- このPC: http://localhost:3003"
echo "- 他のPC: http://$(hostname -I | awk '{print $1}'):3003"
echo ""
echo "サーバーを停止するには："
echo "- Ctrl+C を押してください"
echo "- または別のターミナルで: ./scripts/stop-production.sh"
echo ""
echo "ログファイル："
echo "- フロントエンド: logs/frontend-production.log"
echo "- バックエンド: logs/backend-production.log"
echo ""

# プロセスの監視
wait $FRONTEND_PID