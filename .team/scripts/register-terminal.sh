#!/bin/bash

# ターミナル登録スクリプト
# 使用方法: ./register-terminal.sh [terminal-id] [role]

TERMINAL_ID=${1:-"terminal-$(date +%s)"}
ROLE=${2:-"unassigned"}
TEAM_DIR="$(dirname "$0")/.."

# ターミナル情報ファイルを作成
cat > "$TEAM_DIR/terminals/$TERMINAL_ID.json" << EOF
{
  "id": "$TERMINAL_ID",
  "name": "Terminal $TERMINAL_ID",
  "role": "$ROLE",
  "status": "active",
  "capabilities": [],
  "currentTasks": [],
  "workingDirectory": "$(pwd)",
  "environment": {
    "ports": [],
    "processes": []
  },
  "lastActivity": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "lastHeartbeat": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "notes": ""
}
EOF

echo "ターミナル '$TERMINAL_ID' を役割 '$ROLE' で登録しました"

# 登録メッセージを送信
if command -v jq &> /dev/null; then
    # jqがある場合はメッセージを追加
    NEW_MESSAGE=$(cat << EOF
{
  "id": "msg-$(date +%s)",
  "from": "$TERMINAL_ID",
  "to": "all",
  "subject": "新しいターミナルが参加しました",
  "body": "ターミナル $TERMINAL_ID が役割 $ROLE で参加しました",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "read": []
}
EOF
)
    
    # 既存のメッセージを読み込んで新しいメッセージを追加
    jq ".messages += [$NEW_MESSAGE]" "$TEAM_DIR/messages.json" > "$TEAM_DIR/messages.json.tmp" && \
    mv "$TEAM_DIR/messages.json.tmp" "$TEAM_DIR/messages.json"
fi