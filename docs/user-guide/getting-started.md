# はじめに - 5分でスタート

議会議事録作成支援システムへようこそ！このガイドでは、最短5分でシステムを使い始める方法を説明します。

## 🎯 このシステムでできること

- 音声ファイル（MP3/WAV）を自動で文字起こし
- NOTTA/MANUSの文字起こしデータを統合管理
- セクション番号を自動付与して整理
- Word形式で編集可能な議事録を出力

## 🚀 クイックスタート（Docker版）

最も簡単な方法はDockerを使用することです。

### ステップ1: 前提条件の確認

- [ ] Docker Desktopがインストールされている（[ダウンロード](https://www.docker.com/products/docker-desktop/)）
- [ ] OpenAI APIキーを持っている（音声文字起こしを使用する場合）

### ステップ2: システムの起動

```bash
# 1. プロジェクトをダウンロード
git clone https://github.com/yasuyuki-shiozawa/transcription-system.git
cd transcription-system

# 2. 環境変数ファイルを作成（音声文字起こしを使用する場合）
echo "OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx" > backend/.env

# 3. Dockerコンテナを起動
docker-compose up -d

# 4. 起動を確認（約30秒待つ）
docker-compose ps
```

### ステップ3: システムにアクセス

ブラウザで以下のURLを開きます：
- **http://localhost:3000**

## 📱 基本的な使い方

### 1. 新規セッションの作成

![新規セッション作成](../images/create-session.png)

1. トップページの「新規セッション作成」ボタンをクリック
2. セッション名（例：「令和6年第1回定例会」）を入力
3. 「作成」ボタンをクリック

### 2. データのアップロード

#### 音声ファイルの場合（NEW!）

![音声アップロード](../images/audio-upload.png)

1. 「音声ファイルをアップロード」エリアにMP3/WAVファイルをドラッグ&ドロップ
2. アップロード元として「NOTTA」または「MANUS」を選択
3. 自動で文字起こしが開始されます（数分かかります）

#### テキストファイルの場合

1. 「ファイルをアップロード」ボタンをクリック
2. NOTTA/MANUS形式のテキストファイルを選択
3. 自動でセクション番号が付与されます

### 3. データの確認と編集

![セクション編集](../images/section-edit.png)

- アップロードされたデータは自動でセクションに分割されます
- 必要に応じて内容を編集できます
- 複数のデータソースがある場合、自動でマッチングされます

### 4. Word形式でダウンロード

![ダウンロード](../images/download.png)

1. 「Wordファイルをダウンロード」ボタンをクリック
2. 編集可能なWord文書がダウンロードされます
3. Wordで開いて最終的な編集を行います

## 🎬 デモ動画

[システムの使い方動画（3分）](https://example.com/demo)

## ❓ よくある最初の質問

**Q: Docker Desktopのインストールは必須ですか？**  
A: いいえ、ローカル環境での起動も可能です。詳しくは[インストールガイド](./installation.md)を参照してください。

**Q: OpenAI APIキーはどこで取得できますか？**  
A: [OpenAI Platform](https://platform.openai.com/api-keys)でアカウントを作成して取得できます。

**Q: 既存のデータをインポートできますか？**  
A: はい、NOTTA/MANUS形式のテキストファイルをそのままアップロードできます。

## 📖 次のステップ

- [詳細な使い方ガイド](./usage.md) - 各機能の詳しい説明
- [機能一覧](./features.md) - すべての機能の解説
- [トラブルシューティング](./troubleshooting.md) - 問題が発生した場合

## 🆘 サポート

問題が発生した場合：
1. [FAQ](./faq.md)を確認
2. [トラブルシューティング](./troubleshooting.md)を参照
3. [GitHubのIssues](https://github.com/yasuyuki-shiozawa/transcription-system/issues)で質問

---

5分でシステムの基本的な使い方を理解できましたか？さらに詳しい情報は[使い方ガイド](./usage.md)をご覧ください。