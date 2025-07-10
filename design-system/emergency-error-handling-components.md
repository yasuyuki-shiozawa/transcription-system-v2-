# 緊急エラーハンドリング コンポーネント設計

**作成者**: Aphrodite（UI/UXデザイナー・UX委員会委員長）  
**日付**: 2025-06-26  
**緊急度**: High  
**対象**: OpenAI APIエラーとシステム障害への即座対応

## 🚨 緊急実装が必要なコンポーネント

### 1. OpenAI APIエラーハンドラー

#### コンポーネント仕様
```typescript
interface OpenAIErrorProps {
  errorType: 'api_key_missing' | 'quota_exceeded' | 'service_unavailable' | 'timeout';
  originalFileName?: string;
  onRetry: () => void;
  onFallback: () => void;
  onContactSupport: () => void;
}

const OpenAIErrorHandler: React.FC<OpenAIErrorProps> = ({
  errorType,
  originalFileName,
  onRetry,
  onFallback,
  onContactSupport
}) => {
  const errorConfig = {
    api_key_missing: {
      icon: '🔧',
      title: '音声認識サービスの設定に問題があります',
      message: 'システム管理者によるAPI設定が必要です。一時的に手動入力をご利用ください。',
      primaryAction: { label: '手動入力で続行', action: onFallback },
      secondaryAction: { label: '管理者に連絡', action: onContactSupport }
    },
    quota_exceeded: {
      icon: '📊',
      title: '音声認識の利用制限に達しました',
      message: '本日の音声認識利用枠を超過しました。明日以降に再試行するか、手動入力をご利用ください。',
      primaryAction: { label: '手動入力で続行', action: onFallback },
      secondaryAction: { label: '明日再試行', action: () => {} }
    },
    service_unavailable: {
      icon: '🌐',
      title: '音声認識サービスが一時的に利用できません',
      message: 'サービス提供者側で一時的な問題が発生しています。数分後に再試行してください。',
      primaryAction: { label: '再試行', action: onRetry },
      secondaryAction: { label: '手動入力で続行', action: onFallback }
    },
    timeout: {
      icon: '⏱️',
      title: '音声認識の処理時間を超過しました',
      message: 'ファイルサイズが大きいか、音声品質の処理に時間がかかっています。',
      primaryAction: { label: '再試行', action: onRetry },
      secondaryAction: { label: 'ファイルを分割', action: onFallback }
    }
  };

  const config = errorConfig[errorType];

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-2xl">{config.icon}</span>
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium text-amber-800">
            {config.title}
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>{config.message}</p>
            {originalFileName && (
              <p className="mt-1 font-medium">ファイル: {originalFileName}</p>
            )}
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={config.primaryAction.action}
              className="bg-amber-100 text-amber-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-amber-200 transition-colors"
            >
              {config.primaryAction.label}
            </button>
            <button
              onClick={config.secondaryAction.action}
              className="bg-white text-amber-800 px-3 py-2 rounded-md text-sm font-medium border border-amber-300 hover:bg-amber-50 transition-colors"
            >
              {config.secondaryAction.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 2. システム状態インジケーター

#### コンポーネント仕様
```typescript
interface SystemStatus {
  backend: 'healthy' | 'slow' | 'down';
  frontend: 'healthy' | 'slow' | 'degraded';
  openai: 'available' | 'limited' | 'unavailable';
  lastChecked: Date;
}

interface SystemStatusProps {
  status: SystemStatus;
  isMinimized?: boolean;
  onToggle?: () => void;
}

const SystemStatusIndicator: React.FC<SystemStatusProps> = ({
  status,
  isMinimized = false,
  onToggle
}) => {
  const getStatusColor = (state: string): string => {
    switch (state) {
      case 'healthy':
      case 'available':
        return 'bg-green-400';
      case 'slow':
      case 'limited':
        return 'bg-yellow-400';
      case 'down':
      case 'degraded':
      case 'unavailable':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (service: string, state: string): string => {
    const labels = {
      backend: {
        healthy: 'サーバー正常',
        slow: 'サーバー低速',
        down: 'サーバー停止'
      },
      frontend: {
        healthy: '画面正常',
        slow: '画面低速',
        degraded: '画面問題'
      },
      openai: {
        available: '音声認識利用可',
        limited: '音声認識制限',
        unavailable: '音声認識停止'
      }
    };
    return labels[service]?.[state] || '状態不明';
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed top-4 right-4 z-50 cursor-pointer"
        onClick={onToggle}
      >
        <div className="bg-white border border-gray-200 rounded-full p-2 shadow-lg">
          <div className="flex space-x-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(status.backend)}`} />
            <div className={`w-2 h-2 rounded-full ${getStatusColor(status.frontend)}`} />
            <div className={`w-2 h-2 rounded-full ${getStatusColor(status.openai)}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">システム状態</h4>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2">
          <StatusItem 
            label="サーバー" 
            status={status.backend}
            description={getStatusLabel('backend', status.backend)}
          />
          <StatusItem 
            label="画面表示" 
            status={status.frontend}
            description={getStatusLabel('frontend', status.frontend)}
          />
          <StatusItem 
            label="音声認識" 
            status={status.openai}
            description={getStatusLabel('openai', status.openai)}
          />
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            最終確認: {status.lastChecked.toLocaleTimeString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  );
};

const StatusItem: React.FC<{
  label: string;
  status: string;
  description: string;
}> = ({ label, status, description }) => {
  const getStatusColor = (state: string): string => {
    switch (state) {
      case 'healthy':
      case 'available':
        return 'bg-green-400';
      case 'slow':
      case 'limited':
        return 'bg-yellow-400';
      case 'down':
      case 'degraded':
      case 'unavailable':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-xs text-gray-500">{description}</span>
    </div>
  );
};
```

### 3. 音声アップロード失敗対応UI

#### コンポーネント仕様
```typescript
interface AudioUploadFailureProps {
  failureReason: 'network' | 'server' | 'file_format' | 'file_size' | 'openai_error';
  fileName: string;
  fileSize: number;
  onRetry: () => void;
  onChooseNewFile: () => void;
  onManualInput: () => void;
}

const AudioUploadFailure: React.FC<AudioUploadFailureProps> = ({
  failureReason,
  fileName,
  fileSize,
  onRetry,
  onChooseNewFile,
  onManualInput
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const failureConfig = {
    network: {
      icon: '🌐',
      title: 'ネットワーク接続エラー',
      message: 'インターネット接続が不安定です。接続を確認して再試行してください。',
      suggestions: [
        'Wi-Fiまたはモバイル通信の状態を確認',
        'VPN接続の場合は一時的に無効化',
        '数分後に再試行'
      ]
    },
    server: {
      icon: '🔧',
      title: 'サーバーエラー',
      message: 'サーバー側で一時的な問題が発生しています。',
      suggestions: [
        'しばらく待ってから再試行',
        '問題が続く場合は管理者に連絡',
        '緊急の場合は手動入力を利用'
      ]
    },
    file_format: {
      icon: '🎵',
      title: 'ファイル形式エラー',
      message: 'このファイル形式には対応していません。',
      suggestions: [
        'MP3またはWAV形式に変換',
        '別の音声ファイルを選択',
        '変換ツールの利用'
      ]
    },
    file_size: {
      icon: '📏',
      title: 'ファイルサイズエラー',
      message: `ファイルサイズ（${formatFileSize(fileSize)}）が制限を超えています。`,
      suggestions: [
        '音声ファイルを圧縮',
        'ファイルを分割してアップロード',
        '低品質での録音を検討'
      ]
    },
    openai_error: {
      icon: '🤖',
      title: '音声認識サービスエラー',
      message: '音声認識処理で問題が発生しました。',
      suggestions: [
        '音声品質を改善して再試行',
        'ノイズの少ない環境で録音',
        '手動での文字起こしも可能'
      ]
    }
  };

  const config = failureConfig[failureReason];

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">{config.icon}</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            {config.title}
          </h3>
          <p className="text-sm text-red-700 mb-2">{config.message}</p>
          
          <div className="bg-red-100 rounded-md p-3 mb-3">
            <p className="text-xs font-medium text-red-800 mb-1">ファイル情報:</p>
            <p className="text-xs text-red-700">
              📎 {fileName} ({formatFileSize(fileSize)})
            </p>
          </div>

          <div className="mb-3">
            <p className="text-xs font-medium text-red-800 mb-2">解決方法:</p>
            <ul className="text-xs text-red-700 space-y-1">
              {config.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-red-400 mr-1">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRetry}
              className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 transition-colors"
            >
              再試行
            </button>
            <button
              onClick={onChooseNewFile}
              className="bg-white text-red-800 px-3 py-1 rounded text-sm font-medium border border-red-300 hover:bg-red-50 transition-colors"
            >
              別ファイルを選択
            </button>
            <button
              onClick={onManualInput}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              手動入力で続行
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 🔧 実装ガイド

### AudioFileUploadコンポーネントへの統合

```typescript
// AudioFileUpload.tsx の handleUpload 関数を拡張
const handleUpload = async () => {
  if (!selectedFile) return;

  setUploading(true);
  setError(null);
  setUploadProgress(0);

  try {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('source', source);

    // ... 既存のアップロード処理 ...

  } catch (error) {
    console.error('Upload error:', error);
    
    // エラータイプの判定
    let errorType: 'network' | 'server' | 'file_format' | 'file_size' | 'openai_error' = 'network';
    
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorType = 'network';
      } else if (error.message.includes('openai') || error.message.includes('transcription')) {
        errorType = 'openai_error';
      } else if (error.message.includes('file size')) {
        errorType = 'file_size';
      } else if (error.message.includes('format')) {
        errorType = 'file_format';
      } else {
        errorType = 'server';
      }
    }

    // エラーUIの表示
    setShowErrorUI({
      type: errorType,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      show: true
    });
    
    setUploadProgress(0);
  } finally {
    setUploading(false);
  }
};
```

### CSS スタイル

```css
/* エラーハンドリング用のアニメーション */
@keyframes error-appear {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-container {
  animation: error-appear 0.3s ease-out;
}

/* システム状態インジケーター用のパルス */
@keyframes status-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-indicator.warning {
  animation: status-pulse 2s infinite;
}

.status-indicator.error {
  animation: status-pulse 1s infinite;
}

/* ホバー効果 */
.status-minimized:hover {
  transform: scale(1.05);
  transition: transform 0.2s ease-in-out;
}
```

## 🎯 実装優先順位

### Phase 1（2時間以内）
1. **OpenAI APIエラーハンドラー**: 最優先実装
2. **基本的なシステム状態表示**: ミニマム版

### Phase 2（4時間以内）
1. **音声アップロード失敗UI**: 完全版実装
2. **システム状態表示**: フル機能版

### Phase 3（24時間以内）
1. **全エラーケースの網羅**: 細かいエラー分類
2. **アクセシビリティ対応**: ARIA属性とキーボード操作

## 🔗 技術連携ポイント

### Hephaestusとの調整事項
- OpenAI APIエラーの詳細分類
- システム状態監視のデータ形式
- エラー復旧の自動化仕様

### Irisとの実装調整
- 既存コンポーネントとの統合方法
- 状態管理の整合性確保
- パフォーマンスへの影響最小化

---

**[URGENT]** これらのコンポーネントにより、技術的な問題をユーザーフレンドリーな体験に変換します！

**設計者**: Aphrodite（アフロディーテ）