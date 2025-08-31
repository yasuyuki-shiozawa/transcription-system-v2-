'use client';

import React, { useState } from 'react';

// ローカル型定義
type DataSource = 'NOTTA' | 'MANUS';

interface SectionInsertButtonProps {
  sessionId: string;
  source: DataSource;
  insertPosition: number; // 挿入位置（0ベース）
  onSectionAdded: () => void;
}

interface FormData {
  speaker: string;
  timestamp: string;
  endTimestamp: string;
  content: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SectionInsertButton({ 
  sessionId, 
  source, 
  insertPosition, 
  onSectionAdded 
}: SectionInsertButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    speaker: '',
    timestamp: '',
    endTimestamp: '',
    content: ''
  });

  // 既存の時間編集機能と同じ実装を適用
  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'timestamp' | 'endTimestamp') => {
    const value = e.target.value;
    
    // 数字とコロンのみ許可（既存機能と同じ）
    const filtered = value.replace(/[^0-9:]/g, '');
    
    setFormData(prev => ({
      ...prev,
      [field]: filtered
    }));
  };

  // フォーカスが外れた時に時刻をフォーマット（既存機能と同じ）
  const handleTimeBlur = (value: string, field: 'timestamp' | 'endTimestamp') => {
    // 数字のみ抽出
    const numbers = value.replace(/[^\d]/g, '');
    
    if (numbers.length === 0) {
      return;
    }
    
    let formatted = '';
    if (numbers.length <= 4) {
      // MMSS -> MM:SS
      const mm = numbers.slice(0, 2).padStart(2, '0');
      const ss = numbers.slice(2, 4).padStart(2, '0');
      formatted = ss ? `${mm}:${ss}` : mm;
    } else {
      // HHMMSS -> HH:MM:SS
      const hh = numbers.slice(0, 2).padStart(2, '0');
      const mm = numbers.slice(2, 4).padStart(2, '0');
      const ss = numbers.slice(4, 6).padStart(2, '0');
      formatted = ss ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: formatted
    }));
  };

  const handleSubmit = async () => {
    // バリデーション
    if (!formData.speaker.trim() || !formData.timestamp.trim()) {
      alert('話者名と開始時刻は必須です。');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`${API_URL}/api/sections/session/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          speaker: formData.speaker,
          timestamp: formData.timestamp,
          endTimestamp: formData.endTimestamp || null,
          content: formData.content,
          insertPosition: insertPosition
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add section');
      }

      const data = await response.json();
      if (data.success) {
        // フォームをリセット
        setFormData({
          speaker: '',
          timestamp: '',
          endTimestamp: '',
          content: ''
        });
        setShowForm(false);
        // データ更新を強制実行
        console.log('🔄 Calling onSectionAdded to refresh data...');
        await onSectionAdded();
        console.log('✅ Data refresh completed');
      } else {
        throw new Error(data.error || 'Failed to add section');
      }
    } catch (error) {
      console.error('Error adding section:', error);
      alert('セクションの追加に失敗しました。');
    } finally {
      setIsAdding(false);
    }
  };

  const bgColor = source === 'NOTTA' ? 'bg-blue-50 hover:bg-blue-100' : 'bg-green-50 hover:bg-green-100';
  const borderColor = source === 'NOTTA' ? 'border-blue-200' : 'border-green-200';
  const textColor = source === 'NOTTA' ? 'text-blue-700' : 'text-green-700';

  return (
    <div className="my-2">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className={`w-full py-2 px-4 border-2 border-dashed ${borderColor} ${bgColor} ${textColor} rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2`}
        >
          <span className="text-lg">+</span>
          ここに{source}セクションを挿入
        </button>
      ) : (
        <div className={`border-2 ${borderColor} rounded-lg p-4 ${bgColor}`}>
          <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>
            {source}セクションを挿入（位置: {insertPosition + 1}）
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                話者名 *
              </label>
              <input
                type="text"
                value={formData.speaker}
                onChange={(e) => setFormData(prev => ({ ...prev, speaker: e.target.value }))}
                placeholder="例: 市長"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時刻 *
                </label>
                <input
                  type="text"
                  value={formData.timestamp}
                  onChange={(e) => handleTimeInputChange(e, 'timestamp')}
                  onBlur={(e) => handleTimeBlur(e.target.value, 'timestamp')}
                  placeholder="1030 (10分30秒)"
                  title="数字のみ入力（例: 1030 → 10:30）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了時刻
                </label>
                <input
                  type="text"
                  value={formData.endTimestamp}
                  onChange={(e) => handleTimeInputChange(e, 'endTimestamp')}
                  onBlur={(e) => handleTimeBlur(e.target.value, 'endTimestamp')}
                  placeholder="1045 (10分45秒)"
                  title="数字のみ入力（例: 1045 → 10:45）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                内容
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="発言内容を入力..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isAdding}
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={isAdding}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  isAdding 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : source === 'NOTTA' 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isAdding ? '追加中...' : '挿入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

