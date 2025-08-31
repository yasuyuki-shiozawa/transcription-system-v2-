'use client';

import React, { useState, useRef, useCallback } from 'react';
import HighlightedText from './HighlightedText';

interface Highlight {
  id: string;
  startOffset: number;
  endOffset: number;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange';
  text: string;
}

interface HighlightEditorProps {
  text: string;
  highlights: Highlight[];
  onHighlightCreate: (startOffset: number, endOffset: number, color: string, text: string) => void;
  onHighlightDelete: (highlightId: string) => void;
  isEditing: boolean;
}

const colorOptions = [
  { value: 'yellow', label: '🟡 黄色', bgClass: 'bg-yellow-200' },
  { value: 'blue', label: '🔵 青色', bgClass: 'bg-blue-200' },
  { value: 'green', label: '🟢 緑色', bgClass: 'bg-green-200' },
  { value: 'pink', label: '🩷 ピンク', bgClass: 'bg-pink-200' },
  { value: 'orange', label: '🟠 オレンジ', bgClass: 'bg-orange-200' }
];

export default function HighlightEditor({
  text,
  highlights,
  onHighlightCreate,
  onHighlightDelete,
  isEditing
}: HighlightEditorProps) {
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [palettePosition, setPalettePosition] = useState({ x: 0, y: 0 });
  const textRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = useCallback(() => {
    if (!isEditing) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();

    if (selectedText.length === 0) {
      setShowColorPalette(false);
      return;
    }

    // テキストコンテナ内での選択かチェック
    if (!textRef.current?.contains(range.commonAncestorContainer)) {
      return;
    }

    // テキスト内での位置を計算
    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(textRef.current);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = beforeRange.toString().length;
    const endOffset = startOffset + selectedText.length;

    // 選択範囲を保存
    setSelectedRange({
      start: startOffset,
      end: endOffset,
      text: selectedText
    });

    // カラーパレットの位置を計算
    const rect = range.getBoundingClientRect();
    const containerRect = textRef.current.getBoundingClientRect();
    
    setPalettePosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.bottom - containerRect.top + 5
    });

    setShowColorPalette(true);
  }, [isEditing]);

  const handleColorSelect = useCallback((color: string) => {
    if (!selectedRange) return;

    onHighlightCreate(
      selectedRange.start,
      selectedRange.end,
      color,
      selectedRange.text
    );

    setShowColorPalette(false);
    setSelectedRange(null);
    
    // 選択を解除
    window.getSelection()?.removeAllRanges();
  }, [selectedRange, onHighlightCreate]);

  const handleHighlightClick = useCallback((highlight: Highlight) => {
    if (!isEditing) return;

    if (window.confirm(`「${highlight.text}」のハイライトを削除しますか？`)) {
      onHighlightDelete(highlight.id);
    }
  }, [isEditing, onHighlightDelete]);

  const handleClickOutside = useCallback(() => {
    setShowColorPalette(false);
    setSelectedRange(null);
  }, []);

  return (
    <div className="relative">
      <div
        ref={textRef}
        className={`whitespace-pre-wrap ${isEditing ? 'select-text cursor-text' : 'select-none'}`}
        onMouseUp={handleTextSelection}
        onClick={handleClickOutside}
      >
        <HighlightedText
          text={text}
          highlights={highlights}
          onHighlightClick={handleHighlightClick}
        />
      </div>

      {/* カラーパレット */}
      {showColorPalette && selectedRange && (
        <div
          className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex gap-1"
          style={{
            left: `${palettePosition.x}px`,
            top: `${palettePosition.y}px`,
            transform: 'translateX(-50%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {colorOptions.map((option) => (
            <button
              key={option.value}
              className={`${option.bgClass} hover:opacity-80 border border-gray-300 rounded px-2 py-1 text-xs font-medium transition-opacity`}
              onClick={() => handleColorSelect(option.value)}
              title={option.label}
            >
              {option.label.split(' ')[0]}
            </button>
          ))}
          <button
            className="bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded px-2 py-1 text-xs font-medium transition-colors"
            onClick={() => setShowColorPalette(false)}
            title="キャンセル"
          >
            ❌
          </button>
        </div>
      )}

      {/* 編集モード時のヘルプテキスト */}
      {isEditing && (
        <div className="mt-2 text-xs text-gray-500">
          💡 テキストを選択してハイライトを追加できます。既存のハイライトをクリックすると削除できます。
        </div>
      )}
    </div>
  );
}

