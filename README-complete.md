# 議会議事録作成システム - 完成版

## システム概要

NOTTAとManusで作成された議会議事録データを統合し、効率的に管理・編集するためのWebアプリケーションです。

### 主な機能

1. **セッション管理**
   - 議会セッションの作成・編集・削除
   - セッション一覧表示
   - ステータス管理（下書き、進行中、完了）

2. **ファイルアップロード**
   - NOTTAデータのアップロード（セクション番号付き）
   - Manusデータのアップロード（セクション番号付き）
   - 自動パース機能

3. **データ比較・統合**
   - NOTTAとManusのデータを左右に並列表示
   - セクション番号による自動マッチング
   - マッチング確信度の表示
   - 同期スクロール

## 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + Prisma
- **フロントエンド**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **データベース**: PostgreSQL
- **ファイル処理**: Multer

## セットアップ手順

### 1. 前提条件

- Node.js 18以上
- PostgreSQL 14以上
- Git

### 2. インストール

```bash
# リポジトリのクローン
git clone https://github.com/yasuyuki-shiozawa/transcription-system.git
cd transcription-system

# バックエンドの依存関係インストール
cd backend
npm install

# フロントエンドの依存関係インストール
cd ../frontend
npm install
```

### 3. データベースセットアップ

```sql
-- PostgreSQLで実行
CREATE USER transcription WITH PASSWORD 'transcription123';
CREATE DATABASE transcription_system OWNER transcription;
```

### 4. 環境変数設定

```bash
# backend/.envファイルを作成
cd backend
cp .env.example .env
# 必要に応じて編集
```

### 5. データベースマイグレーション

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 6. 起動方法

#### ターミナル1（バックエンド）
```bash
cd backend
npm run dev
# http://localhost:3001 で起動
```

#### ターミナル2（フロントエンド）
```bash
cd frontend
npm run dev
# http://localhost:3000 で起動
```

## 使用方法

1. **セッション作成**
   - http://localhost:3000 にアクセス
   - 「新規セッション作成」ボタンをクリック
   - セッション名と開催日を入力

2. **データアップロード**
   - セッション一覧から対象セッションをクリック
   - 「ファイルアップロード」タブを選択
   - NOTTAデータとManusデータをそれぞれアップロード

3. **データ比較**
   - 「データ比較」タブを選択
   - 左右に並列表示されたデータを確認
   - セクション番号で同期された表示

## テストデータ

`samples`ディレクトリにテスト用のサンプルファイルが含まれています：
- `sample_input_sectioned.txt` - NOTTAデータ（セクション番号付き）
- `sample_manus.txt` - Manusデータ（セクション番号付き）

## APIエンドポイント

### セッション管理
- `GET /api/sessions` - セッション一覧
- `POST /api/sessions` - セッション作成
- `GET /api/sessions/:id` - セッション詳細
- `PUT /api/sessions/:id` - セッション更新
- `DELETE /api/sessions/:id` - セッション削除

### ファイルアップロード
- `POST /api/sessions/:id/upload/notta` - NOTTAデータアップロード
- `POST /api/sessions/:id/upload/manus` - Manusデータアップロード
- `GET /api/sessions/:id/upload/transcriptions` - アップロードデータ取得
- `GET /api/sessions/:id/upload/mappings` - マッピング情報取得

## プロジェクト構造

```
transcription-system/
├── backend/                 # バックエンドAPI
│   ├── src/
│   │   ├── controllers/    # コントローラー
│   │   ├── services/       # ビジネスロジック
│   │   ├── routes/         # ルーティング
│   │   ├── middlewares/    # ミドルウェア
│   │   └── utils/          # ユーティリティ
│   └── prisma/            # データベーススキーマ
├── frontend/              # フロントエンド
│   └── app/              # Next.js App Router
│       ├── page.tsx      # ホーム画面
│       └── sessions/
│           └── [id]/
│               └── page.tsx  # セッション詳細画面
├── docs/                  # ドキュメント
└── samples/              # サンプルファイル
```

## トラブルシューティング

### PostgreSQL接続エラー
- DATABASE_URLが正しく設定されているか確認
- PostgreSQLサービスが起動しているか確認
- ユーザーとデータベースが作成されているか確認

### ファイルアップロードエラー
- アップロードディレクトリの権限を確認
- ファイルサイズが50MB以下か確認
- ファイル形式が.txtか確認

## 今後の拡張予定

- 録音データの再生機能（第4フェーズ）
- 編集機能の強化（第5フェーズ）
- タイムスタンプ編集機能（第7フェーズ）
- 最終整形機能（第8フェーズ）

## ライセンス

ISC License