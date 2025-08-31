'use client';

import React from 'react';

interface HighlightToolbarProps {
  onColorSelect: (color: string) => void;
  onDeleteAll: () => void;
  selectedText: string;
  isVisible: boolean;
}

const HIGHLIGHT_COLORS = [
  { name: 'yellow', label: '黄色', color: '#fef08a', emoji: '🟡' },
  { name: 'blue', label: '青色', color: '#93c5fd', emoji: '🔵' },
  { name: 'green', label: '緑色', color: '#86efac', emoji: '🟢' },
  { name: 'pink', label: 'ピンク', color: '#f9a8d4', emoji: '🩷' },
  { name: 'orange', label: 'オレンジ', color: '#fdba74', emoji: '🟠' }
];

export default function HighlightToolbar({ 
  onColorSelect, 
  onDeleteAll, 
  selectedText, 
  isVisible 
}: HighlightToolbarProps) {
  if (!isVisible) return null;

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">ハイライト機能</h3>
        <button
          onClick={onDeleteAll}
          className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
          title="全てのハイライトを削除"
        >
          全削除
        </button>
      </div>
      
      {selectedText && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
          選択中: "{selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText}"
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 mr-2">色を選択:</span>
        {HIGHLIGHT_COLORS.map((colorOption) => (
          <button
            key={colorOption.name}
            onClick={() => onColorSelect(colorOption.name)}
            className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-500 transition-colors flex items-center justify-center text-lg hover:scale-110 transform"
            style={{ backgroundColor: colorOption.color }}
            title={`${colorOption.label}でハイライト`}
          >
            {colorOption.emoji}
          </button>
        ))}
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        💡 テキストを選択してから色を選んでください
      </div>
    </div>
  );
}

