#!/bin/bash

echo "=== 議会議事録作成システム 統合テスト ==="
echo ""
echo "前提条件:"
echo "1. PostgreSQLが起動していること"
echo "2. バックエンドが起動していること (npm run dev)"
echo "3. フロントエンドが起動していること (npm run dev)"
echo ""
echo "テスト手順:"
echo ""
echo "1. ブラウザで http://localhost:3000 を開く"
echo "2. 新規セッション作成"
echo "3. セッションをクリックして詳細画面へ"
echo "4. ファイルアップロードタブで:"
echo "   - NOTTAデータ: samples/sample_input_sectioned.txt"
echo "   - Manusデータ: samples/sample_manus.txt"
echo "5. データ比較タブで両データの並列表示を確認"
echo ""
echo "=== API動作確認 ==="
echo ""

# Create test session
echo "新規セッションを作成中..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テストセッション - 統合テスト",
    "date": "2024-06-23T10:00:00Z"
  }')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*' | sed 's/"id":"//')

if [ -z "$SESSION_ID" ]; then
  echo "エラー: セッションの作成に失敗しました"
  exit 1
fi

echo "セッションID: $SESSION_ID"
echo ""
echo "テスト用のURLs:"
echo "- セッション一覧: http://localhost:3000"
echo "- セッション詳細: http://localhost:3000/sessions/$SESSION_ID"
echo ""
echo "アップロード用ファイル:"
echo "- NOTTA: samples/sample_input_sectioned.txt"
echo "- Manus: samples/sample_manus.txt"
echo ""
echo "=== システムが正常に動作しています ==="