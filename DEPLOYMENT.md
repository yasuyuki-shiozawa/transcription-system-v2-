# 議会議事録作成システム デプロイメントガイド

## 概要
このドキュメントでは、議会議事録作成システムをステージング環境および本番環境にデプロイする手順を説明します。

## 前提条件

- Docker および Docker Compose がインストールされていること
- Git がインストールされていること
- SSL証明書（本番環境の場合）
- 適切なファイアウォール設定（VPN環境内でのアクセス制限）

## 環境構成

### ステージング環境
- 内部テスト用環境
- 基本的なセキュリティ設定
- 開発用データベース

### 本番環境
- VPN最適化有効
- HTTPS対応
- PostgreSQL本番データベース
- 自動バックアップ

## デプロイ手順

### 1. 初回セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/your-org/transcription-system.git
cd transcription-system

# 環境変数ファイルの作成
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production

# 環境変数を編集
vim backend/.env.production
vim frontend/.env.production
```

### 2. SSL証明書の配置（本番環境）

```bash
# SSL証明書ディレクトリの作成
mkdir -p nginx/ssl

# 証明書ファイルをコピー
cp /path/to/cert.pem nginx/ssl/
cp /path/to/key.pem nginx/ssl/
```

### 3. デプロイの実行

#### ステージング環境へのデプロイ
```bash
./deploy.sh staging
```

#### 本番環境へのデプロイ
```bash
./deploy.sh production
```

### 4. デプロイ後の確認

```bash
# ヘルスチェック
curl https://your-domain.com/health

# ログの確認
docker-compose -f docker-compose.production.yml logs -f

# データベース接続確認
docker-compose -f docker-compose.production.yml exec backend npx prisma studio
```

## トラブルシューティング

### データベース接続エラー
```bash
# データベースコンテナのログを確認
docker-compose -f docker-compose.production.yml logs postgres

# データベースに直接接続
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres
```

### ファイルアップロードエラー
```bash
# アップロードディレクトリの権限確認
docker-compose -f docker-compose.production.yml exec backend ls -la /app/uploads

# 権限の修正
docker-compose -f docker-compose.production.yml exec backend chown -R nodejs:nodejs /app/uploads
```

### VPN接続タイムアウト
- Nginx のタイムアウト設定を確認
- バックエンドの `REQUEST_TIMEOUT` 環境変数を確認

## バックアップとリストア

### データベースバックアップ
```bash
# 手動バックアップ
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U postgres transcription_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### リストア
```bash
# バックアップからリストア
cat backup_20240101_120000.sql | docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres transcription_db
```

## セキュリティチェックリスト

- [ ] 環境変数に本番用の値が設定されている
- [ ] JWT_SECRET が強力なランダム文字列になっている
- [ ] データベースパスワードが安全である
- [ ] SSL証明書が有効である
- [ ] ファイアウォールでVPNからのアクセスのみ許可
- [ ] 不要なポートが閉じられている

## モニタリング

### ヘルスチェックURL
- 詳細: `https://your-domain.com/health`
- 簡易: `https://your-domain.com/health/live`

### ログファイル
- Nginx: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- Backend: `/app/logs/app.log`

## ロールバック手順

問題が発生した場合のロールバック：

```bash
# 現在のバージョンを停止
docker-compose -f docker-compose.production.yml down

# 前のバージョンにチェックアウト
git checkout <previous-commit-hash>

# 再デプロイ
./deploy.sh production
```

## サポート

問題が発生した場合は、以下の情報と共に報告してください：

1. エラーログ（`docker-compose logs` の出力）
2. 環境（staging/production）
3. 実行した操作
4. エラーが発生した時刻