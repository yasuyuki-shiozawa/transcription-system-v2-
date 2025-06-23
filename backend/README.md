# バックエンドAPI

## セットアップ

```bash
# 依存関係のインストール
npm install

# Prismaクライアントの生成
npm run prisma:generate

# データベースマイグレーション
npm run prisma:migrate

# 開発サーバー起動
npm run dev
```

## APIエンドポイント

### セッション管理

- `GET /api/sessions` - セッション一覧取得
- `POST /api/sessions` - 新規セッション作成
- `GET /api/sessions/:id` - セッション詳細取得
- `PUT /api/sessions/:id` - セッション更新
- `DELETE /api/sessions/:id` - セッション削除
- `GET /api/sessions/:id/sections` - セッションのセクション一覧取得

### リクエスト例

#### セッション作成
```json
POST /api/sessions
{
  "name": "令和6年第1回定例会",
  "date": "2024-03-01T09:00:00Z"
}
```

#### セッション更新
```json
PUT /api/sessions/:id
{
  "name": "令和6年第1回定例会（修正）",
  "status": "IN_PROGRESS"
}
```

## レスポンス形式

すべてのAPIは以下の形式でレスポンスを返します：

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功時のメッセージ"
}
```

エラー時：
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

## テスト

```bash
# APIテストスクリプトの実行
./test-api.sh
```