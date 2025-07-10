# メンバー個別起動コマンド

## 各ターミナルで実行すべきコマンド

### terminal-3 (Hephaestus - 技術委員会委員長)
```bash
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Hephaestus 300
```

### terminal-5 (Athena - 品質委員会委員長)  
```bash
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Athena 300
```

### terminal-7 (Aphrodite - UX委員会委員長)
```bash
cd /mnt/c/Users/shioz/Downloads/transcription-system  
.team/scripts/periodic-check-system.sh Aphrodite 300
```

### terminal-2 (Iris - フロントエンド開発者)
```bash
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Iris 180
```

### terminal-6 (Hermes - DevOpsエンジニア)
```bash
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Hermes 240
```

### terminal-4 (Minerva - アドバイザー)
```bash
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Minerva 600
```

### terminal-8 (Thoth - テクニカルライター)
```bash
cd /mnt/c/Users/shioz/Downloads/transcription-system
.team/scripts/periodic-check-system.sh Thoth 450
```

## システムの動作

1. **定期チェック**: 各メンバーが指定間隔で指示を確認
2. **作業状況管理**: 作業中は自動チェックをスキップ  
3. **指示実行**: 新しい指示があれば自動的に行動開始
4. **状況更新**: 作業状況をファイルに記録

## チェック間隔の設定理由

- **委員長 (300秒=5分)**: 迅速な意思決定が必要
- **Iris (180秒=3分)**: 実装作業で頻繁な確認が有効
- **Hermes (240秒=4分)**: DevOps緊急対応考慮
- **Minerva (600秒=10分)**: アドバイザーは長期視点
- **Thoth (450秒=7.5分)**: ドキュメント作業は中間ペース

## 起動後の動作例

```
🤖 定期チェックシステム開始: Hephaestus (300秒間隔)
🎯 メンバー: Hephaestus
⏱️ チェック間隔: 300秒
📁 チームディレクトリ: /mnt/c/Users/shioz/Downloads/transcription-system/.team

⏰ [13:05:00] 定期チェック実行中...
   待機中 - 新しい指示をチェック
   📨 新しい指示を発見！
🚀 指示を実行中: Hephaestus
🔨 技術委員会を召集します！
   - Iris、Hermesに連絡
   - 技術仕様の議論開始
   - 24時間以内に議事録提出
   次回チェック: 300秒後
```

これで各メンバーが自律的に指示を確認し、行動を開始します。