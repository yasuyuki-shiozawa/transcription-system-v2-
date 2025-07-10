# インターネット経由でシステムにアクセスする方法

## ngrokを使用した一時的な公開（無料・簡単）

### 1. ngrokのインストール
1. https://ngrok.com/ でアカウント作成（無料）
2. ngrokをダウンロード
3. 認証トークンを設定

### 2. システムの公開
```bash
# ポート3003を公開する場合
ngrok http 3003
```

### 3. アクセスURL
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3003
```
このURLを共有すれば、どこからでもアクセス可能

### メリット
- 設定が簡単（5分で完了）
- 無料プランあり
- セキュアな接続（HTTPS）

### デメリット
- URLが毎回変わる（無料プラン）
- 8時間で接続が切れる（無料プラン）
- 同時接続数に制限

## Cloudflare Tunnelを使用（無料・安定）

### 1. Cloudflareアカウント作成
- https://cloudflare.com で無料アカウント作成

### 2. Cloudflare Tunnelの設定
```bash
# cloudflaredのインストール
winget install Cloudflare.cloudflared

# トンネルの作成
cloudflared tunnel create transcription-system

# 設定ファイルの作成
cloudflared tunnel route dns transcription-system transcription.yourdomain.com

# トンネルの起動
cloudflared tunnel run transcription-system
```

### メリット
- 固定URL
- 無料
- 高速で安定

### デメリット
- 初期設定がやや複雑
- ドメインが必要