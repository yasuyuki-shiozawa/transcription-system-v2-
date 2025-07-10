#!/bin/bash

echo "=== フロントエンド品質診断（品質委員会作成） ==="
echo "作成者: Thoth（品質委員会）"
echo "目的: Atlas緊急要請（テストサイト問題）への診断支援"
echo "日時: $(date)"
echo ""

# 1. ヘルスチェック確認
echo "1. ヘルスチェック確認"
echo "------------------------"
echo "localhost:3000/api/health への接続テスト:"
curl -I http://localhost:3000/api/health 2>/dev/null || echo "❌ ヘルスチェックエンドポイント接続失敗"
echo ""

# 2. プロセス状態確認
echo "2. プロセス状態確認"
echo "------------------------"
if command -v pm2 &> /dev/null; then
    echo "PM2プロセス一覧:"
    pm2 list
else
    echo "Node.jsプロセス確認:"
    ps aux | grep -E "(node|next)" | grep -v grep
fi
echo ""

# 3. ポート使用状況
echo "3. ポート使用状況確認"
echo "------------------------"
echo "ポート3000の使用状況:"
if command -v lsof &> /dev/null; then
    lsof -i :3000
elif command -v netstat &> /dev/null; then
    netstat -tulpn | grep :3000
else
    echo "ポート確認コマンドが見つかりません"
fi
echo ""

# 4. フロントエンドディレクトリの確認
echo "4. フロントエンドディレクトリ確認"
echo "------------------------"
if [ -d "frontend" ]; then
    cd frontend
    echo "カレントディレクトリ: $(pwd)"
    
    # package.json確認
    if [ -f "package.json" ]; then
        echo "✅ package.json 存在確認"
        echo "Next.js バージョン:"
        grep '"next"' package.json || echo "Next.js依存関係が見つかりません"
    else
        echo "❌ package.json が見つかりません"
    fi
    
    # node_modules確認
    if [ -d "node_modules" ]; then
        echo "✅ node_modules ディレクトリ存在"
    else
        echo "❌ node_modules ディレクトリが見つかりません"
        echo "npm install が必要です"
    fi
    
    # .next確認
    if [ -d ".next" ]; then
        echo "✅ .next ビルドディレクトリ存在"
    else
        echo "⚠️ .next ビルドディレクトリが見つかりません"
        echo "npm run build が必要です"
    fi
    
    cd ..
else
    echo "❌ frontend ディレクトリが見つかりません"
fi
echo ""

# 5. ネットワーク接続テスト
echo "5. ネットワーク接続テスト"
echo "------------------------"
echo "localhost:3000 への接続テスト:"
if curl -s --connect-timeout 5 http://localhost:3000 > /dev/null; then
    echo "✅ localhost:3000 接続成功"
else
    echo "❌ localhost:3000 接続失敗"
fi

echo "localhost:3001 (バックエンド) への接続テスト:"
if curl -s --connect-timeout 5 http://localhost:3001/health > /dev/null; then
    echo "✅ localhost:3001 接続成功"
else
    echo "❌ localhost:3001 接続失敗"
fi
echo ""

# 6. エラーログ確認
echo "6. エラーログ確認"
echo "------------------------"
if [ -f "frontend/dev.log" ]; then
    echo "フロントエンド開発ログの最新エラー:"
    tail -10 frontend/dev.log | grep -i error || echo "最近のエラーログなし"
else
    echo "開発ログファイルが見つかりません"
fi
echo ""

# 7. 診断結果まとめ
echo "7. 診断結果まとめ"
echo "------------------------"
echo "診断完了時刻: $(date)"
echo ""
echo "🔍 品質委員会による診断結果:"
echo "- この診断はAtlasの緊急要請に応答して作成されました"
echo "- Hermesと連携してインフラレベルの問題も確認することを推奨します"
echo "- 問題が継続する場合は、品質委員会までご連絡ください"
echo ""
echo "📋 推奨次のアクション:"
echo "1. プロセス再起動: pm2 restart all"
echo "2. 依存関係再インストール: cd frontend && npm install"
echo "3. 再ビルド: cd frontend && npm run build"
echo "4. VPN設定確認（必要に応じて）"
echo ""
echo "品質委員会（Thoth）による診断完了 📚"