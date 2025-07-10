# 音声アップロード機能API仕様書 v1.0

**作成者**: Thoth（品質委員会）  
**作成日**: 2025-06-26  
**更新日**: 2025-06-26 JST  
**ステータス**: CPO・CEO指示対応版  
**技術仕様**: 技術委員会成果統合（Hermes/Iris実装準拠）  
**品質保証**: Athena品質基準適合  

## 概要

音声ファイル（MP3/WAV）をアップロードし、OpenAI Whisper APIを使用して自動文字起こしを行う機能のAPI仕様です。

## エンドポイント仕様

### 1. 音声ファイルアップロード・文字起こし

```
POST /api/sessions/{sessionId}/upload/audio/{source}
```

#### パラメータ

**パスパラメータ:**
- `sessionId` (string, required): セッションID
- `source` (string, required): 音声データソース
  - `notta`: NOTTA由来の音声
  - `manus`: MANUS由来の音声

**リクエストボディ:**
```
Content-Type: multipart/form-data

audio: File (required)
  - 形式: MP3, WAV
  - 最大サイズ: 100MB
  - エンコーディング: 任意
```

#### レスポンス

**成功時 (200 OK):**
```json
{
  "success": true,
  "data": {
    "transcriptionId": "uuid-v4",
    "status": "processing",
    "estimatedTime": 180,
    "progressUrl": "/api/transcribe/progress/{transcriptionId}"
  }
}
```

**エラー時 (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_FORMAT",
    "message": "対応していないファイル形式です。MP3またはWAVファイルをアップロードしてください。",
    "details": {
      "supportedFormats": ["mp3", "wav"],
      "receivedFormat": "m4a"
    }
  }
}
```

### 2. 文字起こし進捗確認

```
GET /api/transcribe/progress/{transcriptionId}
```

#### レスポンス

**処理中 (200 OK):**
```json
{
  "success": true,
  "data": {
    "transcriptionId": "uuid-v4",
    "status": "processing",
    "progress": 65,
    "estimatedRemainingTime": 45,
    "currentStep": "whisper_api_processing"
  }
}
```

**完了時 (200 OK):**
```json
{
  "success": true,
  "data": {
    "transcriptionId": "uuid-v4",
    "status": "completed",
    "progress": 100,
    "result": {
      "sections": [
        {
          "id": "section-001",
          "speaker": "話者不明",
          "timestamp": "00:00:15",
          "content": "おはようございます。本日の会議を開始いたします。"
        }
      ],
      "totalSections": 42,
      "duration": "00:15:30"
    }
  }
}
```

### 3. WebSocket進捗通知

```
WebSocket: /ws/transcribe-progress/{transcriptionId}
```

**メッセージ形式:**
```json
{
  "type": "progress_update",
  "transcriptionId": "uuid-v4",
  "progress": 30,
  "status": "processing",
  "currentStep": "file_upload_complete"
}
```

## エラーコード体系

### ファイル関連エラー

| コード | HTTP | 説明 |
|--------|------|------|
| `INVALID_FILE_FORMAT` | 400 | 対応していないファイル形式 |
| `FILE_TOO_LARGE` | 413 | ファイルサイズが100MBを超過 |
| `FILE_CORRUPTED` | 400 | ファイルが破損している |
| `FILE_UPLOAD_FAILED` | 500 | ファイルアップロードに失敗 |

### 処理関連エラー

| コード | HTTP | 説明 |
|--------|------|------|
| `WHISPER_API_ERROR` | 502 | Whisper API呼び出し失敗 |
| `TRANSCRIPTION_TIMEOUT` | 504 | 処理タイムアウト（120秒） |
| `TRANSCRIPTION_FAILED` | 500 | 文字起こし処理失敗 |
| `INSUFFICIENT_STORAGE` | 507 | ディスク容量不足 |

### セッション関連エラー

| コード | HTTP | 説明 |
|--------|------|------|
| `SESSION_NOT_FOUND` | 404 | セッションが見つからない |
| `SESSION_LOCKED` | 409 | セッションが他の処理でロック中 |
| `INVALID_SOURCE` | 400 | 無効なソース指定 |

## 技術実装詳細

### インフラ仕様（Hermes提案準拠）

- **タイムアウト**: 120秒（VPN環境最適化）
- **リトライ機構**: 3回まで、指数バックオフ
- **並行処理数**: 最大3件
- **ファイル分割**: 10MB単位でアップロード
- **一時ファイル**: `/tmp/audio-processing/`に保存
- **自動クリーンアップ**: 24時間後に削除

### データベース設計

```sql
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  source VARCHAR(10) NOT NULL CHECK (source IN ('notta', 'manus')),
  original_filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_format VARCHAR(10) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  transcription_id UUID UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'uploaded',
  progress INTEGER DEFAULT 0,
  whisper_response JSONB,
  error_log JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_audio_files_session_id ON audio_files(session_id);
CREATE INDEX idx_audio_files_transcription_id ON audio_files(transcription_id);
CREATE INDEX idx_audio_files_status ON audio_files(status);
```

### ログ仕様

**構造化JSON形式:**
```json
{
  "timestamp": "2025-06-26T12:45:30.123Z",
  "level": "info",
  "component": "audio-transcription",
  "transcriptionId": "uuid-v4",
  "sessionId": "uuid-v4",
  "event": "whisper_api_call",
  "duration": 45.2,
  "fileSize": 87654321,
  "result": "success"
}
```

## セキュリティ

- ファイルタイプ検証: MIMEタイプとファイルヘッダーの両方でチェック
- ファイルサイズ制限: アップロード前とサーバーサイドで二重チェック
- 一時ファイル隔離: セッション別ディレクトリで分離
- API レート制限: セッションあたり5分に3回まで

## パフォーマンス

- **目標処理時間**: 10分の音声を90秒以内で処理
- **並行処理**: 最大3ファイル同時処理
- **メモリ使用量**: 1ファイルあたり最大200MB
- **ディスク使用量**: 音声ファイルの3倍を想定

## 監視・アラート

- Whisper API応答時間: 30秒以上でアラート
- ファイル処理キュー: 5件以上でアラート
- ディスク使用量: 80%以上でアラート
- エラー率: 10%以上でアラート

---

**注記**: この仕様書は品質委員会（Thoth）が技術委員会の提案を基に作成したドラフトです。技術委員会での正式承認後に確定版となります。