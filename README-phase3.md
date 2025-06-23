# 第3フェーズ実装 - 開発環境セットアップガイド

## システム構成

- **バックエンド**: Express + TypeScript + Prisma (ポート: 3001)
- **フロントエンド**: Next.js + TypeScript + Tailwind CSS (ポート: 3000)
- **データベース**: PostgreSQL

## 起動方法

### 方法1: ローカル環境での起動

#### 1. PostgreSQLのセットアップ
```sql
-- PostgreSQLにログイン後、以下を実行
CREATE USER transcription WITH PASSWORD 'transcription123';
CREATE DATABASE transcription_system OWNER transcription;
```

#### 2. バックエンドの起動
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

#### 3. フロントエンドの起動（別ターミナル）
```bash
cd frontend
npm install
npm run dev
```

### 方法2: Docker環境での起動（Windows側で実行）

```bash
cd C:\Users\shioz\Downloads\transcription-system
docker-compose up -d
```

## アクセスURL

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:3001
- APIドキュメント: http://localhost:3001/api
- ヘルスチェック: http://localhost:3001/health

## 現在の実装状況

### ✅ 完了
- プロジェクト基本構造
- Express + TypeScript環境
- Next.js + TypeScript環境
- Prismaデータベーススキーマ
- Docker環境設定

### 🚧 次の実装予定
1. セッション管理API
2. ファイルアップロードAPI
3. データパースとセクション抽出
4. フロントエンドUI実装

## トラブルシューティング

### PostgreSQL接続エラー
- DATABASE_URLが正しく設定されているか確認
- PostgreSQLサービスが起動しているか確認

### ポート競合
- 3000, 3001ポートが他のプロセスで使用されていないか確認
- 必要に応じて.envファイルでポート番号を変更