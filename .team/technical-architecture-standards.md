# 技術アーキテクチャ標準仕様書

## 🏗️ 設計責任者: Prometheus (Chief System Architect)
**策定日**: 2025-06-26  
**適用範囲**: 転写システム全体

---

## 1. 🎯 設計原則

### 1.1 アーキテクチャ原則
- **Single Responsibility**: 各コンポーネントは単一の責務を持つ
- **Separation of Concerns**: 設計・実装・運用の明確な分離
- **Scalability First**: 拡張性を最優先に設計
- **API First**: APIを中心とした設計

### 1.2 技術選定基準
- **モダンスタック**: 最新安定版の技術採用
- **TypeScript必須**: 型安全性の完全確保
- **テスト完備**: 自動化テストカバレッジ90%以上
- **コンテナ対応**: Docker環境での運用

---

## 2. 📡 API設計標準

### 2.1 RESTful API規約

#### エンドポイント命名規約
```
GET    /api/v1/{resources}           # 一覧取得
POST   /api/v1/{resources}           # 新規作成
GET    /api/v1/{resources}/{id}      # 詳細取得
PUT    /api/v1/{resources}/{id}      # 全体更新
PATCH  /api/v1/{resources}/{id}      # 部分更新
DELETE /api/v1/{resources}/{id}      # 削除
```

#### レスポンス形式標準
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

#### ステータスコード規約
- `200`: 成功（GET, PUT, PATCH）
- `201`: 作成成功（POST）
- `204`: 成功・レスポンスなし（DELETE）
- `400`: リクエストエラー
- `401`: 認証エラー
- `403`: 認可エラー
- `404`: リソース未存在
- `422`: バリデーションエラー
- `500`: サーバーエラー

### 2.2 WebSocket設計標準

#### 接続パターン
```typescript
// 接続管理
interface WebSocketConnection {
  id: string;
  namespace: string;
  subscriptions: string[];
  lastActivity: Date;
}

// メッセージ形式
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error';
  resource: string;
  resourceId?: string;
  data?: any;
  timestamp: string;
}
```

---

## 3. 🏛️ フロントエンド設計標準

### 3.1 コンポーネント設計原則

#### ディレクトリ構造標準
```
components/
├── ui/                 # 基本UIコンポーネント
│   ├── Button/
│   ├── Input/
│   └── Modal/
├── features/           # 機能別コンポーネント
│   ├── session/
│   ├── upload/
│   └── transcription/
└── layout/            # レイアウトコンポーネント
    ├── Header/
    ├── Sidebar/
    └── Footer/
```

#### コンポーネント命名規約
```typescript
// PascalCase（大文字始まり）
export const AudioFileUpload: React.FC<AudioFileUploadProps> = ({
  onUpload,
  onError,
  maxFileSize = 100 * 1024 * 1024 // 100MB
}) => {
  // 実装
};
```

### 3.2 状態管理標準

#### Context + Reducer パターン
```typescript
// 状態定義
interface AppState {
  sessions: Session[];
  currentSession?: Session;
  isLoading: boolean;
  error?: string;
}

// Reducer実装
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};
```

### 3.3 型定義標準

#### 中央集約型定義
```typescript
// types/index.ts
export interface Session {
  id: string;
  name: string;
  date: Date;
  status: 'draft' | 'in_progress' | 'completed';
}

export interface TranscriptionData {
  id: string;
  sessionId: string;
  source: 'notta' | 'manus';
  originalFileName: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
}
```

---

## 4. 🗄️ データベース設計標準

### 4.1 命名規約
- **テーブル名**: `snake_case` + 複数形（例: `transcription_data`）
- **カラム名**: `snake_case`（例: `created_at`）
- **インデックス名**: `idx_{table}_{column(s)}`

### 4.2 Prismaスキーマ標準
```prisma
model Session {
  id        String   @id @default(cuid())
  name      String
  date      DateTime
  status    String   @default("draft")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relations
  transcriptionData TranscriptionData[]
  
  @@map("sessions")
}
```

---

## 5. 🚀 パフォーマンス設計標準

### 5.1 最適化指針
- **画像最適化**: Next.js Image コンポーネント使用
- **コード分割**: Dynamic Imports活用
- **バンドル最適化**: Tree Shaking完全実施
- **キャッシュ戦略**: SWR or React Query導入

### 5.2 WebSocket最適化
```typescript
// 接続プール管理
class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private maxConnections = 10;
  
  connect(id: string, url: string): WebSocket {
    if (this.connections.size >= this.maxConnections) {
      this.pruneOldConnections();
    }
    
    const ws = new WebSocket(url);
    this.connections.set(id, ws);
    return ws;
  }
}
```

---

## 6. 🛡️ セキュリティ設計標準

### 6.1 認証・認可
```typescript
// JWT Token構造
interface JWTPayload {
  userId: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  exp: number;
  iat: number;
}
```

### 6.2 入力検証標準
```typescript
// Zod使用例
import { z } from 'zod';

const sessionSchema = z.object({
  name: z.string().min(1).max(100),
  date: z.date(),
  status: z.enum(['draft', 'in_progress', 'completed'])
});
```

---

## 7. 📊 監視・ログ設計標準

### 7.1 ログ形式
```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  module: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}
```

### 7.2 メトリクス収集
- **API応答時間**: 平均・P95・P99
- **WebSocket接続数**: アクティブ接続数
- **音声処理時間**: Whisper API呼び出し時間
- **エラー率**: HTTP 5xx / WebSocketエラー

---

## 8. 🔄 CI/CD設計標準

### 8.1 ブランチ戦略
```
main        # 本番環境
├── develop # 開発統合
├── feature/* # 機能開発
└── hotfix/*  # 緊急修正
```

### 8.2 デプロイメント戦略
- **ステージング**: develop ブランチ自動デプロイ
- **本番**: main ブランチ手動デプロイ
- **ロールバック**: 前バージョンへの即座切り戻し

---

## 9. 📝 ドキュメント標準

### 9.1 API仕様書
- **OpenAPI 3.0**: Swagger UI生成
- **Postman Collection**: テスト用コレクション
- **実装例**: cURL + レスポンス例

### 9.2 コードドキュメント
```typescript
/**
 * 音声ファイルを転写する
 * @param file - 音声ファイル（MP3/WAV, 最大100MB）
 * @param options - 転写オプション
 * @returns 転写結果とメタデータ
 * @throws {TranscriptionError} API呼び出し失敗時
 */
async function transcribeAudio(
  file: File,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  // 実装
}
```

---

## 10. 🎯 品質基準

### 10.1 コード品質
- **TypeScript**: strict モード有効
- **ESLint**: 厳格なルール適用
- **Prettier**: 統一フォーマット
- **テストカバレッジ**: 90%以上

### 10.2 パフォーマンス基準
- **Initial Load**: 3秒以内
- **API Response**: 500ms以内
- **Bundle Size**: 2MB以下（gzip圧縮後）

---

## 📋 実装優先順位

### Phase 1: 基盤強化（Week 1-2）
1. 型定義の中央集約
2. エラーハンドリング統一
3. API レスポンス形式標準化

### Phase 2: アーキテクチャ改善（Week 3-4）
1. フロントエンド状態管理改善
2. コンポーネント分割
3. WebSocket最適化

### Phase 3: 拡張機能（Week 5-6）
1. 認証・認可システム
2. 監視・ログシステム
3. パフォーマンス最適化

---

**設計責任者**: Prometheus (Chief System Architect)  
**最終更新**: 2025-06-26  
**承認**: 必要時にAtlas (CEO)承認

この標準仕様書は、転写システムの技術的な卓越性と持続可能性を確保するための基盤文書です。