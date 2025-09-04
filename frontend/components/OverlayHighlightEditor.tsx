'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Highlight {
  id: string;
  startOffset: number;
  endOffset: number;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange';
  text: string;
}

interface OverlayHighlightEditorProps {
  text: string;
  highlights: Highlight[];
  onTextChange: (text: string) => void;
  onHighlightCreate: (startOffset: number, endOffset: number, color: string, text: string) => void;
  onHighlightDelete: (highlightId: string) => void;
}

const colorMap = {
  yellow: 'rgba(255, 255, 0, 0.3)',
  blue: 'rgba(0, 123, 255, 0.3)',
  green: 'rgba(40, 167, 69, 0.3)',
  pink: 'rgba(232, 62, 140, 0.3)',
  orange: 'rgba(253, 126, 20, 0.3)'
};

export default function OverlayHighlightEditor({
  text,
  highlights,
  onTextChange,
  onHighlightCreate,
  onHighlightDelete
}: OverlayHighlightEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [previousText, setPreviousText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // テキスト変更時のハイライト位置調整
  const adjustHighlightPositions = useCallback((oldText: string, newText: string) => {
    if (oldText === newText) return;

    // 簡単な位置調整ロジック
    // より複雑な調整が必要な場合は、diff アルゴリズムを使用
    const oldLength = oldText.length;
    const newLength = newText.length;
    const lengthDiff = newLength - oldLength;

    if (lengthDiff === 0) return; // 長さが変わらない場合は調整不要

    // カーソル位置を取得
    const cursorPosition = textareaRef.current?.selectionStart || 0;

    // カーソル位置より後のハイライトの位置を調整
    highlights.forEach(highlight => {
      if (highlight.startOffset >= cursorPosition) {
        // ハイライトがカーソル位置より後にある場合、位置を調整
        const newStartOffset = Math.max(0, highlight.startOffset + lengthDiff);
        const newEndOffset = Math.max(newStartOffset, highlight.endOffset + lengthDiff);
        
        // 新しいテキスト範囲内に収まるように調整
        if (newEndOffset <= newText.length) {
          // 位置が有効な場合のみ更新（実際の更新は親コンポーネントで行う）
          // ここでは調整が必要であることを示すだけ
        }
      }
    });
  }, [highlights]);

  // テキスト変更ハンドラー
  const handleTextChange = useCallback((newText: string) => {
    adjustHighlightPositions(previousText, newText);
    setPreviousText(newText);
    onTextChange(newText);
  }, [previousText, adjustHighlightPositions, onTextChange]);

  // テキストエリアとオーバーレイのスタイルを同期
  const syncStyles = useCallback(() => {
    if (!textareaRef.current || !overlayRef.current) return;

    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    
    // スタイルをコピー
    const computedStyle = window.getComputedStyle(textarea);
    overlay.style.fontSize = computedStyle.fontSize;
    overlay.style.fontFamily = computedStyle.fontFamily;
    overlay.style.lineHeight = computedStyle.lineHeight;
    overlay.style.padding = computedStyle.padding;
    overlay.style.border = computedStyle.border;
    overlay.style.borderColor = 'transparent'; // ボーダーは透明に
  }, []);

  // ハイライト位置を計算してオーバーレイに表示
  const renderHighlightOverlay = useCallback(() => {
    if (!textareaRef.current || !overlayRef.current) return;

    const textarea = textareaRef.current;
    const overlay = overlayRef.current;

    // オーバーレイをクリア
    overlay.innerHTML = '';

    // テキストを文字ごとに分割してハイライトを適用
    const textContent = text;
    let currentIndex = 0;
    const elements: string[] = [];

    // ハイライトを開始位置でソート
    const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

    for (let i = 0; i < textContent.length; i++) {
      const char = textContent[i];
      
      // この位置にハイライトがあるかチェック
      const highlight = sortedHighlights.find(h => 
        i >= h.startOffset && i < h.endOffset
      );

      if (highlight) {
        const backgroundColor = colorMap[highlight.color];
        const isFirstChar = i === highlight.startOffset;
        const isLastChar = i === highlight.endOffset - 1;
        
        elements.push(
          `<span 
            style="background-color: ${backgroundColor}; cursor: pointer;" 
            data-highlight-id="${highlight.id}"
            title="クリックで削除: ${highlight.text.substring(0, 30)}${highlight.text.length > 30 ? '...' : ''}"
            ${isFirstChar ? 'data-highlight-start="true"' : ''}
            ${isLastChar ? 'data-highlight-end="true"' : ''}
          >${char === '\n' ? '<br>' : char}</span>`
        );
      } else {
        elements.push(char === '\n' ? '<br>' : char);
      }
    }

    overlay.innerHTML = elements.join('');
    
    // ハイライトクリックイベントを追加
    overlay.querySelectorAll('[data-highlight-id]').forEach(element => {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const highlightId = (e.target as HTMLElement).getAttribute('data-highlight-id');
        if (highlightId) {
          const highlight = highlights.find(h => h.id === highlightId);
          if (highlight && window.confirm(`「${highlight.text}」のハイライトを削除しますか？`)) {
            onHighlightDelete(highlightId);
          }
        }
      });
    });
    
    // スクロール位置を同期
    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  }, [text, highlights, onHighlightDelete]);

  // テキスト選択の処理
  const handleTextSelection = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      setShowColorPicker(false);
      setSelectedRange(null);
      return;
    }

    const selectedText = text.substring(start, end);
    setSelectedRange({ start, end, text: selectedText });

    // カラーピッカーの位置を計算
    const rect = textarea.getBoundingClientRect();
    setPickerPosition({
      x: rect.left + (rect.width / 2) - 150,
      y: rect.top - 60
    });

    setShowColorPicker(true);
  }, [text]);

  // カラー選択の処理
  const handleColorSelect = useCallback((color: string) => {
    if (!selectedRange) return;

    onHighlightCreate(
      selectedRange.start,
      selectedRange.end,
      color,
      selectedRange.text
    );

    setShowColorPicker(false);
    setSelectedRange(null);
    
    // 選択を解除
    if (textareaRef.current) {
      textareaRef.current.setSelectionRange(selectedRange.end, selectedRange.end);
    }
  }, [selectedRange, onHighlightCreate]);

  // スクロール同期
  const handleScroll = useCallback(() => {
    if (!textareaRef.current || !overlayRef.current) return;
    
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    
    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  }, []);

  // エフェクト
  useEffect(() => {
    syncStyles();
    renderHighlightOverlay();
  }, [syncStyles, renderHighlightOverlay]);

  useEffect(() => {
    setPreviousText(text);
  }, [text]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="relative">
      {/* ハイライト表示用オーバーレイ */}
      <div
        ref={overlayRef}
        className="absolute inset-0 overflow-hidden whitespace-pre-wrap break-words z-10"
        style={{
          color: 'transparent',
          backgroundColor: 'transparent',
          resize: 'none',
          pointerEvents: 'auto' // ハイライトクリックを有効にする
        }}
      />
      
      {/* テキストエリア */}
      <textarea
        ref={textareaRef}
        className="relative w-full h-64 p-3 border border-gray-300 rounded-lg resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent z-20"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onMouseUp={handleTextSelection}
        onKeyUp={handleTextSelection}
        placeholder="本文を編集してください..."
        style={{ backgroundColor: 'transparent' }}
      />

      {/* カラーピッカーポップアップ */}
      {showColorPicker && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2"
          style={{
            left: pickerPosition.x,
            top: pickerPosition.y
          }}
        >
          <div className="flex gap-2 mb-2">
            {Object.keys(colorMap).map((color) => (
              <button
                key={color}
                className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                style={{ backgroundColor: colorMap[color as keyof typeof colorMap] }}
                onClick={() => handleColorSelect(color)}
                title={`${color}でハイライト`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-600 text-center">
            選択: "{selectedRange?.text.substring(0, 20)}{(selectedRange?.text.length || 0) > 20 ? '...' : ''}"
          </div>
          <button
            className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700"
            onClick={() => setShowColorPicker(false)}
          >
            キャンセル
          </button>
        </div>
      )}

      {/* ヘルプテキスト */}
      <div className="mt-2 text-xs text-gray-500">
        💡 テキストを選択してハイライト色を選んでください。ハイライトされた部分は背景色で表示されます。
      </div>
    </div>
  );
}

