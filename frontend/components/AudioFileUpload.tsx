'use client';

import React, { useState, useRef } from 'react';
import TranscriptionProgressIndicator from './TranscriptionProgress';
import OpenAIErrorHandler from './OpenAIErrorHandler';
import SystemStatusIndicator from './SystemStatusIndicator';
import ManualTextInput from './ManualTextInput';
import SupportContact from './SupportContact';

interface AudioFileUploadProps {
  sessionId: string;
  source: 'notta' | 'manus';
  onUploadComplete: () => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}

const AudioFileUpload: React.FC<AudioFileUploadProps> = ({
  sessionId,
  source,
  onUploadComplete,
  uploading,
  setUploading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showErrorUI, setShowErrorUI] = useState<{
    type: 'api_key_missing' | 'quota_exceeded' | 'service_unavailable' | 'timeout' | 'network' | 'server' | 'file_format' | 'file_size';
    fileName: string;
    fileSize: number;
    show: boolean;
  } | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    backend: 'healthy' as 'healthy' | 'slow' | 'down',
    frontend: 'healthy' as 'healthy' | 'slow' | 'degraded',
    openai: 'available' as 'available' | 'limited' | 'unavailable',
    lastChecked: new Date()
  });
  const [showManualInput, setShowManualInput] = useState(false);
  const [showSupportContact, setShowSupportContact] = useState(false);
  const [supportErrorContext, setSupportErrorContext] = useState<{
    errorType?: string;
    fileName?: string;
    timestamp?: string;
  } | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave'];
  const ALLOWED_EXTENSIONS = ['.mp3', '.wav'];

  const validateFile = (file: File): string | null => {
    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return `ファイルサイズが大きすぎます。最大100MBまでアップロード可能です。`;
    }

    // ファイルタイプチェック
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return 'MP3またはWAVファイルのみアップロード可能です。';
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const determineErrorType = (error: Error): 'api_key_missing' | 'quota_exceeded' | 'service_unavailable' | 'timeout' | 'network' | 'server' | 'file_format' | 'file_size' => {
    const message = error.message.toLowerCase();
    if (message.includes('api key') || message.includes('unauthorized')) {
      return 'api_key_missing';
    } else if (message.includes('quota') || message.includes('limit')) {
      return 'quota_exceeded';
    } else if (message.includes('timeout')) {
      return 'timeout';
    } else if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    } else if (message.includes('openai') || message.includes('transcription')) {
      return 'service_unavailable';
    } else if (message.includes('file size')) {
      return 'file_size';
    } else if (message.includes('format')) {
      return 'file_format';
    } else {
      return 'server';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setShowErrorUI(null);
    setUploadProgress(0);
    setSystemStatus(prev => ({ ...prev, openai: 'available' }));

    try {
      // モックアップロード（実際のAPIが実装されるまで）
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('source', source);

      // プログレスシミュレーション
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // TODO: 実際のAPIエンドポイントに置き換える
      const response = await fetch(`/api/sessions/${sessionId}/upload/audio/${source}`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('アップロードに失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        // WebSocket進捗表示開始
        if (data.data?.transcriptionId) {
          setTranscriptionId(data.data.transcriptionId);
          setIsTranscribing(true);
        } else {
          alert(`${source === 'notta' ? 'NOTTA' : 'Manus'}音声ファイルのアップロードが完了しました`);
          onUploadComplete();
          resetUpload();
        }
      } else {
        throw new Error(data.error || 'アップロードエラー');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // エラータイプの判定
      const errorType = error instanceof Error ? determineErrorType(error) : 'server';
      
      // システム状態の更新
      if (errorType === 'api_key_missing' || errorType === 'quota_exceeded' || errorType === 'service_unavailable') {
        setSystemStatus(prev => ({ ...prev, openai: 'unavailable' }));
      } else if (errorType === 'network') {
        setSystemStatus(prev => ({ ...prev, backend: 'down' }));
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

  const resetUpload = () => {
    setSelectedFile(null);
    setAudioUrl(null);
    setUploadProgress(0);
    setError(null);
    setShowErrorUI(null);
    setTranscriptionId(null);
    setIsTranscribing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleErrorRetry = () => {
    setShowErrorUI(null);
    setError(null);
    handleUpload();
  };

  const handleErrorFallback = () => {
    setShowErrorUI(null);
    setError(null);
    resetUpload();
    setShowManualInput(true);
  };

  const handleContactSupport = () => {
    setShowErrorUI(null);
    setSupportErrorContext({
      errorType: showErrorUI?.type,
      fileName: showErrorUI?.fileName,
      timestamp: new Date().toISOString(),
    });
    setShowSupportContact(true);
  };

  const handleTranscriptionComplete = (result: Record<string, unknown>) => {
    console.log('Transcription completed:', result);
    alert(`${source === 'notta' ? 'NOTTA' : 'Manus'}音声ファイルの文字起こしが完了しました`);
    onUploadComplete();
    resetUpload();
  };

  const handleTranscriptionError = (error: string) => {
    console.error('Transcription error:', error);
    setError(`文字起こしエラー: ${error}`);
    setIsTranscribing(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 手動入力モードの場合
  if (showManualInput) {
    return (
      <ManualTextInput
        sessionId={sessionId}
        source={source}
        onComplete={() => {
          setShowManualInput(false);
          onUploadComplete();
        }}
        onCancel={() => setShowManualInput(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* システム状態インジケーター */}
      <SystemStatusIndicator
        status={systemStatus}
        isMinimized={true}
        onToggle={() => {}}
      />

      {/* OpenAI APIエラーハンドラー */}
      {showErrorUI && (
        <OpenAIErrorHandler
          errorType={showErrorUI.type}
          originalFileName={showErrorUI.fileName}
          onRetry={handleErrorRetry}
          onFallback={handleErrorFallback}
          onContactSupport={handleContactSupport}
        />
      )}
      
      {/* 手動入力モード切り替えボタン */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowManualInput(true)}
          className="text-sm text-blue-600 hover:text-blue-700 underline"
        >
          音声ファイルがない場合はこちら（手動入力）
        </button>
      </div>

      {/* ファイル選択エリア */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          selectedFile
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            {selectedFile ? (
              <>
                <span className="font-medium">{selectedFile.name}</span>
                <br />
                <span className="text-xs">
                  {formatFileSize(selectedFile.size)}
                </span>
              </>
            ) : (
              <>
                音声ファイルをドラッグ＆ドロップ
                <br />
                または<span className="text-blue-600">クリックして選択</span>
              </>
            )}
          </p>
          <p className="text-xs text-gray-500">MP3, WAV (最大100MB)</p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 音声プレビュー */}
      {audioUrl && !error && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">音声プレビュー</h4>
          <audio
            ref={audioRef}
            controls
            className="w-full"
            src={audioUrl}
            onLoadedMetadata={(e) => {
              const audio = e.target as HTMLAudioElement;
              console.log('Duration:', formatDuration(audio.duration));
            }}
          />
        </div>
      )}

      {/* WebSocket進捗表示 */}
      {isTranscribing && transcriptionId && (
        <TranscriptionProgressIndicator
          transcriptionId={transcriptionId}
          onComplete={handleTranscriptionComplete}
          onError={handleTranscriptionError}
        />
      )}

      {/* アップロードボタン */}
      {selectedFile && !error && !isTranscribing && (
        <div className="space-y-3">
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>アップロード中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {uploading ? 'アップロード中...' : 'アップロード'}
            </button>
            <button
              onClick={resetUpload}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* サポート連絡モーダル */}
      <SupportContact
        isOpen={showSupportContact}
        onClose={() => setShowSupportContact(false)}
        errorContext={supportErrorContext}
      />
    </div>
  );
};

export default AudioFileUpload;