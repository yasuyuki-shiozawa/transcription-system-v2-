# 真の自律的トリガーシステム設計

## 現在の制限事項
- Claude Code インスタンス間の直接通信不可
- ターミナル間でのメッセージ送信不可
- 手動介入が必須

## 解決アプローチ

### 1. ファイルベース通信システム
```bash
# .team/triggers/pending-triggers.json
{
  "triggers": [
    {
      "id": "trigger-001",
      "target": "terminal-3",
      "member": "Hephaestus",
      "message": "技術委員会を召集してください",
      "timestamp": "2025-06-26T13:00:00Z",
      "status": "pending"
    }
  ]
}
```

### 2. ポーリングベースシステム
各メンバーが定期的にトリガーファイルをチェック：
```bash
# 各ターミナルで実行
while true; do
    check_for_triggers.sh
    sleep 60
done
```

### 3. WebSocket/API ベース通信
```javascript
// 中央サーバーによる通信仲介
const triggerServer = {
    sendTrigger(terminal, message) {
        // WebSocket経由で各ターミナルに送信
    },
    
    receiveTrigger(terminal, callback) {
        // 各ターミナルがリスンする
    }
};
```

### 4. 共有状態ファイルシステム
```json
// .team/state/committee-state.json
{
  "committees": {
    "technical": {
      "status": "needs_trigger",
      "last_activity": "2025-06-26T10:00:00Z",
      "trigger_pending": true,
      "chair": "Hephaestus",
      "terminal": "terminal-3"
    }
  }
}
```

## 実装可能な自律システム

### Phase 1: ファイル監視システム
```bash
# .team/scripts/trigger-monitor.sh
#!/bin/bash

TRIGGER_FILE=".team/triggers/auto-triggers.txt"

# 各メンバーが個別に監視
monitor_triggers() {
    local member_name="$1"
    
    while inotifywait -e modify "$TRIGGER_FILE" 2>/dev/null; do
        # 新しいトリガーをチェック
        if grep -q "$member_name" "$TRIGGER_FILE"; then
            echo "🚨 トリガー受信: $(grep "$member_name" "$TRIGGER_FILE")"
            # 自動的にアクション実行
            execute_trigger "$member_name"
        fi
    done
}
```

### Phase 2: 自動応答システム
```bash
# 各ターミナルで自動実行
auto_responder() {
    local role="$1"
    
    case "$role" in
        "Hephaestus")
            if check_trigger_received; then
                echo "技術委員会を召集します！"
                召集_technical_committee
            fi
            ;;
        "Athena")
            if check_trigger_received; then
                echo "品質委員会を召集します！"
                召集_qa_committee
            fi
            ;;
    esac
}
```

## より現実的な解決策

### 1. 通知ダッシュボード
```html
<!-- .team/dashboard/index.html -->
<div id="trigger-dashboard">
    <h2>委員会活動トリガー</h2>
    <div class="pending-triggers">
        <!-- 送信待ちトリガーを表示 -->
    </div>
    <button onclick="sendAllTriggers()">全トリガー送信</button>
</div>
```

### 2. 自動スケジューラー
```bash
# crontab で定期実行
# 毎時0分に委員会チェック
0 * * * * /path/to/check-committees.sh

# 毎日9時に朝の活動開始
0 9 * * * /path/to/morning-trigger.sh
```

### 3. メール/Slack 統合
```bash
# 外部通知システム経由
send_trigger_notification() {
    local member="$1"
    local message="$2"
    
    # Slack/Discord/Email 経由で通知
    curl -X POST -H 'Content-type: application/json' \
         --data '{"text":"'$message'"}' \
         "$SLACK_WEBHOOK_URL"
}
```

## 推奨実装

現時点では **ファイルベース通信 + 手動確認** が最も現実的：

1. **自動検出**: システムが停滞を検出
2. **ファイル更新**: トリガー情報をファイルに記録
3. **通知表示**: ユーザーに送信すべきメッセージを提示
4. **手動送信**: ユーザーが各ターミナルに送信
5. **状態更新**: 送信完了をシステムに記録

これにより半自動化が実現できます。