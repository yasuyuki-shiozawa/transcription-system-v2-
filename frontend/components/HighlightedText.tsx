'use client';

import React from 'react';

interface Highlight {
  id: string;
  startOffset: number;
  endOffset: number;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange';
  text: string;
}

interface HighlightedTextProps {
  text: string;
  highlights: Highlight[];
  onHighlightClick?: (highlight: Highlight) => void;
}

const colorMap = {
  yellow: 'rgb(255, 235, 59)',    // より濃い黄色
  blue: 'rgb(33, 150, 243)',      // より濃い青色
  green: 'rgb(76, 175, 80)',      // より濃い緑色
  pink: 'rgb(233, 30, 99)',       // より濃いピンク色
  orange: 'rgb(255, 152, 0)'      // より濃いオレンジ色
};

export default function HighlightedText({ text, highlights, onHighlightClick }: HighlightedTextProps) {
  console.log('🎨 HighlightedText レンダリング:', { 
    textLength: text.length, 
    highlightsCount: highlights?.length || 0,
    highlights: highlights 
  });

  // テキストまたはハイライトが空の場合
  if (!text) {
    console.log('❌ テキストが空です');
    return <span></span>;
  }

  if (!highlights || highlights.length === 0) {
    console.log('📝 ハイライトなしでテキストを表示');
    return <span>{text}</span>;
  }

  // ハイライトを開始位置でソート
  const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
  console.log('📊 ソート済みハイライト:', sortedHighlights);

  // テキストを部分に分割
  const parts: Array<{
    text: string;
    isHighlight: boolean;
    highlight?: Highlight;
  }> = [];

  let lastIndex = 0;

  sortedHighlights.forEach((highlight, index) => {
    console.log(`🔍 ハイライト ${index + 1}:`, {
      id: highlight.id,
      text: highlight.text,
      color: highlight.color,
      startOffset: highlight.startOffset,
      endOffset: highlight.endOffset
    });

    // ハイライト前のテキスト
    if (highlight.startOffset > lastIndex) {
      const beforeText = text.slice(lastIndex, highlight.startOffset);
      if (beforeText) {
        parts.push({
          text: beforeText,
          isHighlight: false
        });
        console.log(`📝 通常テキスト追加: "${beforeText.substring(0, 20)}..."`);
      }
    }

    // ハイライト部分
    const highlightText = text.slice(highlight.startOffset, highlight.endOffset);
    if (highlightText) {
      parts.push({
        text: highlightText,
        isHighlight: true,
        highlight: highlight
      });
      console.log(`🎨 ハイライト追加: "${highlightText}" (${highlight.color})`);
    }

    lastIndex = highlight.endOffset;
  });

  // 最後の部分
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      parts.push({
        text: remainingText,
        isHighlight: false
      });
      console.log(`📝 最終テキスト追加: "${remainingText.substring(0, 20)}..."`);
    }
  }

  console.log(`✅ 分割完了: ${parts.length}個の部分`);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.isHighlight && part.highlight) {
          const backgroundColor = colorMap[part.highlight.color];
          console.log(`🎨 ハイライト要素レンダリング: "${part.text}" - 色: ${backgroundColor}`);
          
          return (
            <span
              key={`highlight-${part.highlight.id}-${index}`}
              style={{ 
                backgroundColor,
                cursor: onHighlightClick ? 'pointer' : 'default',
                borderRadius: '2px',
                padding: '0 1px'
              }}
              onClick={() => {
                console.log('🖱️ ハイライトクリック:', part.highlight);
                onHighlightClick?.(part.highlight!);
              }}
              title={`ハイライト: ${part.highlight.color} ${onHighlightClick ? '(クリックで削除)' : ''}`}
            >
              {part.text}
            </span>
          );
        } else {
          console.log(`📝 通常テキストレンダリング: "${part.text.substring(0, 20)}..."`);
          return (
            <span key={`text-${index}`}>
              {part.text}
            </span>
          );
        }
      })}
    </span>
  );
}

