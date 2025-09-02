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
  yellow: 'rgb(254, 240, 138)',
  blue: 'rgb(147, 197, 253)',
  green: 'rgb(134, 239, 172)',
  pink: 'rgb(249, 168, 212)',
  orange: 'rgb(253, 186, 116)'
};

export default function HighlightedText({ text, highlights, onHighlightClick }: HighlightedTextProps) {
  if (!highlights || highlights.length === 0) {
    return <span>{text}</span>;
  }

  // ハイライトを開始位置でソート
  const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

  // 重複するハイライトを処理するため、テキストを分割
  const segments: Array<{
    text: string;
    highlights: Highlight[];
    start: number;
    end: number;
  }> = [];

  // 全ての位置を収集してソート
  const positions = new Set<number>();
  positions.add(0);
  positions.add(text.length);
  
  sortedHighlights.forEach(highlight => {
    positions.add(highlight.startOffset);
    positions.add(highlight.endOffset);
  });

  const sortedPositions = Array.from(positions).sort((a, b) => a - b);

  // セグメントを作成
  for (let i = 0; i < sortedPositions.length - 1; i++) {
    const start = sortedPositions[i];
    const end = sortedPositions[i + 1];
    
    if (start < end && start < text.length) {
      const segmentText = text.slice(start, end);
      const segmentHighlights = sortedHighlights.filter(
        h => h.startOffset <= start && h.endOffset >= end
      );

      segments.push({
        text: segmentText,
        highlights: segmentHighlights,
        start,
        end
      });
    }
  }

  return (
    <span>
      {segments.map((segment, index) => {
        if (segment.highlights.length === 0) {
          return <span key={index}>{segment.text}</span>;
        }

        // 最初のハイライト色を使用（複数ある場合）
        const primaryHighlight = segment.highlights[0];
        const backgroundColor = colorMap[primaryHighlight.color];

        return (
          <span
            key={index}
            style={{ 
              backgroundColor,
              cursor: 'pointer',
              borderRadius: '2px',
              padding: '0 2px'
            }}
            onClick={() => onHighlightClick?.(primaryHighlight)}
            title={`ハイライト: ${primaryHighlight.color} (クリックで削除)`}
          >
            {segment.text}
          </span>
        );
      })}
    </span>
  );
}

