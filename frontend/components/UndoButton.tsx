'use client';

import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://transcription-system-v2-backend.onrender.com';

interface UndoButtonProps {
  sessionId: string;
  onUndoSuccess?: () => void;
}

export default function UndoButton({ sessionId, onUndoSuccess }: UndoButtonProps) {
  const [canUndo, setCanUndo] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  // Undo可能かチェック
  const checkCanUndo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/can-undo`);
      const data = await response.json();
      
      if (data.success) {
        setCanUndo(data.canUndo);
        setLastAction(data.lastAction?.actionType || null);
      }
    } catch (error) {
      console.error('Error checking can undo:', error);
    }
  };

  // 初回チェックと定期的なポーリング
  useEffect(() => {
    checkCanUndo();
    
    // 2秒ごとに状態をチェック
    const interval = setInterval(() => {
      checkCanUndo();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  // Undo実行
  const handleUndo = async () => {
    if (!canUndo || isUndoing) return;

    setIsUndoing(true);
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/undo`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // 状態を更新
        await checkCanUndo();
        
        // 親コンポーネントに通知
        if (onUndoSuccess) {
          onUndoSuccess();
        }
      } else {
        console.error('Undoに失敗しました:', data.message);
      }
    } catch (error) {
      console.error('Error executing undo:', error);
      console.error('Undo中にエラーが発生しました:', error);
    } finally {
      setIsUndoing(false);
    }
  };

  // キーボードショートカット（Ctrl+Z / Cmd+Z）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, isUndoing]);

  // アクションタイプの日本語表示
  const getActionLabel = (actionType: string | null): string => {
    if (!actionType) return '';
    
    const labels: Record<string, string> = {
      'HIGHLIGHT_ADD': 'ハイライト追加',
      'HIGHLIGHT_DELETE': 'ハイライト削除',
      'HIGHLIGHT_UPDATE': 'ハイライト更新',
      'MAPPING_CREATE': 'マッピング作成',
      'MAPPING_UPDATE': 'マッピング更新',
      'MAPPING_DELETE': 'マッピング削除',
      'SECTION_EXCLUDE': 'セクション除外',
      'SECTION_INCLUDE': 'セクション除外解除',
    };

    return labels[actionType] || actionType;
  };

  return (
    <button
      onClick={handleUndo}
      disabled={!canUndo || isUndoing}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all duration-200
        flex items-center gap-2
        ${canUndo && !isUndoing
          ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer shadow-md hover:shadow-lg'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }
      `}
      title={
        canUndo && lastAction
          ? `元に戻す: ${getActionLabel(lastAction)} (Ctrl+Z / Cmd+Z)`
          : 'Undo可能な操作がありません'
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
        />
      </svg>
      {isUndoing ? '実行中...' : '元に戻す'}
    </button>
  );
}
