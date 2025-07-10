# 🧹 クリーンアップ計画

## 📋 整理対象

### 1. 削除すべきファイル（組織シミュレーション関連）
- `welcome-*.md` (各メンバーの歓迎メッセージ)
- `*-appointment.md` (役職任命書)
- `committee-*.md` (委員会関連)
- `autonomous-*.md` (自律化システム)
- `agent-personality-*.md` (人格分離)
- その他の組織ごっこファイル

### 2. 保持すべきファイル
- 議事録システムに関する技術ドキュメント
- 実装に関するメモ
- バグ修正の記録

## 🎯 実行計画

### Step 1: バックアップ作成
```bash
# 念のため全体をバックアップ
tar -czf team-backup-$(date +%Y%m%d).tar.gz transcription-system/.team/
```

### Step 2: 議事録システム用CLAUDE.md作成
```bash
# プロジェクトルートに新しいCLAUDE.mdを作成
cat > transcription-system/CLAUDE.md << 'EOF'
# 議会議事録作成支援システム専門設定

## あなたの役割
議事録作成システムの開発・保守を担当する専門エンジニアです。

## プロジェクト概要
- 目的: 議会議事録の効率的な作成支援
- 主機能: 音声文字起こし、データ統合、Word出力
- 利用者: 議会事務局職員

## 技術スタック
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- 文字起こし: OpenAI Whisper API
- ファイル処理: Mammoth.js (Word)

## 開発履歴
- v1.0: 基本的な文字起こし機能
- v2.0: NOTTA/MANUS統合
- v3.0: 音声アップロード機能追加

## 重要な仕様
- セクション番号は話者ごとに自動付与
- 同一内容の自動マッチング
- Word出力時は編集可能な形式
EOF
```

### Step 3: 不要ファイルの削除
```bash
# 組織関連ファイルを削除
cd transcription-system/.team

# 削除対象をリストアップ
find . -name "welcome-*.md" -o -name "*appointment*.md" \
       -o -name "committee-*.md" -o -name "autonomous-*.md" \
       -o -name "*personality*.md" -o -name "*atlas*.md" \
       -o -name "*minerva*.md" -o -name "*hephaestus*.md" \
       > files-to-delete.txt

# 確認後、削除実行
cat files-to-delete.txt | xargs rm -f
```

### Step 4: .teamフォルダの再構成
```bash
# 新しい構造
transcription-system/
├── CLAUDE.md              # プロジェクト専用設定
├── .team/                 # 開発メモ用（オプション）
│   └── dev-notes/         # 開発メモ
├── frontend/
├── backend/
└── docs/
```

## 🚀 クリーンアップ後の利点

1. **明確なフォーカス**: 議事録システム開発に集中
2. **高速な応答**: 不要なコンテキストがない
3. **的確な実装**: システム固有の知識に基づく

## ⚠️ 注意事項

- バックアップは必ず取る
- 実装に関するメモは保持
- 今後は組織シミュレーションは避ける