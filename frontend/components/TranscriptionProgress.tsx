'use client';

import React, { useState, useEffect, useRef } from 'react';
import ProgressAnnouncement from './ProgressAnnouncement';

interface TranscriptionProgress {
  transcriptionId: string;
  status: 'uploading' | 'transcribing' | 'completed' | 'error';
  progress: number;
  queuePosition?: number;
  estimatedTime?: number;
  currentStep?: string;
  error?: string;
}

interface TranscriptionProgressProps {
  transcriptionId: string;
  onComplete?: (result: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  testMode?: boolean;
  mockProgress?: TranscriptionProgress[];
}

const TranscriptionProgressIndicator: React.FC<TranscriptionProgressProps> = ({
  transcriptionId,
  onComplete,
  onError,
  testMode = false,
  mockProgress = [],
}) => {
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [mockIndex, setMockIndex] = useState(0);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const startTime = useRef<number>(Date.now());

  // テスト用モック機能は削除（useEffectに統合済み）

  // パフォーマンス監視
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.time(`transcription-progress-${transcriptionId}`);
      return () => {
        console.timeEnd(`transcription-progress-${transcriptionId}`);
        const duration = Date.now() - startTime.current;
        console.log(`TranscriptionProgress lifecycle: ${duration}ms`);
      };
    }
  }, [transcriptionId]);

  // モック進捗管理
  useEffect(() => {
    if (testMode && mockProgress.length > 0) {
      const interval = setInterval(() => {
        if (mockIndex < mockProgress.length) {
          setProgress(mockProgress[mockIndex]);
          setMockIndex(prev => prev + 1);
        } else {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [testMode, mockProgress, mockIndex]);

  useEffect(() => {
    // WebSocket接続管理
    if (testMode) {
      return;
    }

    // WebSocket接続の初期化
    const connectWebSocket = () => {
      const ws = new WebSocket(`ws://localhost:3001/ws/transcribe-progress`);
      
      ws.onopen = () => {
        console.log('WebSocket connected for transcription progress');
        // 特定のtranscriptionIdを購読
        ws.send(JSON.stringify({ 
          action: 'subscribe', 
          transcriptionId 
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.transcriptionId === transcriptionId) {
            setProgress(data);
            
            // 完了時のコールバック
            if (data.status === 'completed' && onComplete) {
              onComplete(data);
            }
            
            // エラー時のコールバック
            if (data.status === 'error' && onError) {
              onError(data.error || 'Unknown error occurred');
              // エラー時に再試行ボタンにフォーカスを移動
              setTimeout(() => {
                retryButtonRef.current?.focus();
              }, 100);
            }
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        // 5秒後に再接続を試行
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWebsocket(ws);
    };

    connectWebSocket();

    // キーボードショートカットの設定
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+R または Cmd+R で再試行
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        if (progress?.status === 'error') {
          window.location.reload();
        }
      }
      // Escapeでキャンセル（将来の機能拡張用）
      if (event.key === 'Escape' && websocket) {
        websocket.close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (websocket) {
        websocket.close();
      }
    };
  }, [transcriptionId, onComplete, onError, testMode, websocket, progress?.status]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = (status: string): string => {
    switch (status) {
      case 'uploading':
        return 'ファイルをアップロード中...';
      case 'transcribing':
        return '音声を文字起こし中...';
      case 'completed':
        return '文字起こしが完了しました！';
      case 'error':
        return 'エラーが発生しました';
      default:
        return '処理中...';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'uploading':
        return 'text-blue-600';
      case 'transcribing':
        return 'text-yellow-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!progress) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">接続中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* アクセシビリティ用のアナウンス */}
      {progress && (
        <ProgressAnnouncement
          progress={progress.progress}
          status={progress.status}
          currentStep={progress.currentStep}
          queuePosition={progress.queuePosition}
          estimatedTime={progress.estimatedTime}
        />
      )}
      
      {/* ステータス表示 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {progress.status !== 'error' && progress.status !== 'completed' && (
            <div className="animate-pulse">
              <div className="flex space-x-1">
                <div className="w-2 h-6 bg-blue-500 rounded animate-[audioWave_1.5s_ease-in-out_infinite]"></div>
                <div className="w-2 h-6 bg-blue-500 rounded animate-[audioWave_1.5s_ease-in-out_infinite_0.2s]"></div>
                <div className="w-2 h-6 bg-blue-500 rounded animate-[audioWave_1.5s_ease-in-out_infinite_0.4s]"></div>
              </div>
            </div>
          )}
          {progress.status === 'completed' && (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {progress.status === 'error' && (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className={`text-sm font-medium ${getStatusColor(progress.status)}`}>
            {getStatusMessage(progress.status)}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {progress.progress}%
        </span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${
            progress.status === 'error' 
              ? 'bg-red-500' 
              : progress.status === 'completed'
              ? 'bg-green-500'
              : 'bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500'
          }`}
          style={{ width: `${progress.progress}%` }}
        >
          {progress.status === 'transcribing' && (
            <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
          )}
        </div>
      </div>

      {/* 詳細情報 */}
      <div className="flex justify-between text-xs text-gray-500">
        <div className="space-y-1">
          {progress.currentStep && (
            <p>現在の処理: {progress.currentStep}</p>
          )}
          {progress.queuePosition !== undefined && progress.queuePosition > 0 && (
            <p>待機順位: {progress.queuePosition}番目</p>
          )}
        </div>
        <div className="text-right space-y-1">
          {progress.estimatedTime && (
            <p>予想残り時間: {formatTime(progress.estimatedTime)}</p>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {progress.status === 'error' && progress.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">
                エラーが発生しました
              </h4>
              <p className="text-sm text-red-700 mt-1">
                {progress.error}
              </p>
              <button 
                ref={retryButtonRef}
                className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                onClick={() => window.location.reload()}
                aria-label="エラーが発生したファイルの再アップロード"
                title="Ctrl+R または Cmd+R でも再試行できます"
              >
                再試行 (Ctrl+R)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完了メッセージ */}
      {progress.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">
                文字起こしが完了しました！
              </h4>
              <p className="text-sm text-green-700 mt-1">
                結果を確認してください。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 音声波形アニメーション用のCSS
const audioWaveKeyframes = `
  @keyframes audioWave {
    0%, 100% { 
      height: 0.5rem; 
      opacity: 0.7; 
    }
    50% { 
      height: 1.5rem; 
      opacity: 1; 
    }
  }
`;

// スタイルを挿入
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = audioWaveKeyframes;
  document.head.appendChild(style);
}

export default TranscriptionProgressIndicator;