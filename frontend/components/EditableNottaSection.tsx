'use client';

import { useState } from 'react';
import SectionDeleteButton from './SectionDeleteButton';

interface Section {
  id: string;
  sectionNumber: string;
  speaker: string;
  timestamp: string;
  endTimestamp?: string | null;
  content: string;
  isExcluded?: boolean;
}

interface EditableNottaSectionProps {
  section: Section;
  onUpdate: (sectionId: string, updates: { speaker?: string; timestamp?: string; endTimestamp?: string | null; content?: string }) => Promise<void>;
  onSectionDeleted: () => void;
}

export default function EditableNottaSection({ section, onUpdate, onSectionDeleted }: EditableNottaSectionProps) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(section.speaker);
  const [editingTimestamp, setEditingTimestamp] = useState(section.timestamp);
  const [editingEndTimestamp, setEditingEndTimestamp] = useState(section.endTimestamp || '');
  const [editingContent, setEditingContent] = useState(section.content);

  // タイムスタンプを分:秒形式にフォーマット
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    
    // 既に分:秒形式の場合はそのまま返す
    if (timestamp.includes(':')) {
      return timestamp;
    }
    
    // 4桁の数字を分:秒形式に変換
    if (timestamp.length === 4 && /^\d{4}$/.test(timestamp)) {
      const minutes = timestamp.slice(0, 2);
      const seconds = timestamp.slice(2, 4);
      return `${minutes}:${seconds}`;
    }
    
    return timestamp;
  };

  // 入力値を数字とコロンのみに制限
  const handleTimestampInput = (value: string, setter: (value: string) => void) => {
    // 数字とコロンのみを許可
    const cleaned = value.replace(/[^\d:]/g, '');
    setter(cleaned);
  };

  // タイムスタンプのフォーカス離脱時の処理
  const handleTimestampBlur = (value: string, setter: (value: string) => void) => {
    const formatted = formatTimestamp(value);
    setter(formatted);
  };

  const handleTimeEdit = async () => {
    if (isEditingTime) {
      try {
        // フォーマットしてから保存
        const formattedTimestamp = formatTimestamp(editingTimestamp);
        const formattedEndTimestamp = editingEndTimestamp ? formatTimestamp(editingEndTimestamp) : null;
        
        await onUpdate(section.id, {
          speaker: editingSpeaker,
          timestamp: formattedTimestamp,
          endTimestamp: formattedEndTimestamp
        });
        setEditingTimestamp(formattedTimestamp);
        setEditingEndTimestamp(formattedEndTimestamp || '');
      } catch (error) {
        console.error('Failed to update time:', error);
        // エラー時は元の値に戻す
        setEditingSpeaker(section.speaker);
        setEditingTimestamp(section.timestamp);
        setEditingEndTimestamp(section.endTimestamp || '');
      }
    }
    setIsEditingTime(!isEditingTime);
  };

  const handleContentEdit = async () => {
    if (isEditingContent) {
      try {
        await onUpdate(section.id, { content: editingContent });
      } catch (error) {
        console.error('Failed to update content:', error);
        // エラー時は元の値に戻す
        setEditingContent(section.content);
      }
    }
    setIsEditingContent(!isEditingContent);
  };

  return (
    <div>
      {isEditingTime ? (
        <div className="space-y-2 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">話者名</label>
            <input
              type="text"
              value={editingSpeaker}
              onChange={(e) => setEditingSpeaker(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="話者名"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">開始時刻</label>
            <input
              type="text"
              value={editingTimestamp}
              onChange={(e) => handleTimestampInput(e.target.value, setEditingTimestamp)}
              onBlur={(e) => handleTimestampBlur(e.target.value, setEditingTimestamp)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="例: 10:30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">終了時刻（任意）</label>
            <input
              type="text"
              value={editingEndTimestamp}
              onChange={(e) => handleTimestampInput(e.target.value, setEditingEndTimestamp)}
              onBlur={(e) => handleTimestampBlur(e.target.value, setEditingEndTimestamp)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="例: 10:45"
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 mb-1">
          {section.speaker} [{formatTimestamp(section.timestamp)}
          {section.endTimestamp ? ` 〜 ${formatTimestamp(section.endTimestamp)}` : ''}]
        </p>
      )}

      {isEditingContent ? (
        <textarea
          value={editingContent}
          onChange={(e) => setEditingContent(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
          placeholder="内容を入力してください"
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap mb-3">{section.content}</p>
      )}

      <div className="flex items-center space-x-2">
        <button
          onClick={handleTimeEdit}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
        >
          {isEditingTime ? '保存' : '時刻編集'}
        </button>
        <button
          onClick={handleContentEdit}
          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
        >
          {isEditingContent ? '保存' : '本文編集'}
        </button>
        <SectionDeleteButton
          sectionId={section.id}
          sectionNumber={section.sectionNumber}
          speaker={section.speaker}
          onSectionDeleted={onSectionDeleted}
        />
      </div>
    </div>
  );
}

