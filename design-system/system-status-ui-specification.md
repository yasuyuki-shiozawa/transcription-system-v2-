# システム状態可視化UI 設計仕様

**作成者**: Aphrodite（UI/UXデザイナー・UX委員会委員長）  
**日付**: 2025-06-26  
**緊急度**: High  
**対象**: リアルタイムシステム監視のユーザー向け表示

## 🎯 設計目的

技術的なシステム状態をユーザーが理解しやすい形で可視化し、問題発生時の不安を軽減し、適切な対応を促進する。

## 📊 システム状態の分類

### 監視対象サービス

#### 1. Backend Server（バックエンドサーバー）
```typescript
type BackendStatus = {
  status: 'healthy' | 'slow' | 'down';
  responseTime: number; // ms
  uptime: number; // seconds
  lastError?: string;
  errorCount: number; // 24時間以内
};
```

#### 2. Frontend Application（フロントエンド）
```typescript
type FrontendStatus = {
  status: 'healthy' | 'slow' | 'degraded';
  loadTime: number; // ms
  jsErrors: number; // セッション内
  networkLatency: number; // ms
};
```

#### 3. OpenAI API Service（音声認識サービス）
```typescript
type OpenAIStatus = {
  status: 'available' | 'limited' | 'unavailable';
  quotaUsed: number; // %
  averageProcessingTime: number; // ms
  successRate: number; // %
  lastSuccessfulCall?: Date;
};
```

#### 4. Database Connection（データベース）
```typescript
type DatabaseStatus = {
  status: 'connected' | 'slow' | 'disconnected';
  queryTime: number; // ms
  connectionPool: number; // active connections
};
```

## 🎨 UI コンポーネント設計

### 1. ミニマムステータスインジケーター

#### 用途
- 常時表示（右上角）
- 最小限の情報で概要把握
- クリックで詳細表示に展開

#### デザイン仕様
```tsx
const MinimalStatusIndicator: React.FC<{
  overall: 'healthy' | 'warning' | 'critical';
  onClick: () => void;
}> = ({ overall, onClick }) => {
  const statusColors = {
    healthy: 'bg-green-400',
    warning: 'bg-yellow-400', 
    critical: 'bg-red-400'
  };

  const statusIcons = {
    healthy: '✓',
    warning: '!',
    critical: '×'
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-50 cursor-pointer transition-all duration-200 hover:scale-105`}
      onClick={onClick}
    >
      <div className={`${statusColors[overall]} text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg`}>
        <span className="text-sm font-bold">{statusIcons[overall]}</span>
      </div>
      {overall !== 'healthy' && (
        <div className="absolute -top-1 -right-1">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};
```

### 2. 詳細ステータスパネル

#### 用途
- システム状態の詳細表示
- 各サービスの個別状態
- 問題発生時の対応案内

#### デザイン仕様
```tsx
interface DetailedStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  systemStatus: SystemStatus;
}

const DetailedStatusPanel: React.FC<DetailedStatusPanelProps> = ({
  isOpen,
  onClose,
  systemStatus
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">システム状態</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Status Items */}
        <div className="space-y-3">
          <StatusItem
            label="サーバー"
            status={systemStatus.backend.status}
            details={`応答時間: ${systemStatus.backend.responseTime}ms`}
            icon="🖥️"
          />
          <StatusItem
            label="画面表示"
            status={systemStatus.frontend.status}
            details={`読み込み: ${systemStatus.frontend.loadTime}ms`}
            icon="🌐"
          />
          <StatusItem
            label="音声認識"
            status={systemStatus.openai.status}
            details={`利用率: ${systemStatus.openai.quotaUsed}%`}
            icon="🎵"
          />
          <StatusItem
            label="データベース"
            status={systemStatus.database.status}
            details={`接続: ${systemStatus.database.connectionPool}件`}
            icon="💾"
          />
        </div>

        {/* Overall Health Summary */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <OverallHealthSummary systemStatus={systemStatus} />
        </div>

        {/* Last Updated */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          最終更新: {new Date().toLocaleTimeString('ja-JP')}
        </div>
      </div>
    </div>
  );
};
```

### 3. 個別ステータス項目

#### デザイン仕様
```tsx
interface StatusItemProps {
  label: string;
  status: 'healthy' | 'slow' | 'down' | 'available' | 'limited' | 'unavailable';
  details: string;
  icon: string;
  onDrillDown?: () => void;
}

const StatusItem: React.FC<StatusItemProps> = ({
  label,
  status,
  details,
  icon,
  onDrillDown
}) => {
  const getStatusColor = (status: string): string => {
    const statusMap = {
      healthy: 'text-green-600 bg-green-50',
      available: 'text-green-600 bg-green-50',
      slow: 'text-yellow-600 bg-yellow-50',
      limited: 'text-yellow-600 bg-yellow-50',
      down: 'text-red-600 bg-red-50',
      unavailable: 'text-red-600 bg-red-50',
      disconnected: 'text-red-600 bg-red-50',
      degraded: 'text-red-600 bg-red-50'
    };
    return statusMap[status] || 'text-gray-600 bg-gray-50';
  };

  const getStatusText = (status: string): string => {
    const textMap = {
      healthy: '正常',
      available: '利用可能',
      slow: '低速',
      limited: '制限中',
      down: '停止',
      unavailable: '利用不可',
      disconnected: '切断',
      degraded: '劣化'
    };
    return textMap[status] || '不明';
  };

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border ${
        onDrillDown ? 'cursor-pointer hover:bg-gray-50' : ''
      }`}
      onClick={onDrillDown}
    >
      <div className="flex items-center space-x-3">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{details}</p>
        </div>
      </div>
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {getStatusText(status)}
      </div>
    </div>
  );
};
```

### 4. 総合健康度サマリー

#### デザイン仕様
```tsx
const OverallHealthSummary: React.FC<{ systemStatus: SystemStatus }> = ({
  systemStatus
}) => {
  const calculateOverallHealth = (): {
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    message: string;
  } => {
    const statuses = [
      systemStatus.backend.status,
      systemStatus.frontend.status,
      systemStatus.openai.status,
      systemStatus.database.status
    ];

    const healthyCount = statuses.filter(s => 
      s === 'healthy' || s === 'available' || s === 'connected'
    ).length;
    
    const score = (healthyCount / statuses.length) * 100;

    if (score === 100) {
      return {
        score,
        status: 'excellent',
        message: 'すべてのサービスが正常に動作しています'
      };
    } else if (score >= 75) {
      return {
        score,
        status: 'good', 
        message: 'おおむね正常に動作しています'
      };
    } else if (score >= 50) {
      return {
        score,
        status: 'warning',
        message: 'いくつかのサービスで問題が発生しています'
      };
    } else {
      return {
        score,
        status: 'critical',
        message: '複数のサービスで深刻な問題が発生しています'
      };
    }
  };

  const health = calculateOverallHealth();

  const statusColors = {
    excellent: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200'
  };

  const statusIcons = {
    excellent: '🟢',
    good: '🔵', 
    warning: '🟡',
    critical: '🔴'
  };

  return (
    <div className={`p-3 rounded-lg border ${statusColors[health.status]}`}>
      <div className="flex items-center space-x-2 mb-2">
        <span>{statusIcons[health.status]}</span>
        <span className="font-medium">システム健康度: {health.score.toFixed(0)}%</span>
      </div>
      <p className="text-sm">{health.message}</p>
      
      {health.status !== 'excellent' && (
        <div className="mt-2">
          <button className="text-xs underline hover:no-underline">
            問題の詳細を確認
          </button>
        </div>
      )}
    </div>
  );
};
```

## 🔄 リアルタイム更新システム

### 更新頻度
- **Critical状態**: 5秒間隔
- **Warning状態**: 15秒間隔
- **Normal状態**: 30秒間隔

### WebSocket統合
```typescript
const useSystemStatus = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('/ws/system-status');
    
    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const status = JSON.parse(event.data);
      setSystemStatus(status);
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Fallback to polling
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/system/status');
          const status = await response.json();
          setSystemStatus(status);
        } catch (error) {
          console.error('Failed to fetch system status:', error);
        }
      }, 30000);

      return () => clearInterval(interval);
    };

    return () => {
      ws.close();
    };
  }, []);

  return { systemStatus, isConnected };
};
```

## 📱 レスポンシブ対応

### モバイル表示
```css
@media (max-width: 768px) {
  .status-panel {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
  }

  .status-content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-radius: 16px 16px 0 0;
    padding: 20px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .minimal-indicator {
    position: fixed;
    top: 60px; /* ナビゲーションバーの下 */
    right: 16px;
    z-index: 1000;
  }
}
```

### タブレット表示
```css
@media (min-width: 769px) and (max-width: 1024px) {
  .status-panel {
    width: 320px;
  }
  
  .minimal-indicator {
    top: 16px;
    right: 16px;
  }
}
```

## ♿ アクセシビリティ対応

### ARIA属性
```jsx
<div 
  role="status" 
  aria-live="polite" 
  aria-label="システム状態インジケーター"
>
  <div 
    role="button"
    aria-expanded={isOpen}
    aria-controls="status-panel"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        togglePanel();
      }
    }}
  >
    {/* ミニマルインジケーター */}
  </div>
</div>
```

### スクリーンリーダー対応
```jsx
<div className="sr-only" aria-live="assertive">
  {currentAnnouncement && (
    <span>{currentAnnouncement}</span>
  )}
</div>
```

## 🎯 実装優先順位

### Phase 1（2時間以内）
1. **ミニマムステータスインジケーター**
2. **基本的な詳細パネル**
3. **静的データでのプロトタイプ**

### Phase 2（4時間以内）
1. **リアルタイム更新システム**
2. **WebSocket統合**
3. **エラーハンドリング**

### Phase 3（24時間以内）
1. **レスポンシブ対応完了**
2. **アクセシビリティ対応**
3. **パフォーマンス最適化**

## 🔗 技術連携

### Athenaとの連携（品質委員会）
- システム監視データの形式統一
- アラート基準の共通化
- 監視メトリクスの定義

### Hermesとの連携（DevOps）
- インフラ監視データの取得
- WebSocket接続の設定
- ログ統合の仕様

### Hephaestusとの連携（技術委員会）
- バックエンドヘルスチェックAPI
- データベース監視の実装
- OpenAI API状態の取得

---

**[DESIGN]** システムの透明性を美しいUIで実現し、ユーザーの不安を安心感に変換します！

**設計者**: Aphrodite（アフロディーテ）