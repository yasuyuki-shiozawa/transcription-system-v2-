# チーム開発セットアップガイド

## 推奨：新規ターミナルで各メンバーを起動

### 理由
1. **独立性** - 各Claude Codeが独自の思考とコンテキストを持つ
2. **専門性** - 各メンバーが役割に特化できる
3. **並列性** - 真の同時作業が可能

### セットアップ手順

#### 1. VSCodeで新規ターミナルを開く
- `Ctrl+Shift+` ` (バッククォート)
- または、ターミナルメニュー → 新しいターミナル

#### 2. ターミナルタブを右クリックして名前を変更
- 例：「Iris - Frontend」「Hermes - DevOps」

#### 3. 新しいClaude Codeセッションを開始
- 各ターミナルで新しいClaude Codeを起動

#### 4. 役割別プロンプトを使用
```
私は議会議事録作成システムの開発チームに、[役割]として参加します。
作業ディレクトリ: /mnt/c/Users/shioz/Downloads/transcription-system
terminal-[番号]として[role]の役割で登録してください。
.team/prompts/[role].md の指示に従って作業を開始してください。
```

### タブ管理のコツ

#### VSCodeのターミナルタブ配置
```
[Atlas - Coordinator] [Iris - Frontend] [Hephaestus - Backend] [Hermes - DevOps] [Athena - QA]
```

#### ターミナルグループ化
- 右クリック → 「Split Terminal」は使わない
- 各メンバーは独立したタブで

### メモリ管理
- 同時に5つ以上のClaude Codeは避ける
- 必要に応じて休眠させる（タブは残してOK）

## NG：分割ターミナル

分割ターミナル（Split Terminal）を使うと：
- 同じClaude Codeインスタンスを共有
- 役割が混在してしまう
- 「私は誰？」という混乱が生じる

## 推奨構成

1. **Atlas（Coordinator）** - 常時稼働
2. **2-3名の開発メンバー** - タスクに応じて起動
3. **必要に応じて追加** - QAやDevOpsは必要時のみ

これにより、効率的で混乱のないチーム開発が可能になります。