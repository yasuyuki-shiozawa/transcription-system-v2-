#!/bin/bash

# 定期チェックシステム
# 各メンバーが定期的にタスクと指示を確認するシステム

TEAM_DIR="/mnt/c/Users/shioz/Downloads/transcription-system/.team"
MEMBER_NAME="${1:-Unknown}"
CHECK_INTERVAL="${2:-300}" # デフォルト5分間隔

# 拡張機能を読み込み
source "$TEAM_DIR/scripts/enhanced-check-functions.sh" 2>/dev/null || echo "拡張機能ファイルが見つかりません"

echo "🤖 定期チェックシステム開始: $MEMBER_NAME (${CHECK_INTERVAL}秒間隔)"

# 作業状況ファイル
WORK_STATUS_FILE="$TEAM_DIR/status/${MEMBER_NAME}-status.json"
INSTRUCTIONS_FILE="$TEAM_DIR/instructions/pending-instructions.json"

# 作業状況を確認
check_if_working() {
    if [ -f "$WORK_STATUS_FILE" ]; then
        local status=$(jq -r '.status' "$WORK_STATUS_FILE" 2>/dev/null)
        local last_update=$(jq -r '.last_update' "$WORK_STATUS_FILE" 2>/dev/null)
        
        if [ "$status" = "working" ]; then
            echo "作業中 (最終更新: $last_update)"
            return 0  # 作業中
        fi
    fi
    return 1  # 待機中
}

# CPO指示書をチェック
check_cpo_instructions() {
    local cpo_instructions_file="$TEAM_DIR/cpo-instructions/latest-instructions.json"
    
    if [ ! -f "$cpo_instructions_file" ]; then
        return 1  # CPO指示なし
    fi
    
    # 最新のCPO指示を確認
    local latest_instruction=$(jq -r '.instructions[-1]' "$cpo_instructions_file" 2>/dev/null)
    local instruction_time=$(echo "$latest_instruction" | jq -r '.timestamp' 2>/dev/null)
    local my_last_read=$(jq -r ".last_cpo_instruction_read // \"2000-01-01T00:00:00.000Z\"" "$WORK_STATUS_FILE" 2>/dev/null)
    
    if [ "$instruction_time" \> "$my_last_read" ]; then
        echo "📋 新しいCPO指示を発見: $(echo "$latest_instruction" | jq -r '.subject')"
        return 0  # 新しいCPO指示あり
    fi
    return 1  # 新しいCPO指示なし
}

# Atlas指示書をチェック
check_atlas_instructions() {
    local atlas_instructions_file="$TEAM_DIR/atlas-instructions/latest-instructions.json"
    
    if [ ! -f "$atlas_instructions_file" ]; then
        return 1  # Atlas指示なし
    fi
    
    # 最新のAtlas指示を確認
    local latest_instruction=$(jq -r '.instructions[-1]' "$atlas_instructions_file" 2>/dev/null)
    local instruction_time=$(echo "$latest_instruction" | jq -r '.timestamp' 2>/dev/null)
    local my_last_read=$(jq -r ".last_atlas_instruction_read // \"2000-01-01T00:00:00.000Z\"" "$WORK_STATUS_FILE" 2>/dev/null)
    
    if [ "$instruction_time" \> "$my_last_read" ]; then
        echo "📋 新しいAtlas指示を発見: $(echo "$latest_instruction" | jq -r '.subject')"
        return 0  # 新しいAtlas指示あり
    fi
    return 1  # 新しいAtlas指示なし
}

# 新しい指示があるかチェック
check_for_instructions() {
    if [ ! -f "$INSTRUCTIONS_FILE" ]; then
        return 1  # 指示なし
    fi
    
    # 自分宛ての未読指示を確認
    local pending=$(jq -r ".instructions[] | select(.target == \"$MEMBER_NAME\" and .status == \"pending\")" "$INSTRUCTIONS_FILE" 2>/dev/null)
    
    if [ -n "$pending" ] && [ "$pending" != "null" ]; then
        return 0  # 新しい指示あり
    fi
    return 1  # 新しい指示なし
}

# Atlas指示を読んで確認
read_atlas_instruction() {
    local atlas_instructions_file="$TEAM_DIR/atlas-instructions/latest-instructions.json"
    local latest_instruction=$(jq -r '.instructions[-1]' "$atlas_instructions_file" 2>/dev/null)
    
    echo "📋 Atlas指示内容:"
    echo "   件名: $(echo "$latest_instruction" | jq -r '.subject')"
    echo "   内容: $(echo "$latest_instruction" | jq -r '.content')"
    echo "   期限: $(echo "$latest_instruction" | jq -r '.deadline')"
    
    # 読了状況を記録
    local current_time=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    local instruction_time=$(echo "$latest_instruction" | jq -r '.timestamp')
    
    # 作業状況ファイルを更新して読了記録
    local temp_file=$(mktemp)
    jq --arg time "$instruction_time" '.last_atlas_instruction_read = $time' "$WORK_STATUS_FILE" > "$temp_file"
    mv "$temp_file" "$WORK_STATUS_FILE"
    
    echo "   ✅ Atlas指示を確認しました"
}

# 委員会招集指示をチェック
check_committee_召集() {
    local role="$MEMBER_NAME"
    
    case "$role" in
        "Hephaestus")
            check_specific_instruction "召集_技術委員会"
            ;;
        "Athena")
            check_specific_instruction "召集_品質委員会"
            ;;
        "Aphrodite")
            check_specific_instruction "召集_UX委員会"
            ;;
        *)
            check_specific_instruction "委員会参加"
            ;;
    esac
}

check_specific_instruction() {
    local instruction_type="$1"
    
    if [ -f "$INSTRUCTIONS_FILE" ]; then
        local instruction=$(jq -r ".instructions[] | select(.target == \"$MEMBER_NAME\" and .type == \"$instruction_type\" and .status == \"pending\")" "$INSTRUCTIONS_FILE" 2>/dev/null)
        
        if [ -n "$instruction" ] && [ "$instruction" != "null" ]; then
            echo "📋 新しい指示: $instruction_type"
            return 0
        fi
    fi
    return 1
}

# 指示を実行（自律的行動）
execute_instruction() {
    local member="$MEMBER_NAME"
    
    echo "🚀 自律的行動開始: $member"
    
    case "$member" in
        "Hephaestus")
            echo "🔨 技術委員会委員長として行動開始！"
            echo "   ✅ 技術委員会を即座に召集"
            echo "   ✅ 音声アップロード機能の技術仕様を決定"
            echo "   ✅ Iris、Hermesとの技術議論を主導"
            echo "   ✅ API設計書とDB設計を完成"
            echo "   ✅ 他委員会との技術連携を確立"
            echo "   📋 24時間以内に技術方針を確定し議事録提出"
            ;;
        "Athena")
            echo "🛡️ 品質委員会委員長として行動開始！"
            echo "   ✅ 品質委員会を即座に召集"
            echo "   ✅ 音声機能のテスト戦略を策定"
            echo "   ✅ Thoth、Minervaとの品質議論を主導"  
            echo "   ✅ テスト計画書と品質基準を完成"
            echo "   ✅ 技術委員会との品質要件調整"
            echo "   📋 24時間以内にテスト計画を確定し議事録提出"
            ;;
        "Aphrodite")
            echo "🎨 UX委員会委員長として行動開始！"
            echo "   ✅ UX委員会を即座に召集"
            echo "   ✅ 音声UIのデザインシステムを構築"
            echo "   ✅ Iris、Minervaとの UX議論を主導"
            echo "   ✅ ユーザビリティ改善案を完成"
            echo "   ✅ 技術実装との整合性を確保"
            echo "   📋 24時間以内にUX改善計画を確定し議事録提出"
            ;;
        "Iris")
            echo "🌈 フロントエンド実装者として行動開始！"
            echo "   ✅ 技術委員会とUX委員会に積極参加"
            echo "   ✅ 音声アップロード機能の実装経験を共有"
            echo "   ✅ UIコンポーネントの改善提案"
            echo "   ✅ 技術実装可能性の即座フィードバック"
            echo "   📋 委員会議論に専門知識で貢献"
            ;;
        "Hermes")
            echo "⚡ DevOpsエンジニアとして行動開始！"
            echo "   ✅ 技術委員会に参加してインフラ要件提示"
            echo "   ✅ 音声処理のインフラ設計を提案"
            echo "   ✅ CI/CDパイプラインの音声対応を実装"
            echo "   ✅ テストサイトのデプロイ問題を解決"
            echo "   📋 DevOps視点での技術支援を提供"
            ;;
        "Minerva")
            echo "🦉 戦略アドバイザーとして行動開始！"
            echo "   ✅ 全委員会に戦略的助言を提供"
            echo "   ✅ 委員会間の調整とプロセス改善を支援"
            echo "   ✅ KPIダッシュボードの実装提案"
            echo "   ✅ チーム効率化の継続的分析"
            echo "   📋 知恵と戦略で全体成功をサポート"
            ;;
        "Thoth")
            echo "📚 テクニカルライターとして行動開始！"
            echo "   ✅ 品質委員会に参加してドキュメント品質を確保"
            echo "   ✅ 技術委員会の成果を包括的に文書化"
            echo "   ✅ API仕様書とユーザーガイドを作成"
            echo "   ✅ 委員会議事録の品質向上を支援"
            echo "   📋 知識の体系化で全体品質を向上"
            ;;
    esac
    
    # 作業状況を更新
    update_work_status "working"
}

# 作業状況を更新
update_work_status() {
    local status="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    
    mkdir -p "$TEAM_DIR/status"
    
    cat > "$WORK_STATUS_FILE" << EOF
{
  "member": "$MEMBER_NAME",
  "status": "$status",
  "last_update": "$timestamp",
  "last_check": "$timestamp"
}
EOF
}

# メインループ
main_loop() {
    while true; do
        local current_time=$(date "+%H:%M:%S")
        echo "⏰ [$current_time] 定期チェック実行中..."
        
        if check_if_working; then
            echo "   作業中のため、チェックをスキップ"
        else
            echo "   待機中 - 新しい指示をチェック"
            
            # 指示の優先順位チェック
            if check_atlas_instructions; then
                echo "   🎯 Atlas(CEO)指示を確認中..."
                read_atlas_instruction
                execute_instruction
            elif check_cpo_instructions; then
                echo "   📊 CPO指示を確認中..."
                read_cpo_instruction
                execute_instruction
            elif check_committee_info; then
                echo "   🏛️ 委員会情報を確認中..."
                read_committee_info
                execute_instruction
            elif check_shared_announcements; then
                echo "   📢 全社共有情報を確認中..."
                read_shared_announcements
                execute_instruction
            elif check_for_instructions || check_committee_召集; then
                echo "   📨 新しい指示を発見！"
                execute_instruction
            else
                echo "   指示なし - 待機継続"
                update_work_status "idle"
            fi
        fi
        
        echo "   次回チェック: ${CHECK_INTERVAL}秒後"
        echo ""
        sleep "$CHECK_INTERVAL"
    done
}

# 使用方法の表示
show_usage() {
    cat << EOF
使用方法:
  $0 <メンバー名> [チェック間隔秒]

例:
  $0 Hephaestus 300    # Hephaestusが5分間隔でチェック
  $0 Athena 600        # Athenaが10分間隔でチェック
  $0 Iris 180          # Irisが3分間隔でチェック

設定:
  - チェック間隔: ${CHECK_INTERVAL}秒 (デフォルト300秒=5分)
  - 作業状況: $WORK_STATUS_FILE
  - 指示ファイル: $INSTRUCTIONS_FILE
EOF
}

# メイン実行
if [ -z "$MEMBER_NAME" ] || [ "$MEMBER_NAME" = "Unknown" ]; then
    show_usage
    exit 1
fi

echo "🎯 メンバー: $MEMBER_NAME"
echo "⏱️ チェック間隔: ${CHECK_INTERVAL}秒"
echo "📁 チームディレクトリ: $TEAM_DIR"
echo ""

# 初期状態を設定
update_work_status "idle"

# メインループ開始
main_loop