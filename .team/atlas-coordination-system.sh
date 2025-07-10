#!/bin/bash

# Atlas 自律的コーディネーションシステム
# Atlasが定期的にチーム状況を監視し、必要に応じて調整を行う

TEAM_DIR="/mnt/c/Users/shioz/Downloads/transcription-system/.team"
CHECK_INTERVAL="${1:-120}" # デフォルト2分間隔（迅速な報告キャッチ）
ATLAS_STATUS_FILE="$TEAM_DIR/status/Atlas-status.json"

echo "👑 Atlas 自律的コーディネーションシステム開始 (${CHECK_INTERVAL}秒間隔)"

# Atlas の作業状況を確認
check_atlas_workload() {
    if [ -f "$ATLAS_STATUS_FILE" ]; then
        local status=$(jq -r '.status' "$ATLAS_STATUS_FILE" 2>/dev/null)
        if [ "$status" = "coordinating" ]; then
            return 0  # 調整作業中
        fi
    fi
    return 1  # 待機中
}

# チーム全体の状況を分析
analyze_team_status() {
    echo "📊 チーム状況分析中..."
    
    local active_members=0
    local total_members=7
    
    for member in "Hephaestus" "Athena" "Aphrodite" "Iris" "Hermes" "Minerva" "Thoth"; do
        local status_file="$TEAM_DIR/status/${member}-status.json"
        if [ -f "$status_file" ]; then
            local status=$(jq -r '.status' "$status_file" 2>/dev/null)
            local last_check=$(jq -r '.last_check' "$status_file" 2>/dev/null)
            
            echo "   $member: $status (最終チェック: $last_check)"
            
            if [ "$status" = "working" ] || [ "$status" = "idle" ]; then
                ((active_members++))
            fi
        else
            echo "   $member: システム未起動"
        fi
    done
    
    echo "   アクティブメンバー: $active_members/$total_members"
    
    if [ $active_members -lt 5 ]; then
        return 1  # 要注意状況
    fi
    return 0  # 正常
}

# 委員会進捗を確認
check_committee_progress() {
    echo "🏛️ 委員会進捗確認..."
    
    local committees=("技術委員会:Hephaestus" "品質委員会:Athena" "UX委員会:Aphrodite")
    local completed_committees=0
    
    for committee_info in "${committees[@]}"; do
        IFS=':' read -r committee chair <<< "$committee_info"
        
        # 委員長の状況確認
        local chair_status_file="$TEAM_DIR/status/${chair}-status.json"
        if [ -f "$chair_status_file" ]; then
            local status=$(jq -r '.status' "$chair_status_file" 2>/dev/null)
            echo "   $committee ($chair): $status"
            
            if [ "$status" = "working" ]; then
                ((completed_committees++))
            fi
        else
            echo "   $committee ($chair): 未起動"
        fi
    done
    
    echo "   活動中委員会: $completed_committees/3"
    
    if [ $completed_committees -eq 0 ]; then
        return 2  # 緊急事態
    elif [ $completed_committees -lt 3 ]; then
        return 1  # 要注意
    fi
    return 0  # 順調
}

# 委員会からの新しい報告をチェック
check_committee_reports() {
    echo "📋 委員会報告チェック..."
    
    local new_reports=0
    local recent_time=$(date -d "5 minutes ago" -u +"%Y-%m-%dT%H:%M:%S.000Z")
    
    # 過去5分の委員会関連メッセージを確認
    local recent_messages=$(jq --arg recent "$recent_time" '[.messages[] | select(.timestamp > $recent and (.subject | contains("[TECH]") or contains("[QA]") or contains("[UX]")))] | length' "$TEAM_DIR/messages.json" 2>/dev/null || echo 0)
    
    echo "   過去5分の委員会報告: $recent_messages件"
    
    if [ $recent_messages -gt 0 ]; then
        echo "   🆕 新しい委員会報告を検出！"
        return 0  # 新しい報告あり
    fi
    return 1  # 新しい報告なし
}

# 未読メッセージをチェック
check_pending_messages() {
    local unread_count=$(jq '[.messages[] | select(.read | length == 0)] | length' "$TEAM_DIR/messages.json" 2>/dev/null || echo 0)
    
    echo "📨 未読メッセージ: $unread_count件"
    
    if [ $unread_count -gt 5 ]; then
        return 1  # 要注意（閾値を下げた）
    fi
    return 0  # 正常
}

# 委員会への迅速な指示生成
generate_quick_response() {
    local committee_type="$1"
    
    echo "⚡ 迅速指示生成: $committee_type"
    
    case "$committee_type" in
        "technical")
            echo "   技術委員会への指示: API仕様確定→実装開始→テスト連携"
            ;;
        "quality") 
            echo "   品質委員会への指示: テスト計画策定→実装支援→品質基準確定"
            ;;
        "ux")
            echo "   UX委員会への指示: デザイン改善→実装連携→ユーザビリティ確認"
            ;;
    esac
}

# 自動調整アクション
execute_coordination_action() {
    local action_type="$1"
    
    echo "🚀 自動調整アクション実行: $action_type"
    
    case "$action_type" in
        "activate_dormant_members")
            echo "   💤 休眠メンバーの起動促進"
            echo "   推奨: 未起動メンバーのターミナルでシステム開始"
            ;;
        "escalate_committee_issues")
            echo "   ⚠️ 委員会問題のエスカレーション"
            echo "   推奨: 委員長への直接確認"
            ;;
        "message_cleanup")
            echo "   📨 メッセージ整理とフォローアップ"
            echo "   推奨: 重要メッセージの再送信"
            ;;
        "emergency_intervention")
            echo "   🚨 緊急介入が必要"
            echo "   推奨: 手動でチーム状況確認"
            ;;
    esac
}

# Atlas状況を更新
update_atlas_status() {
    local status="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    
    mkdir -p "$TEAM_DIR/status"
    
    cat > "$ATLAS_STATUS_FILE" << EOF
{
  "member": "Atlas",
  "status": "$status",
  "last_update": "$timestamp",
  "last_coordination_check": "$timestamp"
}
EOF
}

# 定期レポート生成
generate_status_report() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    echo ""
    echo "📋 === Atlas 定期レポート ($timestamp) ==="
    
    analyze_team_status
    echo ""
    
    check_committee_progress
    local committee_status=$?
    echo ""
    
    check_committee_reports
    local new_reports=$?
    echo ""
    
    check_pending_messages
    echo ""
    
    # 新しい報告への迅速対応
    if [ $new_reports -eq 0 ]; then
        echo "⚡ 新しい委員会報告に対する迅速対応が必要"
        generate_quick_response "all"
    fi
    
    # 総合判定
    if [ $committee_status -eq 2 ]; then
        echo "🚨 状況: 緊急事態 - 委員会活動が停止"
        execute_coordination_action "emergency_intervention"
    elif [ $committee_status -eq 1 ]; then
        echo "⚠️ 状況: 要注意 - 一部委員会に問題"
        execute_coordination_action "escalate_committee_issues"
    else
        echo "✅ 状況: 正常 - チーム活動順調"
    fi
    
    echo "=========================================="
    echo ""
}

# メインループ
main_coordination_loop() {
    while true; do
        local current_time=$(date "+%H:%M:%S")
        echo "👑 [$current_time] Atlas 定期コーディネーション実行中..."
        
        if check_atlas_workload; then
            echo "   調整作業中のため、詳細チェックをスキップ"
        else
            echo "   待機中 - チーム状況を分析"
            update_atlas_status "monitoring"
            generate_status_report
            update_atlas_status "idle"
        fi
        
        echo "   次回チェック: ${CHECK_INTERVAL}秒後"
        echo ""
        sleep "$CHECK_INTERVAL"
    done
}

# 使用方法
show_usage() {
    cat << EOF
Atlas 自律的コーディネーションシステム

使用方法:
  $0 [チェック間隔秒]

例:
  $0 600    # 10分間隔でチーム監視
  $0 300    # 5分間隔で集中監視
  
機能:
  - チームメンバー活動状況の監視
  - 委員会進捗の追跡
  - 未読メッセージの管理
  - 自動調整アクションの提案
EOF
}

# メイン実行
echo "👑 Atlas - チーム全体のコーディネーター"
echo "⏱️ チェック間隔: ${CHECK_INTERVAL}秒"
echo "📁 チームディレクトリ: $TEAM_DIR"
echo ""

# 初期状態を設定
update_atlas_status "idle"

# メインループ開始
main_coordination_loop