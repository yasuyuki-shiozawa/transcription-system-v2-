#!/bin/bash

# ハートビート更新スクリプト
# 使用方法: ./heartbeat.sh [terminal-id]

TERMINAL_ID=${1:-"terminal-1"}
TEAM_DIR="$(dirname "$0")/.."
TERMINAL_FILE="$TEAM_DIR/terminals/$TERMINAL_ID.json"

if [ ! -f "$TERMINAL_FILE" ]; then
    echo "エラー: ターミナル '$TERMINAL_ID' が見つかりません"
    exit 1
fi

# 現在時刻を取得
CURRENT_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# jqがある場合は使用、ない場合は簡易的な更新
if command -v jq &> /dev/null; then
    jq ".lastHeartbeat = \"$CURRENT_TIME\"" "$TERMINAL_FILE" > "$TERMINAL_FILE.tmp" && \
    mv "$TERMINAL_FILE.tmp" "$TERMINAL_FILE"
else
    # sedで直接更新（簡易版）
    sed -i "s/\"lastHeartbeat\": \"[^\"]*\"/\"lastHeartbeat\": \"$CURRENT_TIME\"/" "$TERMINAL_FILE"
fi

echo "ターミナル '$TERMINAL_ID' のハートビートを更新しました: $CURRENT_TIME"