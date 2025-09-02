'use client';

import { useState, useEffect, useCallback } from 'react';
import SectionDeleteButton from './SectionDeleteButton';
import HighlightEditor from './HighlightEditor';
import HighlightedText from './HighlightedText';

interface Highlight {
  id: string;
  startOffset: number;
  endOffset: number;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange';
  text: string;
}

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
  
  // ハイライト関連の状態
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // API URL - 環境変数を使用
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  console.log('🔗 EditableNottaSection API_URL:', API_URL);

  // ハイライト一覧を取得
  const fetchHighlights = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/highlights/section/${section.id}`);
      const data = await response.json();
      if (data.success) {
        setHighlights(data.data);
      }
    } catch (error) {
      console.error('Error fetching highlights:', error);
    }
  }, [API_URL, section.id]);

  // ハイライト作成
  const handleHighlightCreate = async (startOffset: number, endOffset: number, color: string, text: string) => {
    try {
      const response = await fetch(`${API_URL}/api/highlights/section/${section.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startOffset,
          endOffset,
          color,
          text
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setHighlights(prev => [...prev, data.data]);
      } else {
        alert('ハイライトの作成に失敗しました: ' + data.message);
      }
    } catch (error) {
      console.error('Error creating highlight:', error);
      alert('ハイライトの作成中にエラーが発生しました');
    }
  };

  // ハイライト削除
  const handleHighlightDelete = async (highlight: Highlight) => {
    try {
      const response = await fetch(`${API_URL}/api/highlights/${highlight.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        setHighlights(prev => prev.filter(h => h.id !== highlight.id));
      } else {
        alert('ハイライトの削除に失敗しました: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting highlight:', error);
      alert('ハイライトの削除中にエラーが発生しました');
    }
  };

  // コンポーネントマウント時にハイライトを取得
  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

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
        <div className="space-y-2">
          <div className="mb-4">
            <HighlightEditor
              text={editingContent}
              highlights={highlights}
              onHighlightCreate={handleHighlightCreate}
              onHighlightDelete={(highlightId: string) => {
                const highlight = highlights.find(h => h.id === highlightId);
                if (highlight) {
                  handleHighlightDelete(highlight);
                }
              }}
              isEditing={true}
            />
          </div>
          <textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
            placeholder="内容を入力してください"
          />
        </div>
      ) : (
        <div className="mb-3">
          <HighlightedText
            text={section.content}
            highlights={highlights}
            onHighlightClick={handleHighlightDelete}
          />
        </div>
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

