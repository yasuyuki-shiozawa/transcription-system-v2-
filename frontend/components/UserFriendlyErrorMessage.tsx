'use client';

import React from 'react';

interface UserFriendlyErrorMessageProps {
  error: string | Error;
  context?: 'upload' | 'processing' | 'download' | 'connection' | 'general';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const UserFriendlyErrorMessage: React.FC<UserFriendlyErrorMessageProps> = ({
  error,
  context = 'general',
  onRetry,
  onDismiss,
  className = ''
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // Convert technical errors to user-friendly messages
  const getUserFriendlyMessage = (message: string, context: string): { title: string; description: string; suggestions: string[] } => {
    const lowerMessage = message.toLowerCase();

    // Network/Connection errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
      return {
        title: 'インターネット接続エラー',
        description: 'サーバーとの通信に問題が発生しました。',
        suggestions: [
          'インターネット接続を確認してください',
          '数秒後に再試行してください',
          'ページを再読み込みしてください'
        ]
      };
    }

    // File size/format errors
    if (lowerMessage.includes('size') || lowerMessage.includes('large') || lowerMessage.includes('サイズ')) {
      return {
        title: 'ファイルサイズエラー',
        description: 'アップロードしようとしたファイルが大きすぎます。',
        suggestions: [
          'ファイルサイズを10MB以下に削減してください',
          '不要な内容を削除してください',
          'ファイルを分割してアップロードしてください'
        ]
      };
    }

    // File format errors
    if (lowerMessage.includes('format') || lowerMessage.includes('type') || lowerMessage.includes('形式')) {
      return {
        title: 'ファイル形式エラー',
        description: 'サポートされていないファイル形式です。',
        suggestions: [
          '.txt または .docx 形式のファイルを使用してください',
          'ファイル拡張子を確認してください',
          'ファイルが破損していないか確認してください'
        ]
      };
    }

    // Server errors
    if (lowerMessage.includes('500') || lowerMessage.includes('server') || lowerMessage.includes('internal')) {
      return {
        title: 'サーバーエラー',
        description: 'サーバー側で一時的な問題が発生しています。',
        suggestions: [
          'しばらく時間をおいてから再試行してください',
          '問題が続く場合は管理者にお問い合わせください'
        ]
      };
    }

    // Authentication/Permission errors
    if (lowerMessage.includes('401') || lowerMessage.includes('403') || lowerMessage.includes('auth')) {
      return {
        title: '認証エラー',
        description: 'アクセス権限に問題があります。',
        suggestions: [
          'ページを再読み込みしてください',
          'ログインし直してください'
        ]
      };
    }

    // Context-specific errors
    if (context === 'upload') {
      return {
        title: 'アップロードエラー',
        description: 'ファイルのアップロードに失敗しました。',
        suggestions: [
          'ファイル形式とサイズを確認してください',
          'インターネット接続を確認してください',
          '再試行してください'
        ]
      };
    }

    if (context === 'processing') {
      return {
        title: '処理エラー',
        description: 'ファイルの処理中にエラーが発生しました。',
        suggestions: [
          'ファイル内容を確認してください',
          '別のファイルで試してください',
          'サポートに問い合わせてください'
        ]
      };
    }

    if (context === 'download') {
      return {
        title: 'ダウンロードエラー',
        description: 'ファイルのダウンロードに失敗しました。',
        suggestions: [
          '再試行してください',
          'ブラウザのダウンロード設定を確認してください'
        ]
      };
    }

    // Generic error
    return {
      title: 'エラーが発生しました',
      description: message || '予期しないエラーが発生しました。',
      suggestions: [
        '再試行してください',
        'ページを再読み込みしてください',
        '問題が続く場合はサポートにお問い合わせください'
      ]
    };
  };

  const { title, description, suggestions } = getUserFriendlyMessage(errorMessage, context);

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className="ml-3 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">{title}</h3>
              <p className="text-sm text-red-700 mt-1">{description}</p>
              
              {suggestions.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-red-800 mb-1">解決方法:</h4>
                  <ul className="text-xs text-red-700 space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-3 flex space-x-2">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    再試行
                  </button>
                )}
                
                <button
                  onClick={() => {
                    // Copy error details to clipboard for support
                    navigator.clipboard.writeText(`Error: ${errorMessage}\nContext: ${context}\nTime: ${new Date().toISOString()}`);
                    alert('エラー詳細をクリップボードにコピーしました。サポートにお問い合わせの際にご利用ください。');
                  }}
                  className="text-xs text-red-600 underline hover:text-red-800"
                  title="エラー詳細をコピー"
                >
                  エラー詳細をコピー
                </button>
              </div>
            </div>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-3 text-red-400 hover:text-red-600"
                title="閉じる"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Technical details (collapsed by default) */}
      <details className="mt-3">
        <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
          技術的な詳細を表示
        </summary>
        <div className="mt-2 p-2 bg-red-100 rounded text-xs font-mono text-red-800 break-all">
          {errorMessage}
        </div>
      </details>
    </div>
  );
};

export default UserFriendlyErrorMessage;