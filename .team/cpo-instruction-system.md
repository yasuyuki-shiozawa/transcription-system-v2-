# CPO指示確認システム

## 📋 概要

MinervaのCPO指示を各メンバーが**必ず確認する**仕組みを構築しました。

## 🔄 確認フロー

### 1. CPO指示発行
Minervaが以下の形式で指示を発行：
```json
{
  "instructions": [{
    "id": "cpo-2025-06-26-001",
    "subject": "音声API実装見送りに関する対応",
    "content": "CEOの決定により音声API実装を見送ります...",
    "priority": "high",
    "targets": ["all"],  // または ["Hephaestus", "Athena"]
    "deadline": "2025-06-27T10:00:00Z",
    "timestamp": "2025-06-26T18:00:00Z"
  }]
}
```

### 2. 自動確認システム
各メンバーの `periodic-check-system.sh` が定期的に：
1. **CPO指示をチェック** (check_cpo_instructions)
2. **新しい指示を発見**したら自動的に内容を表示
3. **確認記録を保存** (acknowledgments.json)

### 3. 確認記録
```json
{
  "acknowledgments": [{
    "member": "Hephaestus",
    "instruction_id": "cpo-2025-06-26-001",
    "acknowledged_at": "2025-06-26T18:05:00Z",
    "status": "confirmed"
  }]
}
```

## 🎯 確実性を高める仕組み

### 優先度チェック
```bash
# periodic-check-system.sh の優先順位
1. セキュリティアラート（最優先）
2. CEO (Atlas) 指示
3. CPO (Minerva) 指示  ← ここで確認
4. Chief Architect指針
5. 委員会情報
6. 全社アナウンス
```

### 強制確認
- **mandatory_read**: true の指示は必ず確認
- 確認するまで毎回のチェックで表示
- 確認記録が残る

### 対象者指定
- `"targets": ["all"]` - 全員必須
- `"targets": ["Hephaestus", "Athena"]` - 特定メンバーのみ

## 📁 ファイル構成

```
.team/
├── cpo-instructions/
│   ├── latest-instructions.json    # 最新のCPO指示
│   └── acknowledgments.json        # 確認記録
├── scripts/
│   ├── periodic-check-system.sh    # 定期チェックシステム
│   └── enhanced-check-functions.sh # 拡張チェック機能
└── status/
    └── [メンバー名]-status.json    # 各メンバーの読了状態
```

## 🚀 使用方法

### CPO (Minerva) が指示を発行
```bash
# latest-instructions.json に新しい指示を追加
```

### 各メンバーが自動確認
```bash
# 各ターミナルで実行中
./periodic-check-system.sh [メンバー名] 300
```

### 確認状況の確認
```bash
# acknowledgments.json で誰が確認したかチェック
cat .team/cpo-instructions/acknowledgments.json | jq .
```

## ✅ メリット

1. **確実な伝達** - 見逃しを防ぐ
2. **記録が残る** - 誰がいつ確認したか明確
3. **自動化** - 手動確認の手間なし
4. **優先度管理** - 重要な指示から順に処理

---

これにより、Minervaの指示が確実に全メンバーに伝わります！