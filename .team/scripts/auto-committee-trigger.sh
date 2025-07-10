#!/bin/bash

# 自律的委員会活動トリガーシステム
# 使用方法: ./auto-committee-trigger.sh

TEAM_DIR="/mnt/c/Users/shioz/Downloads/transcription-system/.team"
MESSAGES_FILE="$TEAM_DIR/messages.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo "🤖 自律的委員会活動システムを開始します..."

# 最新のメッセージ状況を確認
check_last_activity() {
    local hours_since_last=$(date -d "$(jq -r '.messages[-1].timestamp' "$MESSAGES_FILE" 2>/dev/null || echo '2000-01-01T00:00:00.000Z')" +%s 2>/dev/null || echo 0)
    local current_time=$(date +%s)
    local diff=$((current_time - hours_since_last))
    
    echo "最終活動からの経過時間: $((diff / 3600))時間"
    
    # 2時間以上活動がない場合はトリガーが必要
    if [ $diff -gt 7200 ]; then
        return 0  # トリガー必要
    else
        return 1  # まだ待機
    fi
}

# 委員会自動トリガーメッセージの生成
generate_auto_trigger_message() {
    local msg_id="msg-auto-$(date +%s)"
    local committee="$1"
    local chair="$2"
    local terminal="$3"
    
    cat << EOF
{
  "id": "$msg_id",
  "from": "AutoSystem",
  "to": "$chair",
  "subject": "[AUTO-TRIGGER] ${committee}の活動開始要請",
  "body": "自律システムからの自動トリガーです。\n\n【状況】\n- 委員会活動が2時間以上停滞\n- 24時間期限まで残り時間あり\n- 自動的に活動再開を促します\n\n【アクション要請】\n1. ${committee}を即座に召集\n2. メンバーへの会議開催通知\n3. 初回議事録の作成開始\n\n🤖 自律システムより",
  "timestamp": "$TIMESTAMP",
  "read": [],
  "auto_generated": true
}
EOF
}

# メイン処理
main() {
    echo "📊 委員会活動状況を確認中..."
    
    if check_last_activity; then
        echo "⚡ 活動停滞を検出 - 自動トリガーを実行します"
        
        # 各委員長への自動トリガー
        declare -A committees=(
            ["technical"]="技術委員会:Hephaestus:terminal-3"
            ["quality"]="品質委員会:Athena:terminal-5"
            ["ux"]="UX委員会:Aphrodite:terminal-7"
        )
        
        echo "🚀 委員長への自動トリガーを送信中..."
        
        for committee_key in "${!committees[@]}"; do
            IFS=':' read -r committee_name chair terminal <<< "${committees[$committee_key]}"
            echo "   - [$terminal] $chair ($committee_name)"
        done
        
        echo ""
        echo "📋 推奨アクション:"
        echo "   各ターミナルに以下のメッセージを送信してください:"
        echo ""
        echo "   terminal-3 (Hephaestus): '技術委員会を召集してください。自動システムからのトリガーです。'"
        echo "   terminal-5 (Athena): '品質委員会を召集してください。自動システムからのトリガーです。'"
        echo "   terminal-7 (Aphrodite): 'UX委員会を召集してください。自動システムからのトリガーです。'"
        echo ""
        echo "✨ または、このスクリプトが自動実行することも可能です（将来実装）"
        
    else
        echo "✅ 委員会活動は正常範囲内です - トリガー不要"
    fi
}

# 実行
main "$@"