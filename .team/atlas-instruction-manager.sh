#!/bin/bash

# Atlas指示管理システム
# Atlas指示の作成・更新・配信を管理

TEAM_DIR="/mnt/c/Users/shioz/Downloads/transcription-system/.team"
ATLAS_INSTRUCTIONS_FILE="$TEAM_DIR/atlas-instructions/latest-instructions.json"

# 新しいAtlas指示を作成
create_atlas_instruction() {
    local subject="$1"
    local content="$2"
    local priority="${3:-medium}"
    local deadline_hours="${4:-24}"
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    local deadline=$(date -u -d "+${deadline_hours} hours" +"%Y-%m-%dT%H:%M:%S.000Z")
    local instruction_id="atlas-inst-$(date +%s)"
    
    # ディレクトリが存在しない場合は作成
    mkdir -p "$TEAM_DIR/atlas-instructions"
    
    # 既存の指示ファイルがない場合は初期化
    if [ ! -f "$ATLAS_INSTRUCTIONS_FILE" ]; then
        echo '{"instructions": []}' > "$ATLAS_INSTRUCTIONS_FILE"
    fi
    
    # 新しい指示を追加
    local new_instruction=$(cat << EOF
{
  "id": "$instruction_id",
  "subject": "$subject",
  "content": "$content",
  "priority": "$priority",
  "deadline": "$deadline",
  "timestamp": "$timestamp",
  "created_by": "Atlas"
}
EOF
)
    
    # JSONファイルに追加
    local temp_file=$(mktemp)
    jq --argjson new_inst "$new_instruction" '.instructions += [$new_inst]' "$ATLAS_INSTRUCTIONS_FILE" > "$temp_file"
    mv "$temp_file" "$ATLAS_INSTRUCTIONS_FILE"
    
    echo "✅ Atlas指示を作成しました:"
    echo "   ID: $instruction_id"
    echo "   件名: $subject"
    echo "   期限: $deadline"
    echo "   🚀 全メンバーが次回チェック時に自動で確認します"
}

# Atlas指示の読了状況を確認
check_instruction_read_status() {
    echo "📊 Atlas指示の読了状況:"
    
    local latest_instruction_time=$(jq -r '.instructions[-1].timestamp' "$ATLAS_INSTRUCTIONS_FILE" 2>/dev/null)
    
    for member in "Hephaestus" "Athena" "Aphrodite" "Iris" "Hermes" "Minerva" "Thoth"; do
        local status_file="$TEAM_DIR/status/${member}-status.json"
        if [ -f "$status_file" ]; then
            local last_read=$(jq -r '.last_atlas_instruction_read // "未読"' "$status_file" 2>/dev/null)
            
            if [ "$last_read" = "null" ] || [ "$last_read" = "未読" ]; then
                echo "   $member: ❌ 未読"
            elif [ "$last_read" \< "$latest_instruction_time" ]; then
                echo "   $member: ⏳ 旧版を読了（最新未読）"
            else
                echo "   $member: ✅ 最新指示を読了"
            fi
        else
            echo "   $member: ❌ システム未起動"
        fi
    done
}

# よく使う指示のクイック作成
quick_instruction() {
    local type="$1"
    
    case "$type" in
        "push")
            create_atlas_instruction \
                "委員会活動の推進要請" \
                "各委員会の活動を推進してください。24時間以内に進捗報告をお願いします。" \
                "high" \
                "24"
            ;;
        "urgent")
            create_atlas_instruction \
                "🚨 緊急活動要請" \
                "委員会活動の緊急推進が必要です！停滞は許可されません。今すぐ行動してください！" \
                "urgent" \
                "6"
            ;;
        "coordination")
            create_atlas_instruction \
                "委員会間連携強化" \
                "委員会間の連携を強化してください。相互サポートで品質向上を実現してください。" \
                "medium" \
                "48"
            ;;
        "audio-focus")
            create_atlas_instruction \
                "音声アップロード機能集中開発" \
                "音声アップロード機能の完成に向けて集中してください。期限：72時間以内に完成。" \
                "high" \
                "72"
            ;;
        *)
            echo "使用方法: $0 quick [push|urgent|coordination|audio-focus]"
            return 1
            ;;
    esac
}

# 使用方法の表示
show_usage() {
    cat << EOF
Atlas指示管理システム

使用方法:
  $0 create "件名" "内容" [優先度] [期限時間]
  $0 status                           # 読了状況確認
  $0 quick [push|urgent|coordination|audio-focus]

例:
  $0 create "緊急対応" "今すぐ行動してください" "urgent" "6"
  $0 quick push                       # よく使う推進指示
  $0 status                          # 全員の読了状況確認

優先度: low, medium, high, urgent
期限時間: 時間数（デフォルト24時間）
EOF
}

# メイン実行
case "$1" in
    "create")
        if [ $# -lt 3 ]; then
            echo "エラー: 件名と内容を指定してください"
            show_usage
            exit 1
        fi
        create_atlas_instruction "$2" "$3" "$4" "$5"
        ;;
    "status")
        check_instruction_read_status
        ;;
    "quick")
        quick_instruction "$2"
        ;;
    *)
        show_usage
        ;;
esac