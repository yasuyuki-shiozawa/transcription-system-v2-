'use client';

import React, { useState, useRef, useCallback } from 'react';
import UserFriendlyErrorMessage from './UserFriendlyErrorMessage';

interface TextFileUploadProps {
  onFileSelect: (file: File) => void;
  uploading: boolean;
  uploadedFile?: {
    originalFileName: string;
    sectionsCount: number;
  };
  onDownload?: () => void;
  source: 'notta' | 'manus';
  acceptedFormats?: string[];
}

const TextFileUpload: React.FC<TextFileUploadProps> = ({
  onFileSelect,
  uploading,
  uploadedFile,
  onDownload,
  source,
  acceptedFormats = ['.txt', '.docx']
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    setError(null);
    
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      setError(`サポートされていないファイル形式です。対応形式: ${acceptedFormats.join(', ')}`);
      return false;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
      return false;
    }

    // Check if file is empty
    if (file.size === 0) {
      setError('空のファイルは処理できません。');
      return false;
    }

    return true;
  }, [acceptedFormats]);

  const handleFileChange = useCallback((file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  }, [validateFile, onFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      setError('一度に複数のファイルをアップロードすることはできません。');
      return;
    }
    
    const file = files[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // If file is already uploaded, show status
  if (uploadedFile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-green-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">アップロード済み</span>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">ファイル:</span>
              <span className="text-sm text-green-700">{uploadedFile.originalFileName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">セクション数:</span>
              <span className="text-sm text-green-700">{uploadedFile.sectionsCount}</span>
            </div>
          </div>
          
          {onDownload && (
            <button
              onClick={onDownload}
              className="mt-3 w-full px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>セクション番号付きデータをダウンロード</span>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : uploading
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!uploading ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={uploading}
        />
        
        <div className="space-y-3">
          {uploading ? (
            <>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-sm font-medium text-blue-600">アップロード中...</p>
              <p className="text-xs text-gray-500">しばらくお待ちください</p>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <svg
                  className={`w-12 h-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {isDragOver ? 'ファイルをドロップしてください' : 'ファイルをドラッグ＆ドロップ'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  または <span className="text-blue-600 underline">クリックして選択</span>
                </p>
              </div>
              
              <div className="text-xs text-gray-500">
                <p>対応形式: {acceptedFormats.join(', ')}</p>
                <p>最大ファイルサイズ: 10MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <UserFriendlyErrorMessage
          error={error}
          context="upload"
          onRetry={() => setError(null)}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Upload Instructions */}
      {!uploading && !uploadedFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            {source === 'notta' ? 'NOTTAデータについて' : 'Manusデータについて'}
          </h4>
          <ul className="text-xs text-blue-700 space-y-1">
            {source === 'notta' ? (
              <>
                <li>• NOTTAで生成された文字起こしデータをアップロードしてください</li>
                <li>• テキスト形式（.txt）またはWord形式（.docx）に対応しています</li>
                <li>• アップロード後、自動的にセクション番号が付与されます</li>
              </>
            ) : (
              <>
                <li>• 手動で作成された議事録データをアップロードしてください</li>
                <li>• テキスト形式（.txt）またはWord形式（.docx）に対応しています</li>
                <li>• 発言者名や時刻情報も含めることができます</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TextFileUpload;