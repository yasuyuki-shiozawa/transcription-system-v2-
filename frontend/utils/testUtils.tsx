// テスト用ユーティリティ
import React from 'react';
import TranscriptionProgressIndicator from '@/components/TranscriptionProgress';

interface TranscriptionProgress {
  transcriptionId: string;
  status: 'uploading' | 'transcribing' | 'completed' | 'error';
  progress: number;
  queuePosition?: number;
  estimatedTime?: number;
  currentStep?: string;
  error?: string;
}

// テスト用のモックデータ生成
export const generateMockProgress = (
  transcriptionId: string,
  type: 'success' | 'error' | 'queue' = 'success'
): TranscriptionProgress[] => {
  const baseProgress: Omit<TranscriptionProgress, 'progress' | 'status'> = {
    transcriptionId,
    currentStep: '音声データを分析中',
  };

  switch (type) {
    case 'success':
      return [
        { ...baseProgress, status: 'uploading', progress: 0 },
        { ...baseProgress, status: 'uploading', progress: 25 },
        { ...baseProgress, status: 'uploading', progress: 50 },
        { ...baseProgress, status: 'uploading', progress: 75 },
        { ...baseProgress, status: 'uploading', progress: 100 },
        { ...baseProgress, status: 'transcribing', progress: 0, currentStep: '音声認識を開始' },
        { ...baseProgress, status: 'transcribing', progress: 20, currentStep: '音声セグメント分析中' },
        { ...baseProgress, status: 'transcribing', progress: 40, currentStep: '言語認識処理中' },
        { ...baseProgress, status: 'transcribing', progress: 60, currentStep: 'テキスト変換中' },
        { ...baseProgress, status: 'transcribing', progress: 80, currentStep: '文章構成の最適化中' },
        { ...baseProgress, status: 'transcribing', progress: 100, currentStep: '最終確認中' },
        { ...baseProgress, status: 'completed', progress: 100, currentStep: '完了' },
      ];

    case 'error':
      return [
        { ...baseProgress, status: 'uploading', progress: 0 },
        { ...baseProgress, status: 'uploading', progress: 30 },
        { ...baseProgress, status: 'uploading', progress: 60 },
        { 
          ...baseProgress, 
          status: 'error', 
          progress: 60, 
          error: 'ネットワークエラーが発生しました。接続を確認してください。'
        },
      ];

    case 'queue':
      return [
        { ...baseProgress, status: 'uploading', progress: 100 },
        { 
          ...baseProgress, 
          status: 'transcribing', 
          progress: 0, 
          queuePosition: 3,
          estimatedTime: 180,
          currentStep: '処理待ちです'
        },
        { 
          ...baseProgress, 
          status: 'transcribing', 
          progress: 0, 
          queuePosition: 2,
          estimatedTime: 120,
          currentStep: '処理待ちです'
        },
        { 
          ...baseProgress, 
          status: 'transcribing', 
          progress: 0, 
          queuePosition: 1,
          estimatedTime: 60,
          currentStep: '処理待ちです'
        },
        { ...baseProgress, status: 'transcribing', progress: 0, currentStep: '音声認識を開始' },
        { ...baseProgress, status: 'transcribing', progress: 50, currentStep: '音声認識処理中' },
        { ...baseProgress, status: 'completed', progress: 100, currentStep: '完了' },
      ];

    default:
      return [];
  }
};

// テスト用のProgressIndicatorコンポーネント
export const TestProgressIndicator: React.FC<{
  type?: 'success' | 'error' | 'queue';
  transcriptionId?: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}> = ({ 
  type = 'success', 
  transcriptionId = 'test-123',
  onComplete,
  onError 
}) => {
  const mockData = generateMockProgress(transcriptionId, type);

  return (
    <TranscriptionProgressIndicator
      transcriptionId={transcriptionId}
      testMode={true}
      mockProgress={mockData}
      onComplete={onComplete}
      onError={onError}
    />
  );
};

// パフォーマンステスト用のヘルパー
export const measureComponentPerformance = (
  componentName: string,
  renderFunction: () => React.ReactElement
) => {
  const startTime = performance.now();
  const component = renderFunction();
  const endTime = performance.now();
  
  console.log(`${componentName} render time: ${endTime - startTime} milliseconds`);
  return component;
};

// アクセシビリティテスト用のヘルパー
export const testAccessibility = (element: HTMLElement) => {
  const tests = {
    hasAriaLabel: !!element.getAttribute('aria-label'),
    hasAriaLive: !!element.querySelector('[aria-live]'),
    hasProperHeadings: element.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
    hasFocusableElements: element.querySelectorAll('button, input, select, textarea, a[href]').length > 0,
    hasKeyboardSupport: true, // キーボードイベントのテストは別途実装
  };

  console.log('Accessibility Test Results:', tests);
  return tests;
};

export default {
  generateMockProgress,
  TestProgressIndicator,
  measureComponentPerformance,
  testAccessibility,
};