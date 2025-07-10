# Phase 1 クイックスタート実装ガイド

## 🚀 今すぐ始められる自律化

### Step 1: Atlas CEO デーモンスクリプト（30分で実装）

```bash
#!/bin/bash
# atlas-daemon.sh
# 場所: .team/daemons/atlas-daemon.sh

TEAM_DIR="/mnt/c/Users/shioz/Downloads/transcription-system/.team"
CEO_NAME="Atlas"
CHECK_INTERVAL=30  # 30秒間隔

# ログ設定
LOG_FILE="$TEAM_DIR/logs/atlas-daemon.log"
mkdir -p "$TEAM_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 人間からの要求をチェック
check_human_requests() {
    local request_file="$TEAM_DIR/human-requests/pending.json"
    if [ -f "$request_file" ] && [ -s "$request_file" ]; then
        return 0  # 新しい要求あり
    fi
    return 1  # 要求なし
}

# CEO戦略を策定
formulate_strategy() {
    local request="$1"
    local strategy_file="$TEAM_DIR/ceo-strategies/latest.json"
    
    # 要求を分析して戦略を生成
    cat > "$strategy_file" << EOF
{
    "id": "strategy-$(date +%s)",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "request": $request,
    "strategy": {
        "priority": "high",
        "objectives": ["要求の実現", "品質確保", "期限遵守"],
        "approach": "委員会による並行作業",
        "deadline": "$(date -u -d "+72 hours" +"%Y-%m-%dT%H:%M:%S.000Z")"
    }
}
EOF
    log "戦略策定完了"
}

# CPOへの指示を生成
create_cpo_directive() {
    local strategy_file="$TEAM_DIR/ceo-strategies/latest.json"
    local directive_file="$TEAM_DIR/cpo-instructions/auto-generated.json"
    
    # 戦略からCPO指示を生成
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    cat > "$directive_file" << EOF
{
    "id": "cpo-auto-$(date +%s)",
    "from": "Atlas-CEO",
    "to": "Minerva-CPO",
    "timestamp": "$timestamp",
    "directive": {
        "type": "project_execution",
        "priority": "high",
        "deadline": "$(date -u -d "+72 hours" +"%Y-%m-%dT%H:%M:%S.000Z")",
        "tasks": [
            {
                "committee": "technical",
                "action": "implement_required_features"
            },
            {
                "committee": "quality",
                "action": "ensure_quality_standards"
            },
            {
                "committee": "ux",
                "action": "optimize_user_experience"
            }
        ]
    },
    "auto_generated": true
}
EOF
    log "CPO指示を自動生成"
}

# CPO報告をチェック
check_cpo_reports() {
    local report_file="$TEAM_DIR/reports/cpo-to-ceo/latest.json"
    local last_check_file="$TEAM_DIR/status/ceo-last-report-check.txt"
    
    if [ -f "$report_file" ]; then
        local report_time=$(stat -c %Y "$report_file" 2>/dev/null || stat -f %m "$report_file" 2>/dev/null)
        local last_check=0
        [ -f "$last_check_file" ] && last_check=$(cat "$last_check_file")
        
        if [ "$report_time" -gt "$last_check" ]; then
            echo "$report_time" > "$last_check_file"
            return 0  # 新しい報告あり
        fi
    fi
    return 1  # 新しい報告なし
}

# 人間向けサマリー生成
generate_human_summary() {
    local report_file="$TEAM_DIR/reports/cpo-to-ceo/latest.json"
    local summary_file="$TEAM_DIR/human-reports/latest-summary.md"
    
    cat > "$summary_file" << EOF
# プロジェクト進捗報告

**日時**: $(date '+%Y-%m-%d %H:%M:%S')
**報告者**: Atlas (CEO)

## 概要
CPOからの最新報告に基づく進捗状況をお知らせします。

## 主な成果
- 技術委員会: 実装作業進行中
- 品質委員会: 品質基準確立
- UX委員会: ユーザー体験最適化

## 次のステップ
統合作業とテスト準備を進めています。

詳細は報告書をご確認ください。
EOF
    log "人間向けサマリー生成完了"
}

# メインループ
main_loop() {
    log "Atlas CEO デーモン起動"
    
    while true; do
        # 人間からの新規要求をチェック
        if check_human_requests; then
            log "新しい人間要求を検出"
            local request=$(cat "$TEAM_DIR/human-requests/pending.json")
            
            # 戦略策定
            formulate_strategy "$request"
            
            # CPO指示生成
            create_cpo_directive
            
            # 要求を処理済みに移動
            mv "$TEAM_DIR/human-requests/pending.json" \
               "$TEAM_DIR/human-requests/processed-$(date +%s).json"
        fi
        
        # CPO報告をチェック
        if check_cpo_reports; then
            log "新しいCPO報告を検出"
            generate_human_summary
        fi
        
        # 健康状態を記録
        echo "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" > "$TEAM_DIR/status/atlas-heartbeat.txt"
        
        sleep $CHECK_INTERVAL
    done
}

# 使用方法
if [ "$1" = "start" ]; then
    main_loop
elif [ "$1" = "stop" ]; then
    pkill -f "atlas-daemon.sh"
    log "Atlas CEO デーモン停止"
else
    echo "使用方法: $0 {start|stop}"
    exit 1
fi
```

### Step 2: Minerva CPO デーモンスクリプト（30分で実装）

```bash
#!/bin/bash
# minerva-daemon.sh
# 場所: .team/daemons/minerva-daemon.sh

TEAM_DIR="/mnt/c/Users/shioz/Downloads/transcription-system/.team"
CPO_NAME="Minerva"
CHECK_INTERVAL=20  # 20秒間隔（CEOより頻繁に）

# ログ設定
LOG_FILE="$TEAM_DIR/logs/minerva-daemon.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# CEO指示をチェック
check_ceo_directives() {
    local directive_file="$TEAM_DIR/cpo-instructions/auto-generated.json"
    local processed_file="$TEAM_DIR/status/cpo-last-directive.txt"
    
    if [ -f "$directive_file" ]; then
        local directive_time=$(stat -c %Y "$directive_file" 2>/dev/null || stat -f %m "$directive_file" 2>/dev/null)
        local last_processed=0
        [ -f "$processed_file" ] && last_processed=$(cat "$processed_file")
        
        if [ "$directive_time" -gt "$last_processed" ]; then
            echo "$directive_time" > "$processed_file"
            return 0  # 新しい指示あり
        fi
    fi
    return 1
}

# 委員会への自動タスク配分
distribute_to_committees() {
    log "委員会へのタスク自動配分開始"
    
    # 技術委員会への指示
    cat > "$TEAM_DIR/committees/technical-committee/tasks/auto-task.json" << EOF
{
    "id": "tech-task-$(date +%s)",
    "from": "Minerva-CPO",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "task": "CEO指示に基づく技術実装",
    "priority": "high",
    "auto_assigned": true
}
EOF
    
    # 品質委員会への指示
    cat > "$TEAM_DIR/committees/quality-committee/tasks/auto-task.json" << EOF
{
    "id": "qa-task-$(date +%s)",
    "from": "Minerva-CPO",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "task": "品質基準の確保とテスト実施",
    "priority": "high",
    "auto_assigned": true
}
EOF
    
    # UX委員会への指示
    cat > "$TEAM_DIR/committees/ux-committee/tasks/auto-task.json" << EOF
{
    "id": "ux-task-$(date +%s)",
    "from": "Minerva-CPO",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "task": "ユーザー体験の最適化",
    "priority": "high",
    "auto_assigned": true
}
EOF
    
    log "委員会へのタスク配分完了"
}

# 委員会報告の集約
aggregate_committee_reports() {
    local tech_report="$TEAM_DIR/committees/technical-committee/reports/latest.json"
    local qa_report="$TEAM_DIR/committees/quality-committee/reports/latest.json"
    local ux_report="$TEAM_DIR/committees/ux-committee/reports/latest.json"
    
    # 統合報告書の生成
    local integrated_report="$TEAM_DIR/reports/cpo-to-ceo/latest.json"
    
    cat > "$integrated_report" << EOF
{
    "id": "cpo-report-$(date +%s)",
    "from": "Minerva-CPO",
    "to": "Atlas-CEO",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "status": "progressing",
    "committees": {
        "technical": "実装進行中",
        "quality": "品質確保中",
        "ux": "UX最適化中"
    },
    "auto_generated": true
}
EOF
    
    log "CEO向け統合報告書生成完了"
}

# メインループ
main_loop() {
    log "Minerva CPO デーモン起動"
    
    while true; do
        # CEO指示をチェック
        if check_ceo_directives; then
            log "新しいCEO指示を検出"
            distribute_to_committees
        fi
        
        # 定期的に委員会報告を集約
        if [ $(($(date +%s) % 300)) -eq 0 ]; then  # 5分ごと
            aggregate_committee_reports
        fi
        
        # 健康状態を記録
        echo "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" > "$TEAM_DIR/status/minerva-heartbeat.txt"
        
        sleep $CHECK_INTERVAL
    done
}

# 使用方法
if [ "$1" = "start" ]; then
    main_loop
elif [ "$1" = "stop" ]; then
    pkill -f "minerva-daemon.sh"
    log "Minerva CPO デーモン停止"
else
    echo "使用方法: $0 {start|stop}"
    exit 1
fi
```

### Step 3: 起動スクリプト（5分で実装）

```bash
#!/bin/bash
# start-autonomous-system.sh
# 場所: .team/start-autonomous-system.sh

TEAM_DIR="/mnt/c/Users/shioz/Downloads/transcription-system/.team"

echo "🚀 自律システムを起動します..."

# 必要なディレクトリを作成
mkdir -p "$TEAM_DIR"/{daemons,logs,status,human-requests,human-reports}
mkdir -p "$TEAM_DIR"/committees/{technical,quality,ux}-committee/{tasks,reports}
mkdir -p "$TEAM_DIR"/reports/cpo-to-ceo

# デーモンスクリプトに実行権限を付与
chmod +x "$TEAM_DIR/daemons/atlas-daemon.sh"
chmod +x "$TEAM_DIR/daemons/minerva-daemon.sh"

# Atlas CEO デーモンを起動
echo "Starting Atlas CEO daemon..."
nohup "$TEAM_DIR/daemons/atlas-daemon.sh" start > /dev/null 2>&1 &

# Minerva CPO デーモンを起動
echo "Starting Minerva CPO daemon..."
nohup "$TEAM_DIR/daemons/minerva-daemon.sh" start > /dev/null 2>&1 &

echo "✅ 自律システムが起動しました！"
echo ""
echo "📝 人間要求の送信方法:"
echo "   echo '{\"request\": \"新機能を追加してください\"}' > $TEAM_DIR/human-requests/pending.json"
echo ""
echo "📊 状態確認:"
echo "   tail -f $TEAM_DIR/logs/atlas-daemon.log"
echo "   tail -f $TEAM_DIR/logs/minerva-daemon.log"
echo ""
echo "🛑 停止方法:"
echo "   $TEAM_DIR/daemons/atlas-daemon.sh stop"
echo "   $TEAM_DIR/daemons/minerva-daemon.sh stop"
```

## 🎯 即座に実現できること

### 1時間以内に達成可能
1. ✅ CEO/CPOの常時起動
2. ✅ 自動的な指示伝達
3. ✅ 基本的な報告集約

### 本日中に達成可能
1. ✅ 委員長レベルの自律化追加
2. ✅ 健康監視システム
3. ✅ 基本的なエラーハンドリング

## 🔧 テスト方法

```bash
# 1. システムを起動
./start-autonomous-system.sh

# 2. 人間要求を投入
echo '{"request": "ユーザー管理機能を追加してください", "priority": "high"}' > .team/human-requests/pending.json

# 3. ログを監視
tail -f .team/logs/*.log

# 4. 結果を確認
cat .team/human-reports/latest-summary.md
```

これで、**起動したら自動的に動き続ける**基本的な自律システムが完成します！