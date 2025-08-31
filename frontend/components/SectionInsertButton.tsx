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

  const formatTimeInput = (value: string) => {
    // デバッグログ追加
    console.log('formatTimeInput called with:', value);
    
    // 完全に新しいロジック: 数字のみを抽出
    const cleanValue = value.replace(/[^0-9]/g, '');
    console.log('cleanValue:', cleanValue);
    
    if (!cleanValue) return '';
    
    // 4桁未満の場合はそのまま返す
    if (cleanValue.length < 3) return cleanValue;
    
    // 4桁の場合: MMSS -> MM:SS (分:秒) - 完全新規実装
    if (cleanValue.length <= 4) {
      // 4桁に0埋め
      const fourDigits = cleanValue.padStart(4, '0');
      console.log('fourDigits:', fourDigits);
      
      // 分と秒を抽出
      const mm = fourDigits.substring(0, 2);
      const ss = fourDigits.substring(2, 4);
      console.log('mm:', mm, 'ss:', ss);
      
      const result = `${mm}:${ss}`;
      console.log('result:', result);
      return result;
    }
    
    // 6桁の場合: HHMMSS -> MM:SS (時間は無視、分:秒のみ)
    const mm = cleanValue.substring(2, 4);
    const ss = cleanValue.substring(4, 6);
    const result = `${mm}:${ss}`;
    console.log('6-digit result:', result);
    return result;
  };

  const handleTimeChange = (field: 'timestamp' | 'endTimestamp', value: string) => {
    // デバッグログ追加
    console.log('handleTimeChange called with field:', field, 'value:', value);
    
    // 既存のフォーマット済み値を削除して生の数字のみを抽出
    const rawNumbers = value.replace(/[^0-9]/g, '');
    console.log('rawNumbers extracted:', rawNumbers);
    
    // 生の数字のみをformatTimeInputに渡す
    const formatted = formatTimeInput(rawNumbers);
    console.log('formatted result:', formatted);
    
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
                  onChange={(e) => handleTimeChange('timestamp', e.target.value)}
                  placeholder="1030 (10分30秒)"
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
                  onChange={(e) => handleTimeChange('endTimestamp', e.target.value)}
                  placeholder="1045 (10分45秒)"
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

