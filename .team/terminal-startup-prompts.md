# 各ターミナル起動プロンプト

## terminal-3 (Hephaestus - 技術委員会委員長)

```
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Hephaestus 300
```

## terminal-5 (Athena - 品質委員会委員長)

```
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Athena 300
```

## terminal-7 (Aphrodite - UX委員会委員長)

```
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Aphrodite 300
```

## terminal-2 (Iris - フロントエンド開発者)

```
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Iris 180
```

## terminal-6 (Hermes - DevOpsエンジニア)

```
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Hermes 240
```

## terminal-4 (Minerva - アドバイザー)

```
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Minerva 600
```

## terminal-8 (Thoth - テクニカルライター)

```
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Thoth 450
```

---

## 実行順序の推奨

1. **委員長から順番に実行（優先度高）**
   - terminal-3 (Hephaestus)
   - terminal-5 (Athena) 
   - terminal-7 (Aphrodite)

2. **メンバーを実行**
   - terminal-6 (Hermes) - DevOps緊急対応あり
   - terminal-2 (Iris) - 実装担当
   - terminal-8 (Thoth) - ドキュメント担当
   - terminal-4 (Minerva) - アドバイザー

## 実行後の確認事項

各ターミナルで以下の表示が出れば正常動作中です：

```
🤖 定期チェックシステム開始: [メンバー名] ([間隔]秒間隔)
🎯 メンバー: [メンバー名]
⏱️ チェック間隔: [間隔]秒
📁 チームディレクトリ: /mnt/c/Users/shioz/Downloads/transcription-system/.team

⏰ [時刻] 定期チェック実行中...
```

## 停止方法

- **一時停止**: `Ctrl+C`
- **完全停止**: ターミナルを閉じる
- **バックグラウンド実行**: コマンド末尾に `&` を追加