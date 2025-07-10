# 仮想チーム開発システム

## 概要
このシステムは、複数のClaude Codeターミナル間で協調作業を行うための情報共有フレームワークです。

## システム構成

### 1. ターミナル登録
新しいターミナルを開いたら、以下の手順で登録します：

```bash
# 新しいターミナルIDを決定（terminal-2, terminal-3など）
# .team/terminals/terminal-{ID}.json を作成
```

### 2. 役割の選択
利用可能な役割：
- **coordinator**: プロジェクト全体の調整
- **frontend_developer**: フロントエンド開発
- **backend_developer**: バックエンド開発
- **devops_engineer**: インフラ・デプロイ
- **qa_tester**: テスト・品質保証

### 3. タスクの管理

#### タスクの取得
```json
// backlog.jsonからタスクを選択
// in-progress.jsonに移動
// terminal-{ID}.jsonのcurrentTasksに追加
```

#### タスクの完了
```json
// completed.jsonに移動
// 完了メッセージをmessages.jsonに投稿
```

### 4. コミュニケーション

#### メッセージの送信
```json
{
  "from": "terminal-2",
  "to": "terminal-1", // または "all"
  "subject": "件名",
  "body": "メッセージ本文"
}
```

#### メッセージの確認
- messages.jsonを定期的にチェック
- 読んだらreadリストに自分のIDを追加

### 5. ポート管理
config.jsonのports.reservedを確認して、使用可能なポートを選択

### 6. 状態同期
- 最低60秒ごとにlastHeartbeatを更新
- 300秒以上更新がない場合はstaleとみなされる

## 実装例

### ターミナル登録スクリプト
```bash
#!/bin/bash
TERMINAL_ID="terminal-2"
ROLE="frontend_developer"

cat > .team/terminals/$TERMINAL_ID.json << EOF
{
  "id": "$TERMINAL_ID",
  "name": "フロントエンド開発担当",
  "role": "$ROLE",
  "status": "active",
  "currentTasks": [],
  "workingDirectory": "$(pwd)",
  "lastActivity": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "lastHeartbeat": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

### タスク取得スクリプト
```bash
# タスクをbacklogからin-progressに移動
# jqコマンドを使用した例
```

## ベストプラクティス

1. **定期的な同期**
   - 作業開始時に最新の状態を確認
   - 大きな変更前後でメッセージを送信

2. **コンフリクト回避**
   - 作業前に他のターミナルの状態を確認
   - ポート使用状況をチェック

3. **ドキュメント化**
   - 重要な決定事項はmessages.jsonに記録
   - タスク完了時は詳細なレポートを作成

## トラブルシューティング

### ポート競合
- config.jsonで予約済みポートを確認
- pm2 listで実行中のプロセスを確認

### 同期エラー
- ファイルのパーミッションを確認
- JSONフォーマットの妥当性をチェック