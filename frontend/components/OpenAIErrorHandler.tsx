'use client';

import React from 'react';

interface OpenAIErrorProps {
  errorType: 'api_key_missing' | 'quota_exceeded' | 'service_unavailable' | 'timeout' | 'network' | 'server' | 'file_format' | 'file_size';
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
    },
    network: {
      icon: '🌐',
      title: 'ネットワーク接続エラー',
      message: 'インターネット接続が不安定です。接続を確認して再試行してください。',
      primaryAction: { label: '再試行', action: onRetry },
      secondaryAction: { label: '手動入力で続行', action: onFallback }
    },
    server: {
      icon: '🔧',
      title: 'サーバーエラー',
      message: 'サーバー側で一時的な問題が発生しています。',
      primaryAction: { label: '再試行', action: onRetry },
      secondaryAction: { label: '手動入力で続行', action: onFallback }
    },
    file_format: {
      icon: '🎵',
      title: 'ファイル形式エラー',
      message: 'このファイル形式には対応していません。',
      primaryAction: { label: '別ファイルを選択', action: onFallback },
      secondaryAction: { label: '手動入力で続行', action: onFallback }
    },
    file_size: {
      icon: '📏',
      title: 'ファイルサイズエラー',
      message: 'ファイルサイズが制限を超えています。',
      primaryAction: { label: '別ファイルを選択', action: onFallback },
      secondaryAction: { label: '手動入力で続行', action: onFallback }
    }
  };

  const config = errorConfig[errorType];

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 animate-[error-appear_0.3s_ease-out]">
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

export default OpenAIErrorHandler;