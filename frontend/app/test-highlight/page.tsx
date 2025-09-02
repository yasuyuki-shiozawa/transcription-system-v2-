'use client';

import React, { useState } from 'react';
import HighlightedText from '../../components/HighlightedText';

interface Highlight {
  id: string;
  startOffset: number;
  endOffset: number;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange';
  text: string;
}

export default function TestHighlightPage() {
  const [highlights, setHighlights] = useState<Highlight[]>([
    {
      id: '1',
      startOffset: 10,
      endOffset: 20,
      color: 'yellow',
      text: 'ハイライト機能'
    },
    {
      id: '2',
      startOffset: 30,
      endOffset: 40,
      color: 'blue',
      text: 'テストです'
    },
    {
      id: '3',
      startOffset: 50,
      endOffset: 65,
      color: 'green',
      text: '正しく表示される'
    }
  ]);

  const testText = "これはハイライト機能のテストです。この文章の一部を正しく表示されるかを確認します。黄色、青色、緑色、ピンク色、オレンジ色の5つの色を使用できます。";

  const handleHighlightClick = (highlight: Highlight) => {
    console.log('ハイライトクリック:', highlight);
    // ハイライトを削除
    setHighlights(prev => prev.filter(h => h.id !== highlight.id));
  };

  const addHighlight = (color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange') => {
    const newHighlight: Highlight = {
      id: Date.now().toString(),
      startOffset: Math.floor(Math.random() * 50),
      endOffset: Math.floor(Math.random() * 50) + 50,
      color,
      text: testText.slice(Math.floor(Math.random() * 50), Math.floor(Math.random() * 50) + 50)
    };
    setHighlights(prev => [...prev, newHighlight]);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">ハイライト機能テスト</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">ハイライト追加</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => addHighlight('yellow')}
            className="px-3 py-1 bg-yellow-300 rounded"
          >
            🟡 黄色
          </button>
          <button 
            onClick={() => addHighlight('blue')}
            className="px-3 py-1 bg-blue-300 rounded"
          >
            🔵 青色
          </button>
          <button 
            onClick={() => addHighlight('green')}
            className="px-3 py-1 bg-green-300 rounded"
          >
            🟢 緑色
          </button>
          <button 
            onClick={() => addHighlight('pink')}
            className="px-3 py-1 bg-pink-300 rounded"
          >
            🩷 ピンク色
          </button>
          <button 
            onClick={() => addHighlight('orange')}
            className="px-3 py-1 bg-orange-300 rounded"
          >
            🟠 オレンジ色
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">現在のハイライト</h2>
        <div className="bg-gray-100 p-4 rounded">
          {highlights.map(h => (
            <div key={h.id} className="mb-2">
              <span className="font-mono text-sm">
                ID: {h.id}, 位置: {h.startOffset}-{h.endOffset}, 色: {h.color}, テキスト: "{h.text}"
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">ハイライト表示テスト</h2>
        <div className="bg-white p-4 border rounded">
          <HighlightedText
            text={testText}
            highlights={highlights}
            onHighlightClick={handleHighlightClick}
          />
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>※ ハイライトをクリックすると削除されます</p>
        <p>※ コンソールでデバッグログを確認してください</p>
      </div>
    </div>
  );
}

