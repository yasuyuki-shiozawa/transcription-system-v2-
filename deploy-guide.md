# Vercel + Supabaseデプロイガイド

このガイドでは、議会議事録管理システムをVercelとSupabaseにデプロイする手順を説明します。

## 事前準備チェックリスト

- [ ] GitHubアカウントを作成済み
- [ ] Supabaseアカウントを作成済み
- [ ] Vercelアカウントを作成済み
- [ ] OpenAI APIキーを取得済み

## ステップ1: GitHubリポジトリの作成

1. GitHubにログイン
2. 右上の「+」→「New repository」をクリック
3. Repository name: `transcription-system`
4. Private/Publicを選択（社内利用ならPrivate推奨）
5. 「Create repository」をクリック

### ローカルからGitHubへアップロード

```bash
# 現在のディレクトリで
cd /mnt/c/Users/shioz/Downloads/transcription-system

# Gitの初期化
git init

# ファイルを追加
git add .

# 初回コミット
git commit -m "Initial commit"

# GitHubリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/transcription-system.git

# プッシュ
git branch -M main
git push -u origin main
```

## ステップ2: Supabaseでデータベース作成

1. https://app.supabase.com でプロジェクトを作成
2. Settings → Database → Connection stringから以下をコピー：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

3. SQLエディタで以下を実行（自動的にPrismaが作成するので不要かもしれません）：
   ```sql
   -- 必要に応じて実行
   ```

## ステップ3: バックエンドをVercelにデプロイ

1. https://vercel.com にログイン
2. 「Add New...」→「Project」
3. GitHubリポジトリから `transcription-system` を選択
4. 「Configure Project」で以下を設定：

   **Root Directory**: `backend`
   
   **Environment Variables**:
   ```
   DATABASE_URL = [Supabaseの接続文字列]
   OPENAI_API_KEY = [あなたのAPIキー]
   NODE_ENV = production
   ```

5. 「Deploy」をクリック
6. デプロイ完了後、URLをコピー（例: https://transcription-backend.vercel.app）

## ステップ4: フロントエンドをVercelにデプロイ

1. Vercelで新しいプロジェクトを作成
2. 同じGitHubリポジトリを選択
3. 「Configure Project」で以下を設定：

   **Root Directory**: `frontend`
   
   **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL = [バックエンドのURL]
   ```

4. 「Deploy」をクリック
5. デプロイ完了！

## ステップ5: データベースの初期化

バックエンドのデプロイが完了したら、以下のコマンドを実行：

```bash
cd backend
npx prisma generate
npx prisma db push
```

## アクセス方法

1. フロントエンドURL（例: https://transcription-system.vercel.app）にアクセス
2. 他のユーザーにURLを共有
3. 完了！

## トラブルシューティング

### よくあるエラー

1. **「Database connection failed」エラー**
   - DATABASE_URLが正しく設定されているか確認
   - Supabaseのダッシュボードでデータベースが起動しているか確認

2. **「CORS error」エラー**
   - バックエンドの環境変数にFRONTEND_URLが設定されているか確認
   - フロントエンドのNEXT_PUBLIC_API_URLが正しいか確認

3. **「Build failed」エラー**
   - package.jsonのスクリプトを確認
   - Node.jsのバージョンを確認

### サポート

問題が解決しない場合は、以下の情報を準備してください：
- エラーメッセージのスクリーンショット
- Vercelのビルドログ
- ブラウザの開発者ツールのコンソールログ

## 次のステップ

- カスタムドメインの設定
- バックアップの設定
- アクセス制御の追加（必要に応じて）