#!/bin/bash

# 拡張チェック機能
# periodic-check-system.sh に追加される新機能

# CPO指示を読んで確認
read_cpo_instruction() {
    local cpo_instructions_file="$TEAM_DIR/cpo-instructions/latest-instructions.json"
    local latest_instruction=$(jq -r '.instructions[-1]' "$cpo_instructions_file" 2>/dev/null)
    
    echo "📊 CPO指示内容:"
    echo "   件名: $(echo "$latest_instruction" | jq -r '.subject')"
    echo "   内容: $(echo "$latest_instruction" | jq -r '.content')"
    echo "   期限: $(echo "$latest_instruction" | jq -r '.deadline')"
    
    # 読了状況を記録
    local instruction_time=$(echo "$latest_instruction" | jq -r '.timestamp')
    local temp_file=$(mktemp)
    jq --arg time "$instruction_time" '.last_cpo_instruction_read = $time' "$WORK_STATUS_FILE" > "$temp_file"
    mv "$temp_file" "$WORK_STATUS_FILE"
    
    echo "   ✅ CPO指示を確認しました"
}

# 委員会情報をチェック
check_committee_info() {
    local my_committee=""
    
    # 自分の所属委員会を判定
    case "$MEMBER_NAME" in
        "Hephaestus"|"Iris"|"Hermes")
            my_committee="technical"
            ;;
        "Athena"|"Thoth"|"Minerva")
            my_committee="qa"
            ;;
        "Aphrodite"|"Iris"|"Minerva")
            my_committee="ux"
            ;;
        *)
            return 1  # 委員会情報なし
            ;;
    esac
    
    local committee_file="$TEAM_DIR/committees/$my_committee/internal-communications.json"
    
    if [ ! -f "$committee_file" ]; then
        return 1  # 委員会ファイルなし
    fi
    
    # 未読メッセージがあるかチェック
    local unread_messages=$(jq --arg member "$MEMBER_NAME" '[.internal_messages[] | select(.read_by | contains([$member]) | not)] | length' "$committee_file" 2>/dev/null)
    
    if [ "$unread_messages" -gt 0 ]; then
        echo "🏛️ 委員会に $unread_messages 件の未読メッセージあり"
        return 0
    fi
    
    # 新しいタスク割り当てがあるかチェック
    local my_tasks=$(jq --arg member "$MEMBER_NAME" '[.task_assignments[] | select(.assigned_to == $member and .status == "pending")] | length' "$committee_file" 2>/dev/null)
    
    if [ "$my_tasks" -gt 0 ]; then
        echo "🏛️ 委員会に $my_tasks 件の新しいタスクあり"
        return 0
    fi
    
    return 1  # 新しい委員会情報なし
}

# 委員会情報を読む
read_committee_info() {
    local my_committee=""
    
    case "$MEMBER_NAME" in
        "Hephaestus"|"Iris"|"Hermes")
            my_committee="technical"
            ;;
        "Athena"|"Thoth"|"Minerva")
            my_committee="qa"
            ;;
        "Aphrodite"|"Iris"|"Minerva")
            my_committee="ux"
            ;;
    esac
    
    local committee_file="$TEAM_DIR/committees/$my_committee/internal-communications.json"
    
    echo "🏛️ 委員会情報:"
    
    # 未読メッセージを表示
    local unread_messages=$(jq --arg member "$MEMBER_NAME" '[.internal_messages[] | select(.read_by | contains([$member]) | not)]' "$committee_file" 2>/dev/null)
    
    if [ "$(echo "$unread_messages" | jq '. | length')" -gt 0 ]; then
        echo "   📨 未読メッセージ:"
        echo "$unread_messages" | jq -r '.[] | "      - \(.subject): \(.content)"'
    fi
    
    # 自分のタスクを表示
    local my_tasks=$(jq --arg member "$MEMBER_NAME" '[.task_assignments[] | select(.assigned_to == $member and .status == "pending")]' "$committee_file" 2>/dev/null)
    
    if [ "$(echo "$my_tasks" | jq '. | length')" -gt 0 ]; then
        echo "   📋 担当タスク:"
        echo "$my_tasks" | jq -r '.[] | "      - \(.title) (期限: \(.deadline))"'
    fi
    
    echo "   ✅ 委員会情報を確認しました"
}

# 全社共有情報をチェック
check_shared_announcements() {
    local announcements_file="$TEAM_DIR/shared/company-announcements.json"
    
    if [ ! -f "$announcements_file" ]; then
        return 1  # 共有情報なし
    fi
    
    # 未読の必読情報があるかチェック
    local mandatory_unread=$(jq --arg member "$MEMBER_NAME" '[.announcements[] | select(.mandatory_read == true and (.read_by | contains([$member]) | not))] | length' "$announcements_file" 2>/dev/null)
    
    if [ "$mandatory_unread" -gt 0 ]; then
        echo "📢 $mandatory_unread 件の未読必読情報あり"
        return 0
    fi
    
    return 1  # 新しい共有情報なし
}

# 全社共有情報を読む
read_shared_announcements() {
    local announcements_file="$TEAM_DIR/shared/company-announcements.json"
    
    echo "📢 全社共有情報:"
    
    # 未読の必読情報を表示
    local mandatory_unread=$(jq --arg member "$MEMBER_NAME" '[.announcements[] | select(.mandatory_read == true and (.read_by | contains([$member]) | not))]' "$announcements_file" 2>/dev/null)
    
    if [ "$(echo "$mandatory_unread" | jq '. | length')" -gt 0 ]; then
        echo "   📢 必読情報:"
        echo "$mandatory_unread" | jq -r '.[] | "      - \(.title): \(.content)"'
        
        # 既読マークを付ける（実装簡略化のため表示のみ）
        echo "   ✅ 必読情報を確認しました"
    fi
}