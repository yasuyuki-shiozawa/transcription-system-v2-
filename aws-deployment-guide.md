# AWS デプロイメントガイド

## 既存AWS環境への統合

### 前提条件
- 既存のAWSアカウント
- VPCが構築済み
- （可能なら）RDSインスタンスが存在

### アーキテクチャ

```
[CloudFront] → [ALB] → [EC2 (Docker)]
                           ↓
                        [RDS PostgreSQL]
                           ↓
                        [S3 (ファイル保存)]
```

### 1. EC2インスタンスの準備

```bash
# Amazon Linux 2023での例
sudo yum update -y
sudo yum install -y docker git

# Docker Composeのインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Dockerサービス起動
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user
```

### 2. アプリケーションのデプロイ

```bash
# コードのクローン
git clone https://github.com/your-repo/transcription-system.git
cd transcription-system

# 環境変数の設定
cat > .env.production <<EOF
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/transcription
OPENAI_API_KEY=your-key
NODE_ENV=production
EOF

# Dockerイメージのビルドと起動
docker-compose -f docker-compose.prod.yml up -d
```

### 3. RDSの設定（新規作成の場合）

```sql
-- PostgreSQL on RDS
CREATE DATABASE transcription;

-- Prismaでのマイグレーション
npx prisma migrate deploy
```

### 4. S3バケットの設定

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::transcription-uploads/*"
    }
  ]
}
```

### 5. セキュリティグループ

```
# Webサーバー用
- HTTP (80) from ALB
- HTTPS (443) from ALB
- SSH (22) from your IP

# RDS用
- PostgreSQL (5432) from EC2 Security Group
```

### 6. 自動化スクリプト

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to EC2
        env:
          HOST: ${{ secrets.EC2_HOST }}
          USER: ${{ secrets.EC2_USER }}
          KEY: ${{ secrets.EC2_KEY }}
        run: |
          echo "$KEY" > key.pem
          chmod 600 key.pem
          ssh -i key.pem -o StrictHostKeyChecking=no $USER@$HOST '
            cd transcription-system
            git pull
            docker-compose -f docker-compose.prod.yml up -d --build
          '
```

### 推定コスト（既存環境活用）

```
EC2 追加リソース    : 約1,000円/月
RDS 追加ストレージ  : 約500円/月
S3 + データ転送     : 約300円/月
────────────────────────────────
合計               : 約1,800円/月
```

### メリット
- 既存の監視・バックアップ体制を活用
- 統一されたセキュリティポリシー
- 他システムとの連携が容易

### 注意点
- Dockerの知識が必要
- 初期設定に1-2時間必要
- 定期的なメンテナンスが必要