# 音声ファイルアップロードAPI仕様書

## 概要
音声ファイル（MP3/WAV）をアップロードし、OpenAI Whisper APIを使用して文字起こしを行うAPI。

## エンドポイント

### 音声ファイルアップロード
`POST /api/sessions/{sessionId}/upload/audio/{source}`

#### パラメータ
- **sessionId** (path parameter): セッションID
- **source** (path parameter): `NOTTA` または `MANUS`

#### リクエスト
- Content-Type: `multipart/form-data`
- フィールド:
  - **file**: 音声ファイル（.mp3または.wav、最大100MB）

#### レスポンス

##### 成功時 (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "cuid",
    "sessionId": "session-id",
    "source": "NOTTA",
    "originalFileName": "recording.mp3",
    "uploadedAt": "2025-06-26T12:00:00Z",
    "processedAt": "2025-06-26T12:00:30Z",
    "status": "PROCESSED",
    "fileType": "audio",
    "fileSize": 5242880,
    "audioFormat": "mp3"
  },
  "message": "Audio file uploaded and transcribed successfully"
}
```

##### エラー時
- **400 Bad Request**: ファイルが送信されていない、またはsourceが無効
- **413 Payload Too Large**: ファイルサイズが100MBを超過
- **415 Unsupported Media Type**: サポートされていないファイル形式
- **500 Internal Server Error**: 音声認識エラー

## 処理フロー

1. **ファイル受信**
   - ファイル形式の検証（.mp3/.wav）
   - ファイルサイズの検証（最大100MB）

2. **データベース登録**
   - TranscriptionDataレコードの作成
   - ステータス: `TRANSCRIBING`

3. **音声認識処理**
   - OpenAI Whisper APIを呼び出し
   - 日本語で文字起こし
   - タイムスタンプ付きセグメントを取得

4. **データ保存**
   - Sectionレコードの作成
   - 話者は「話者不明」として保存
   - タイムスタンプ形式: HH:MM:SS

5. **自動マッチング**
   - NOTTAとMANUSのセクションを自動マッチング

6. **クリーンアップ**
   - アップロードされた音声ファイルを削除

## 実装詳細

### 依存関係
- OpenAI SDK v5.7.0
- Multer（ファイルアップロード）
- Prisma（データベース）

### 環境変数
```env
OPENAI_API_KEY=your-openai-api-key-here
MAX_FILE_SIZE=104857600  # 100MB
```

### データベーススキーマ拡張
```prisma
model TranscriptionData {
  // 既存フィールド...
  fileType         String    @default("text")
  fileSize         Int?
  duration         Float?
  audioFormat      String?
  transcriptionId  String?
}
```

### 注意事項
- Whisper APIは話者識別をサポートしていないため、全セクションの話者は「話者不明」となる
- 音声ファイルは処理後に削除される
- 非同期処理の進捗通知は現在未実装（将来的にWebSocketまたはpollingで実装予定）

## フロントエンドとの連携

Irisが実装したフロントエンドコンポーネント：
- `AudioFileUpload.tsx`: 音声ファイルアップロードUI
- ドラッグ&ドロップ対応
- アップロード進捗表示
- 音声プレビュー機能

## テスト方法

```bash
# 音声ファイルのアップロードテスト
curl -X POST \
  http://localhost:3001/api/sessions/{sessionId}/upload/audio/NOTTA \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.mp3"
```

## 今後の拡張予定
- リアルタイム進捗通知（WebSocket）
- 話者識別機能の追加
- バッチ処理対応
- キュー管理システムの導入