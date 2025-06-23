#!/bin/bash

echo "=== Transcription System API テスト ==="
echo ""

API_URL="http://localhost:3001"

echo "1. ヘルスチェック"
curl -s ${API_URL}/health | jq '.'
echo ""

echo "2. API情報"
curl -s ${API_URL}/api | jq '.'
echo ""

echo "3. セッション一覧（空の状態）"
curl -s ${API_URL}/api/sessions | jq '.'
echo ""

echo "4. 新規セッション作成"
SESSION_RESPONSE=$(curl -s -X POST ${API_URL}/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "令和6年第1回定例会",
    "date": "2024-03-01T09:00:00Z"
  }')
echo $SESSION_RESPONSE | jq '.'
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.data.id')
echo ""

echo "5. セッション詳細取得"
curl -s ${API_URL}/api/sessions/${SESSION_ID} | jq '.'
echo ""

echo "6. セッション更新"
curl -s -X PUT ${API_URL}/api/sessions/${SESSION_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }' | jq '.'
echo ""

echo "7. 全セッション一覧"
curl -s ${API_URL}/api/sessions | jq '.'
echo ""

echo "=== テスト完了 ==="