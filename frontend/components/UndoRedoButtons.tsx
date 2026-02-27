'use client';

import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://transcription-system-v2-backend.onrender.com';

interface UndoRedoButtonsProps {
  sessionId: string;
  onUndoSuccess?: () => void;
  onRedoSuccess?: () => void;
}

export default function UndoRedoButtons({ sessionId, onUndoSuccess, onRedoSuccess }: UndoRedoButtonsProps) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [lastUndoneAction, setLastUndoneAction] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isRedoing, setIsRedoing] = useState(false);

  // Undo/Redo可能かチェック
  const checkCanUndoRedo = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/can-undo`);
      const data = await response.json();
      
      if (data.success) {
        setCanUndo(data.canUndo);
        setCanRedo(data.canRedo || false);
        setLastAction(data.lastAction?.actionType || null);
        setLastUndoneAction(data.lastUndoneAction?.actionType || null);
      }
    } catch (error) {
      console.error('Error checking can undo/redo:', error);
    }
  }, [sessionId]);

  // 初回チェックと定期的なポーリング
  useEffect(() => {
    checkCanUndoRedo();
    
    // 2秒ごとに状態をチェック
    const interval = setInterval(() => {
      checkCanUndoRedo();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [checkCanUndoRedo]);

  // Undo実行
  const handleUndo = useCallback(async () => {
    if (!canUndo || isUndoing || isRedoing) return;

    setIsUndoing(true);
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/undo`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // 状態を更新
        await checkCanUndoRedo();
        
        // 親コンポーネントに通知
        if (onUndoSuccess) {
          onUndoSuccess();
        }
      } else {
        console.error('Undoに失敗しました:', data.message);
      }
    } catch (error) {
      console.error('Error executing undo:', error);
    } finally {
      setIsUndoing(false);
    }
  }, [canUndo, isUndoing, isRedoing, sessionId, checkCanUndoRedo, onUndoSuccess]);

  // Redo実行
  const handleRedo = useCallback(async () => {
    if (!canRedo || isRedoing || isUndoing) return;

    setIsRedoing(true);
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/redo`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // 状態を更新
        await checkCanUndoRedo();
        
        // 親コンポーネントに通知
        if (onRedoSuccess) {
          onRedoSuccess();
        }
      } else {
        console.error('Redoに失敗しました:', data.message);
      }
    } catch (error) {
      console.error('Error executing redo:', error);
    } finally {
      setIsRedoing(false);
    }
  }, [canRedo, isRedoing, isUndoing, sessionId, checkCanUndoRedo, onRedoSuccess]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z (Undo) - Shiftなし
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }
      // Ctrl+Y / Cmd+Y (Redo)
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        handleRedo();
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z (Redo)
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        handleRedo();
      }
      // Ctrl+Shift+Z on Mac (key might be 'Z' uppercase)
      if ((event.ctrlKey || event.metaKey) && event.key === 'Z' && event.shiftKey) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

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
    <div className="flex items-center gap-2">
      {/* Undo Button */}
      <button
        onClick={handleUndo}
        disabled={!canUndo || isUndoing || isRedoing}
        className={`
          px-4 py-2 rounded-lg font-medium transition-all duration-200
          flex items-center gap-2
          ${canUndo && !isUndoing && !isRedoing
            ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer shadow-md hover:shadow-lg'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
        title={
          canUndo && lastAction
            ? `元に戻す: ${getActionLabel(lastAction)} (Ctrl+Z)`
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

      {/* Redo Button */}
      <button
        onClick={handleRedo}
        disabled={!canRedo || isRedoing || isUndoing}
        className={`
          px-4 py-2 rounded-lg font-medium transition-all duration-200
          flex items-center gap-2
          ${canRedo && !isRedoing && !isUndoing
            ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer shadow-md hover:shadow-lg'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
        title={
          canRedo && lastUndoneAction
            ? `やり直す: ${getActionLabel(lastUndoneAction)} (Ctrl+Y)`
            : 'Redo可能な操作がありません'
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
            d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
          />
        </svg>
        {isRedoing ? '実行中...' : 'やり直す'}
      </button>
    </div>
  );
}
