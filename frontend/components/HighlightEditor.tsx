'use client';

import React, { useState, useRef, useCallback } from 'react';
import HighlightedText from './HighlightedText';
import HighlightToolbar from './HighlightToolbar';
import HighlightPopup from './HighlightPopup';

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
  const [showPopup, setShowPopup] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const textRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextSelection = useCallback(() => {
    if (!isEditing) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowPopup(false);
      setSelectedRange(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();

    if (selectedText.length === 0) {
      setShowPopup(false);
      setSelectedRange(null);
      return;
    }

    // テキストエリア内での選択の場合
    if (textareaRef.current && document.activeElement === textareaRef.current) {
      const startOffset = textareaRef.current.selectionStart || 0;
      const endOffset = textareaRef.current.selectionEnd || 0;
      
      setSelectedRange({
        start: startOffset,
        end: endOffset,
        text: selectedText
      });

      // ポップアップの位置を計算
      const rect = textareaRef.current.getBoundingClientRect();
      setPopupPosition({
        x: rect.left + (rect.width / 2) - 100, // ポップアップを中央寄せ
        y: rect.top - 60 // テキストエリアの上に表示
      });
      
      setShowPopup(true);
      return;
    }

    // 表示モードでの選択の場合
    if (textRef.current?.contains(range.commonAncestorContainer)) {
      const beforeRange = range.cloneRange();
      beforeRange.selectNodeContents(textRef.current);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = beforeRange.toString().length;
      const endOffset = startOffset + selectedText.length;

      setSelectedRange({
        start: startOffset,
        end: endOffset,
        text: selectedText
      });

      // ポップアップの位置を計算
      const rect = range.getBoundingClientRect();
    
      setPopupPosition({
        x: rect.left + rect.width / 2 - 100,
        y: rect.bottom + 5
      });

      setShowPopup(true);
    }
  }, [isEditing]);

  const handleColorSelect = useCallback((color: string) => {
    if (!selectedRange) return;

    onHighlightCreate(
      selectedRange.start,
      selectedRange.end,
      color,
      selectedRange.text
    );

    setShowPopup(false);
    setSelectedRange(null);
    
    // 選択を解除
    window.getSelection()?.removeAllRanges();
  }, [selectedRange, onHighlightCreate]);

  const handleDeleteAll = useCallback(() => {
    if (highlights.length === 0) return;
    
    if (window.confirm('全てのハイライトを削除しますか？')) {
      highlights.forEach(highlight => {
        onHighlightDelete(highlight.id);
      });
    }
  }, [highlights, onHighlightDelete]);

  const handleHighlightClick = useCallback((highlight: Highlight) => {
    if (!isEditing) return;

    if (window.confirm(`「${highlight.text}」のハイライトを削除しますか？`)) {
      onHighlightDelete(highlight.id);
    }
  }, [isEditing, onHighlightDelete]);

  const handlePopupClose = useCallback(() => {
    setShowPopup(false);
    setSelectedRange(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // 編集モードの場合はテキストエリアとツールバーを表示
  if (isEditing) {
    return (
      <div className="relative">
        <HighlightToolbar
          onColorSelect={handleColorSelect}
          onDeleteAll={handleDeleteAll}
          selectedText={selectedRange?.text || ''}
          isVisible={true}
        />
        
        <textarea
          ref={textareaRef}
          className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-vertical"
          value={text}
          onMouseUp={handleTextSelection}
          onKeyUp={handleTextSelection}
          readOnly
        />
        
        <HighlightPopup
          isVisible={showPopup}
          position={popupPosition}
          onColorSelect={handleColorSelect}
          onClose={handlePopupClose}
        />
        
        <div className="mt-2 text-xs text-gray-500">
          💡 テキストを選択してハイライトを追加できます。既存のハイライトをクリックすると削除できます。
        </div>
      </div>
    );
  }

  // 表示モードの場合はハイライト付きテキストを表示
  return (
    <div className="relative">
      <div
        ref={textRef}
        className="whitespace-pre-wrap select-text"
        onMouseUp={handleTextSelection}
      >
        <HighlightedText
          text={text}
          highlights={highlights}
          onHighlightClick={handleHighlightClick}
        />
      </div>

      <HighlightPopup
        isVisible={showPopup}
        position={popupPosition}
        onColorSelect={handleColorSelect}
        onClose={handlePopupClose}
      />
    </div>
  );
}

