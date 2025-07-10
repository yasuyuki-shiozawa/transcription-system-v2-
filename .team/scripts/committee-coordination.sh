#!/bin/bash

# 委員会調整システム
# Atlas が委員会の招集・運営を仲介するシステム

TEAM_DIR="/mnt/c/Users/shioz/Downloads/transcription-system/.team"
MEETINGS_DIR="$TEAM_DIR/meetings"
COORDINATION_FILE="$TEAM_DIR/committee-coordination.json"

# 委員会招集要請を検出
detect_meeting_calls() {
    echo "📋 委員会招集要請をチェック中..."
    
    # 最新メッセージから招集関連を検索
    local recent_time=$(date -d "10 minutes ago" -u +"%Y-%m-%dT%H:%M:%S.000Z")
    local meeting_calls=$(jq --arg recent "$recent_time" '[.messages[] | select(.timestamp > $recent and (.subject | contains("召集") or contains("会議") or contains("committee")))]' "$TEAM_DIR/messages.json" 2>/dev/null)
    
    if [ "$(echo "$meeting_calls" | jq '. | length')" -gt 0 ]; then
        echo "🆕 新しい委員会招集要請を検出！"
        echo "$meeting_calls" | jq -r '.[] | "   - \(.from): \(.subject)"'
        return 0
    fi
    
    echo "   招集要請なし"
    return 1
}

# 委員会メンバーに招集通知を作成
create_meeting_notification() {
    local committee="$1"
    local chair="$2"
    local agenda="$3"
    
    echo "📢 $committee 招集通知を作成中..."
    
    case "$committee" in
        "技術委員会"|"technical")
            local members=("Iris" "Hermes")
            ;;
        "品質委員会"|"quality"|"qa")
            local members=("Thoth" "Minerva")
            ;;
        "UX委員会"|"ux")
            local members=("Iris" "Minerva")
            ;;
        *)
            echo "❌ 未知の委員会: $committee"
            return 1
            ;;
    esac
    
    echo "📨 通知対象メンバー: ${members[@]}"
    echo ""
    echo "=== 送信推奨メッセージ ==="
    
    for member in "${members[@]}"; do
        echo "🔹 $member への通知:"
        echo "[$committee] $chair 委員長より招集通知"
        echo "議題: $agenda"
        echo "委員会会議に参加し、専門知識を提供してください。"
        echo "48時間以内に意見表明をお願いします。"
        echo ""
    done
}

# 委員会状況の分析
analyze_committee_status() {
    echo "📊 委員会活動状況分析..."
    
    local committees=("技術委員会:Hephaestus" "品質委員会:Athena" "UX委員会:Aphrodite")
    
    for committee_info in "${committees[@]}"; do
        IFS=':' read -r committee chair <<< "$committee_info"
        
        echo "🏛️ $committee ($chair 委員長):"
        
        # 委員長の最終活動確認
        local chair_status_file="$TEAM_DIR/status/${chair}-status.json"
        if [ -f "$chair_status_file" ]; then
            local status=$(jq -r '.status' "$chair_status_file" 2>/dev/null)
            local last_update=$(jq -r '.last_update' "$chair_status_file" 2>/dev/null)
            echo "   委員長状況: $status (最終更新: $last_update)"
        else
            echo "   委員長状況: ❌ システム未起動"
        fi
        
        # 招集状況確認
        local recent_time=$(date -d "6 hours ago" -u +"%Y-%m-%dT%H:%M:%S.000Z")
        local meeting_activity=$(jq --arg recent "$recent_time" --arg chair "$chair" '[.messages[] | select(.timestamp > $recent and .from == $chair and (.subject | contains("委員会") or contains("招集")))] | length' "$TEAM_DIR/messages.json" 2>/dev/null)
        
        if [ "$meeting_activity" -gt 0 ]; then
            echo "   📅 過去6時間で招集活動あり ($meeting_activity 件)"
        else
            echo "   ⚠️ 招集活動なし - 対応が必要"
        fi
        echo ""
    done
}

# 委員会活動推進アクション
promote_committee_action() {
    echo "🚀 委員会活動推進アクション..."
    
    echo ""
    echo "=== 推奨アクション ==="
    echo ""
    echo "📋 各委員長への推進メッセージ:"
    echo ""
    
    echo "🔹 Hephaestus (技術委員会委員長) への指示:"
    echo "技術委員会を即座に招集してください。"
    echo "議題: 音声アップロード機能の技術仕様決定"
    echo "メンバー: Iris、Hermes"
    echo "期限: 24時間以内に技術方針決定"
    echo ""
    
    echo "🔹 Athena (品質委員会委員長) への指示:"
    echo "品質委員会を即座に招集してください。"
    echo "議題: 音声機能のテスト戦略策定"
    echo "メンバー: Thoth、Minerva"
    echo "期限: 24時間以内にテスト計画作成"
    echo ""
    
    echo "🔹 Aphrodite (UX委員会委員長) への指示:"
    echo "UX委員会を即座に招集してください。"
    echo "議題: 音声UIの改善とデザインシステム"
    echo "メンバー: Iris、Minerva"
    echo "期限: 24時間以内にUX改善案作成"
    echo ""
}

# 会議議事録テンプレート生成
generate_meeting_template() {
    local committee="$1"
    local chair="$2"
    
    mkdir -p "$MEETINGS_DIR/$committee"
    
    local template_file="$MEETINGS_DIR/$committee/meeting-template.md"
    
    cat > "$template_file" << EOF
# $committee 会議議事録

## 会議情報
- **日時**: $(date "+%Y-%m-%d %H:%M")
- **委員長**: $chair
- **参加者**: [参加メンバーを記入]

## アジェンダ
1. [議題1]
2. [議題2]
3. [議題3]

## 議論内容

### [議題1について]
- **$chair**: [委員長の意見]
- **[メンバー名]**: [メンバーの意見]

### 決定事項
1. [決定内容1]
2. [決定内容2]

### アクションアイテム
- [ ] [タスク1] (担当: [担当者], 期限: [期限])
- [ ] [タスク2] (担当: [担当者], 期限: [期限])

### 次回会議
- **予定日**: [次回日程]
- **議題**: [次回の主要議題]

---
作成者: $chair
作成日: $(date "+%Y-%m-%d %H:%M")
EOF
    
    echo "📝 会議テンプレートを作成: $template_file"
}

# メイン実行
main() {
    echo "🏛️ 委員会調整システム - Atlas"
    echo "================================="
    echo ""
    
    # 委員会状況分析
    analyze_committee_status
    
    # 招集要請検出
    if detect_meeting_calls; then
        echo ""
        echo "📢 招集通知作成が必要です"
        echo "推奨: create_meeting_notification を使用"
    fi
    
    echo ""
    promote_committee_action
    
    echo ""
    echo "📝 会議テンプレート生成:"
    echo "   .team/scripts/committee-coordination.sh template [委員会名] [委員長名]"
}

# コマンドライン処理
case "$1" in
    "notify")
        create_meeting_notification "$2" "$3" "$4"
        ;;
    "template")
        generate_meeting_template "$2" "$3"
        ;;
    "analyze")
        analyze_committee_status
        ;;
    *)
        main
        ;;
esac