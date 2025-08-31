'use client';

import React, { useEffect, useState } from 'react';

interface HighlightPopupProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'yellow', label: '黄色', color: '#fef08a', emoji: '🟡' },
  { name: 'blue', label: '青色', color: '#93c5fd', emoji: '🔵' },
  { name: 'green', label: '緑色', color: '#86efac', emoji: '🟢' },
  { name: 'pink', label: 'ピンク', color: '#f9a8d4', emoji: '🩷' },
  { name: 'orange', label: 'オレンジ', color: '#fdba74', emoji: '🟠' }
];

export default function HighlightPopup({ 
  isVisible, 
  position, 
  onColorSelect, 
  onClose 
}: HighlightPopupProps) {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (isVisible) {
      // ポップアップが画面外に出ないように位置を調整
      const popup = document.getElementById('highlight-popup');
      if (popup) {
        const rect = popup.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let newX = position.x;
        let newY = position.y;
        
        // 右端チェック
        if (position.x + rect.width > viewportWidth) {
          newX = viewportWidth - rect.width - 10;
        }
        
        // 下端チェック
        if (position.y + rect.height > viewportHeight) {
          newY = position.y - rect.height - 10;
        }
        
        setAdjustedPosition({ x: newX, y: newY });
      }
    }
  }, [isVisible, position]);

  if (!isVisible) return null;

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  return (
    <>
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* ポップアップ */}
      <div
        id="highlight-popup"
        className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-3"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }}
      >
        <div className="text-xs text-gray-600 mb-2 text-center">
          ハイライト色を選択
        </div>
        
        <div className="flex items-center gap-2">
          {HIGHLIGHT_COLORS.map((colorOption) => (
            <button
              key={colorOption.name}
              onClick={() => handleColorSelect(colorOption.name)}
              className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-500 transition-all flex items-center justify-center text-lg hover:scale-110 transform"
              style={{ backgroundColor: colorOption.color }}
              title={`${colorOption.label}でハイライト`}
            >
              {colorOption.emoji}
            </button>
          ))}
        </div>
        
        <div className="mt-2 text-center">
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            キャンセル
          </button>
        </div>
      </div>
    </>
  );
}

