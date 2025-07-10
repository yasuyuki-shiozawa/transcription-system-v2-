# WebSocket進捗表示機能 技術仕様書 v1.0

**作成者**: Thoth（品質委員会）  
**作成日**: 2025-06-26 JST  
**ステータス**: CPO・CEO指示対応版  
**実装基準**: Iris完成実装・Hermes実装統合  
**品質保証**: Athena WebSocket品質戦略準拠  

## 概要

音声ファイルの文字起こし処理進捗をリアルタイムで表示するWebSocket通信機能の技術仕様です。

## アーキテクチャ概要

### フロントエンド（Iris実装）
- **TranscriptionProgressIndicator.tsx**: WebSocket接続とUI表示
- **AudioFileUpload.tsx**: 進捗表示統合コンポーネント
- **useTranscriptionProgress**: カスタムフック

### バックエンド（Hermes実装）
- **websocketService.ts**: Socket.IO基盤WebSocketサービス
- **TranscriptionProgress通信プロトコル**: 標準化されたメッセージ形式

## WebSocket接続仕様

### エンドポイント
```
WebSocket URL: ws://localhost:3001/ws/transcribe-progress
Protocol: Socket.IO (WebSocket)
CORS設定: localhost:3000対応済み
```

### 接続フロー
```typescript
// 1. WebSocket接続確立
const ws = new WebSocket('ws://localhost:3001/ws/transcribe-progress');

// 2. 転写ID購読
ws.send(JSON.stringify({
  action: 'subscribe-transcription',
  transcriptionId: 'uuid-v4-string'
}));

// 3. リアルタイム進捗受信
ws.onmessage = (event) => {
  const progressData = JSON.parse(event.data);
  // UI更新処理
};
```

## メッセージプロトコル

### TranscriptionProgress インターフェース
```typescript
interface TranscriptionProgress {
  transcriptionId: string;
  status: 'uploading' | 'transcribing' | 'completed' | 'error';
  progress: number;          // 0-100%
  queuePosition?: number;    // 並行処理制限対応（最大3件）
  estimatedTime?: number;    // 120秒タイムアウト対応
  currentStep?: string;      // 詳細ステップ情報
  error?: string;           // エラー詳細
}
```

### メッセージ送信例
```json
{
  "transcriptionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "transcribing",
  "progress": 45,
  "queuePosition": 2,
  "estimatedTime": 75,
  "currentStep": "whisper_api_processing"
}
```

## フロントエンド実装詳細

### useTranscriptionProgress カスタムフック
```typescript
const useTranscriptionProgress = (transcriptionId: string) => {
  const [progress, setProgress] = useState<TranscriptionProgress>();
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');

  useEffect(() => {
    const startTime = performance.now();
    const ws = new WebSocket('ws://localhost:3001/ws/transcribe-progress');
    
    ws.onopen = () => {
      setConnectionState('connected');
      // 接続時間監視（品質メトリクス）
      const connectionTime = performance.now() - startTime;
      console.log(`WebSocket接続時間: ${connectionTime}ms`);
      
      // 転写ID購読
      ws.send(JSON.stringify({
        action: 'subscribe-transcription',
        transcriptionId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.transcriptionId === transcriptionId) {
          setProgress(data);
        }
      } catch (error) {
        console.error('WebSocketメッセージ解析エラー:', error);
      }
    };

    ws.onerror = () => {
      setConnectionState('error');
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [transcriptionId]);

  return { progress, connectionState };
};
```

### TranscriptionProgressIndicator コンポーネント
```typescript
const TranscriptionProgressIndicator = ({ transcriptionId }: Props) => {
  const { progress, connectionState } = useTranscriptionProgress(transcriptionId);

  if (connectionState === 'error') {
    return <ErrorDisplay error="WebSocket接続エラーが発生しました" />;
  }

  if (!progress) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* 音声波形風アニメーション（UX委員会要件） */}
      <div className="flex items-center space-x-2 mb-4">
        <MicrophoneIcon className="w-5 h-5 text-blue-500" />
        <span className="text-sm font-medium text-gray-700">
          音声文字起こし処理中...
        </span>
      </div>
      
      {/* プログレスバー */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300 audio-progress-bar"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{progress.progress}% 完了</span>
          {progress.estimatedTime && (
            <span>残り約 {Math.ceil(progress.estimatedTime / 60)} 分</span>
          )}
        </div>
      </div>

      {/* キューイング状態表示 */}
      {progress.queuePosition && progress.queuePosition > 1 && (
        <div className="mt-3 text-sm text-amber-600">
          待機中... (順番: {progress.queuePosition}番目)
        </div>
      )}

      {/* 現在のステップ表示 */}
      {progress.currentStep && (
        <div className="mt-2 text-xs text-gray-500">
          {getCurrentStepMessage(progress.currentStep)}
        </div>
      )}
    </div>
  );
};
```

## バックエンド実装詳細

### WebSocketService（Hermes実装）
```typescript
// backend/src/services/websocketService.ts
import { Server as SocketIOServer } from 'socket.io';

class WebSocketService {
  private io: SocketIOServer;
  private transcriptionRooms: Map<string, Set<string>> = new Map();

  initialize(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      transports: ['websocket']
    });

    this.io.on('connection', (socket) => {
      console.log(`WebSocket接続: ${socket.id}`);

      socket.on('subscribe-transcription', (data) => {
        const { transcriptionId } = data;
        socket.join(`transcription-${transcriptionId}`);
        
        // ルーム管理
        if (!this.transcriptionRooms.has(transcriptionId)) {
          this.transcriptionRooms.set(transcriptionId, new Set());
        }
        this.transcriptionRooms.get(transcriptionId)!.add(socket.id);
      });

      socket.on('disconnect', () => {
        // クリーンアップ処理
        this.transcriptionRooms.forEach((sockets, transcriptionId) => {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.transcriptionRooms.delete(transcriptionId);
          }
        });
      });
    });
  }

  // 進捗通知メソッド
  updateProgress(transcriptionId: string, progressData: TranscriptionProgress) {
    this.io.to(`transcription-${transcriptionId}`).emit('progress-update', progressData);
  }

  startUpload(transcriptionId: string, filename: string) {
    this.updateProgress(transcriptionId, {
      transcriptionId,
      status: 'uploading',
      progress: 0,
      currentStep: 'file_upload_start'
    });
  }

  updateUploadProgress(transcriptionId: string, progress: number) {
    this.updateProgress(transcriptionId, {
      transcriptionId,
      status: 'uploading',
      progress: Math.min(progress, 30), // アップロードは30%まで
      currentStep: 'file_uploading'
    });
  }

  startTranscription(transcriptionId: string) {
    this.updateProgress(transcriptionId, {
      transcriptionId,
      status: 'transcribing',
      progress: 30,
      currentStep: 'whisper_api_call'
    });
  }

  updateTranscriptionProgress(transcriptionId: string, progress: number) {
    this.updateProgress(transcriptionId, {
      transcriptionId,
      status: 'transcribing',
      progress: 30 + Math.min(progress, 70), // 転写は30-100%
      currentStep: 'whisper_api_processing'
    });
  }

  completeTranscription(transcriptionId: string, result: any) {
    this.updateProgress(transcriptionId, {
      transcriptionId,
      status: 'completed',
      progress: 100,
      currentStep: 'transcription_complete'
    });

    // 5秒後にクリーンアップ
    setTimeout(() => {
      this.transcriptionRooms.delete(transcriptionId);
    }, 5000);
  }

  errorTranscription(transcriptionId: string, error: string) {
    this.updateProgress(transcriptionId, {
      transcriptionId,
      status: 'error',
      progress: 0,
      error,
      currentStep: 'error_occurred'
    });
  }
}

export const wsService = new WebSocketService();
export { WebSocketService };
```

## パフォーマンス仕様

### 接続パフォーマンス
- **接続確立時間**: 目標 < 200ms（Athena品質基準）
- **ハートビート間隔**: 25秒（Hermes設定）
- **自動再接続**: 3回まで（指数バックオフ）
- **タイムアウト**: 30秒

### メッセージパフォーマンス
- **メッセージ遅延**: 目標 < 100ms
- **スループット**: > 50 messages/sec
- **メモリ効率**: 完了後5秒でクリーンアップ

### 品質メトリクス
```typescript
interface WebSocketMetrics {
  connectionAttempts: number;
  connectionSuccesses: number;
  reconnectionCount: number;
  averageConnectionTime: number;
  messageCount: number;
  messageErrors: number;
  lastHeartbeat: Date;
}
```

## エラーハンドリング

### 接続エラー対応
```typescript
const ErrorDisplay = ({ error }: { error: string }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-start">
      <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5" />
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">
          接続エラー
        </h3>
        <p className="text-sm text-red-700 mt-1">{error}</p>
        <button 
          className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          再接続
        </button>
      </div>
    </div>
  </div>
);
```

### ネットワーク切断対応
```typescript
useEffect(() => {
  const handleOnline = () => {
    // オンライン復帰時の再接続
    if (connectionState === 'disconnected') {
      // WebSocket再接続処理
    }
  };

  const handleOffline = () => {
    setConnectionState('disconnected');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, [connectionState]);
```

## セキュリティ

### 接続制限
- **Origin検証**: localhost:3000のみ許可
- **レート制限**: 接続あたり10 messages/sec
- **メッセージサイズ制限**: 1KB以下

### データ保護
- **データ暗号化**: WSS（TLS）使用
- **セッション分離**: 転写ID別ルーム管理
- **データ漏洩防止**: 他セッションへの情報流出防止

## 統合テスト

### 接続テスト
```typescript
describe('WebSocket接続テスト', () => {
  test('正常接続確立', async () => {
    const { result } = renderHook(() => useTranscriptionProgress('test-id'));
    
    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    }, { timeout: 3000 });
  });

  test('自動再接続機能', async () => {
    // モックサーバー切断→再接続テスト
  });
});
```

### 進捗データテスト
```typescript
describe('進捗データ更新テスト', () => {
  test('リアルタイム進捗更新', async () => {
    const progressSequence = [10, 25, 50, 75, 100];
    
    for (const progress of progressSequence) {
      mockWebSocket.send(JSON.stringify({
        transcriptionId: 'test-id',
        progress,
        status: 'processing'
      }));
      
      await waitFor(() => {
        expect(result.current.progress.progress).toBe(progress);
      });
    }
  });
});
```

## 監視・ログ

### 接続監視
- WebSocket接続数: リアルタイム監視
- 接続エラー率: 5%以上でアラート
- 平均接続時間: 500ms以上でアラート

### ログ形式
```json
{
  "timestamp": "2025-06-26T13:45:30.123Z",
  "level": "info",
  "component": "websocket-service",
  "transcriptionId": "uuid-v4",
  "event": "connection_established",
  "socketId": "socket-id",
  "duration": 150.5
}
```

---

**注記**: この仕様書は品質委員会（Thoth）がIris実装・Hermes実装を統合し、Athena品質戦略に基づいて作成したものです。CPO・CEO指示による音声アップロード機能最優先化対応版です。