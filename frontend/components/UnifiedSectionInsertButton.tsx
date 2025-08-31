'use client';

import React, { useState } from 'react';

interface UnifiedSectionInsertButtonProps {
  sessionId: string;
  insertPosition: number;
  onSectionAdded: () => void;
}

const UnifiedSectionInsertButton: React.FC<UnifiedSectionInsertButtonProps> = ({
  sessionId,
  insertPosition,
  onSectionAdded
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInsertSection = async (source: 'NOTTA' | 'MANUS') => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://transcription-system-1.onrender.com';
      
      const response = await fetch(`${API_URL}/api/sections/session/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: source,
          speaker: '新しい話者',
          timestamp: '00:00',
          content: '新しい内容',
          insertPosition: insertPosition
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await onSectionAdded();
          setIsExpanded(false);
        }
      }
    } catch (error) {
      console.error('Failed to insert section:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="my-4">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          + ここにセクションを挿入
        </button>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
          <p className="text-sm text-gray-600 mb-3">挿入するセクションの種類を選択してください：</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => handleInsertSection('NOTTA')}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '追加中...' : 'NOTTAセクションを追加'}
            </button>
            <button
              onClick={() => handleInsertSection('MANUS')}
              disabled={isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '追加中...' : 'MANUSセクションを追加'}
            </button>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
};

export default UnifiedSectionInsertButton;

