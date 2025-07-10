# クラウド版デプロイガイド

## Vercel + Supabaseでの本格運用

### 前準備（30分程度）

1. **GitHubアカウント作成**
   - https://github.com でアカウント作成
   - コードをアップロード

2. **Vercelアカウント作成**
   - https://vercel.com でGitHubアカウントでログイン
   - 無料プランでOK

3. **Supabaseアカウント作成**
   - https://supabase.com で無料アカウント作成
   - 新しいプロジェクトを作成

### デプロイ手順

#### 1. データベースの準備（Supabase）
```sql
-- Supabaseのダッシュボードで実行
-- SQLエディタに貼り付けて実行

-- スキーマは自動的にPrismaから生成されます
```

#### 2. 環境変数の設定

Vercelダッシュボードで以下を設定：
```
DATABASE_URL=postgresql://...（SupabaseのConnection String）
OPENAI_API_KEY=あなたのAPIキー
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

#### 3. デプロイ
```bash
# Vercel CLIを使用
npm i -g vercel
vercel --prod
```

### 完成後
- **URL**: https://your-app.vercel.app
- **管理画面**: https://vercel.com/dashboard
- **データベース管理**: https://app.supabase.com

### 月間コスト
- Vercel: 無料（通常利用なら十分）
- Supabase: 無料（500MBまで）
- 合計: **0円**

### メリット
- ✅ 固定URL
- ✅ 24時間稼働
- ✅ 自動バックアップ
- ✅ どこからでもアクセス可能
- ✅ 無料で始められる

### デメリット
- ❌ 初期設定に30分程度必要
- ❌ GitHubの基本知識が必要