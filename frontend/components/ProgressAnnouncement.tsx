'use client';

import React from 'react';

interface ProgressAnnouncementProps {
  progress: number;
  status: 'uploading' | 'transcribing' | 'completed' | 'error';
  currentStep?: string;
  queuePosition?: number;
  estimatedTime?: number;
}

const ProgressAnnouncement: React.FC<ProgressAnnouncementProps> = ({
  progress,
  status,
  currentStep,
  queuePosition,
  estimatedTime,
}) => {
  const getStatusAnnouncement = (): string => {
    switch (status) {
      case 'uploading':
        return `ファイルアップロード中 ${progress}% 完了`;
      case 'transcribing':
        return `音声文字起こし中 ${progress}% 完了`;
      case 'completed':
        return '文字起こしが完了しました';
      case 'error':
        return 'エラーが発生しました。再試行してください';
      default:
        return `処理中 ${progress}% 完了`;
    }
  };

  const getDetailedAnnouncement = (): string => {
    let announcement = getStatusAnnouncement();
    
    if (currentStep) {
      announcement += `。現在の処理: ${currentStep}`;
    }
    
    if (queuePosition && queuePosition > 0) {
      announcement += `。待機順位: ${queuePosition}番目`;
    }
    
    if (estimatedTime && estimatedTime > 0) {
      const minutes = Math.floor(estimatedTime / 60);
      const seconds = estimatedTime % 60;
      if (minutes > 0) {
        announcement += `。予想残り時間: ${minutes}分${seconds}秒`;
      } else {
        announcement += `。予想残り時間: ${seconds}秒`;
      }
    }
    
    return announcement;
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={getDetailedAnnouncement()}
      className="sr-only"
    >
      {getDetailedAnnouncement()}
    </div>
  );
};

export default ProgressAnnouncement;