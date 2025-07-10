#!/bin/bash

# 本番環境停止スクリプト

echo "本番環境を停止中..."

# フロントエンドサーバーの停止
if lsof -i :3003 >/dev/null 2>&1; then
    echo "フロントエンドサーバー（ポート3003）を停止中..."
    pkill -f "next.*3003" || true
fi

# バックエンドサーバーの停止（必要に応じて）
echo "バックエンドサーバーを停止しますか？ (y/n)"
echo "注意: 開発環境（ポート3000）も同じバックエンドを使用している可能性があります"
read -r response
if [[ "$response" == "y" ]]; then
    if lsof -i :3001 >/dev/null 2>&1; then
        echo "バックエンドサーバー（ポート3001）を停止中..."
        pkill -f "node.*3001" || true
    fi
fi

echo "停止完了"