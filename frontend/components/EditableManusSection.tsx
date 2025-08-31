'use client';

import { useState, useEffect, useCallback } from 'react';
import SectionDeleteButton from './SectionDeleteButton';
import HighlightEditor from './HighlightEditor';

// DEBUG: Console log at component load
console.log('=== EDITABLE MANUS SECTION COMPONENT LOADED ===', new Date().toISOString());

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

interface EditableManusSectonProps {
  section: Section;
  onUpdate: (sectionId: string, updates: { speaker?: string; timestamp?: string; endTimestamp?: string | null; content?: string }) => Promise<void>;
  isIncluded?: boolean;
  onToggleInclude?: (sectionId: string) => void;
  showWarning?: boolean;
  onSectionDeleted?: () => void;
}

export default function EditableManusSection({ section, onUpdate, isIncluded = false, onToggleInclude, showWarning = false, onSectionDeleted }: EditableManusSectonProps) {
  console.log(`📝 EditableManusSection for ${section.id}:`, { isIncluded, sectionNumber: section.sectionNumber });
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedSpeaker, setEditedSpeaker] = useState(section.speaker);
  const [editedTimestamp, setEditedTimestamp] = useState(section.timestamp);
  const [editedEndTimestamp, setEditedEndTimestamp] = useState(section.endTimestamp || '');
  const [editedContent, setEditedContent] = useState(section.content);
  const [isSaving, setIsSaving] = useState(false);
  
  // ハイライト関連の状態
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // API URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://transcription-system-1.onrender.com';

  // ハイライト一覧を取得
  const fetchHighlights = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/sections/${section.id}/highlights`);
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
      const response = await fetch(`${API_URL}/api/sections/${section.id}/highlights`, {
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
  const handleHighlightDelete = async (highlightId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/highlights/${highlightId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        setHighlights(prev => prev.filter(h => h.id !== highlightId));
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
  }, [section.id]);

  // 時刻入力のハンドラー（シンプルなアプローチ）
  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    const value = e.target.value;
    
    // 数字とコロンのみ許可
    const filtered = value.replace(/[^0-9:]/g, '');
    setter(filtered);
  };

  // フォーカスが外れた時に時刻をフォーマット
  const handleTimeBlur = (value: string, setter: (value: string) => void) => {
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
    
    setter(formatted);
  };

  // 時刻を秒数に変換する関数
  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS形式
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS形式
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  // セクションの長さ（秒）を計算
  const calculateDuration = (): number => {
    if (!editedEndTimestamp) return 0;
    const start = timeToSeconds(section.timestamp);
    const end = timeToSeconds(editedEndTimestamp);
    return Math.max(0, end - start);
  };

  const handleSaveTime = async () => {
    if (editedSpeaker === section.speaker && 
        editedTimestamp === section.timestamp && 
        editedEndTimestamp === (section.endTimestamp || '')) {
      setIsEditingTime(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(section.id, {
        speaker: editedSpeaker !== section.speaker ? editedSpeaker : undefined,
        timestamp: editedTimestamp !== section.timestamp ? editedTimestamp : undefined,
        endTimestamp: editedEndTimestamp !== (section.endTimestamp || '') ? (editedEndTimestamp || null) : undefined,
      });
      setIsEditingTime(false);
    } catch (error) {
      console.error('Failed to update section:', error);
      // Reset values on error
      setEditedSpeaker(section.speaker);
      setEditedTimestamp(section.timestamp);
      setEditedEndTimestamp(section.endTimestamp || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContent = async () => {
    if (editedContent === section.content) {
      setIsEditingContent(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(section.id, {
        content: editedContent,
      });
      setIsEditingContent(false);
    } catch (error) {
      console.error('Failed to update content:', error);
      // Reset value on error
      setEditedContent(section.content);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelTime = () => {
    setEditedSpeaker(section.speaker);
    setEditedTimestamp(section.timestamp);
    setEditedEndTimestamp(section.endTimestamp || '');
    setIsEditingTime(false);
  };

  const handleCancelContent = () => {
    setEditedContent(section.content);
    setIsEditingContent(false);
  };

  // 時刻編集モード
  if (isEditingTime) {
    return (
      <div>
        <div className="space-y-2 mb-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={editedSpeaker}
              onChange={(e) => setEditedSpeaker(e.target.value)}
              className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="話者名"
              disabled={isSaving}
            />
            <input
              type="text"
              value={editedTimestamp}
              onChange={(e) => handleTimeInputChange(e, setEditedTimestamp)}
              onBlur={(e) => handleTimeBlur(e.target.value, setEditedTimestamp)}
              className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-500 w-24"
              placeholder="0518"
              title="数字のみ入力（例: 0518 → 05:18）"
              disabled={isSaving}
            />
            <span className="text-sm text-gray-500">〜</span>
            <input
              type="text"
              value={editedEndTimestamp}
              onChange={(e) => handleTimeInputChange(e, setEditedEndTimestamp)}
              onBlur={(e) => handleTimeBlur(e.target.value, setEditedEndTimestamp)}
              className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-500 w-24"
              placeholder="0545"
              title="数字のみ入力（例: 0545 → 05:45, 013005 → 01:30:05）"
              disabled={isSaving}
            />
            {editedEndTimestamp && (
              <span className="text-sm text-gray-600">
                ({calculateDuration()}秒)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              時刻は数字のみで入力できます（例: 1030 → 10:30、推奨4桁）
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveTime}
                disabled={isSaving}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleCancelTime}
                disabled={isSaving}
                className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
        <HighlightEditor
          text={section.content}
          highlights={highlights}
          onHighlightCreate={handleHighlightCreate}
          onHighlightDelete={handleHighlightDelete}
          isEditing={false}
        />
      </div>
    );
  }

  // 本文編集モード
  if (isEditingContent) {
    return (
      <div className="space-y-2">
        <div>
          <p className="text-sm text-gray-600 mb-1">
            {section.speaker} [{section.timestamp}
            {section.endTimestamp && (
              <>
                {' 〜 '}
                {section.endTimestamp}
                <span className="text-gray-500 ml-1">({timeToSeconds(section.endTimestamp) - timeToSeconds(section.timestamp)}秒)</span>
              </>
            )}]
          </p>
        </div>
        
        {/* 新しいCSSクラスを使用した本文編集モーダル */}
        <div className="content-edit-modal">
          <div className="content-edit-modal-content">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">本文編集</h3>
              <button
                onClick={handleCancelContent}
                className="text-gray-500 hover:text-gray-700"
                title="閉じる"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <HighlightEditor
                text={editedContent}
                highlights={highlights}
                onHighlightCreate={handleHighlightCreate}
                onHighlightDelete={handleHighlightDelete}
                isEditing={true}
              />
            </div>
            
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="content-edit-textarea"
              disabled={isSaving}
              placeholder="本文を編集してください..."
            />
            
            <div className="content-edit-buttons">
              <button
                onClick={handleCancelContent}
                disabled={isSaving}
                className="content-edit-button content-edit-cancel"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveContent}
                disabled={isSaving}
                className="content-edit-button content-edit-save"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 通常表示時も秒数を計算
  const duration = section.endTimestamp ? (() => {
    const start = timeToSeconds(section.timestamp);
    const end = timeToSeconds(section.endTimestamp);
    return Math.max(0, end - start);
  })() : 0;

  return (
    <div className={!isIncluded ? 'opacity-50' : ''}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          {onToggleInclude && (
            <input
              type="checkbox"
              checked={isIncluded}
              onChange={() => onToggleInclude(section.id)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              title="チェックすると出力に含まれます"
            />
          )}
          <div>
            <p className="text-sm text-gray-600">
              {section.speaker} [{section.timestamp}
              {section.endTimestamp && (
                <>
                  {' 〜 '}
                  {section.endTimestamp}
                  <span className="text-gray-500 ml-1">({duration}秒)</span>
                </>
              )}]
              {showWarning && !section.endTimestamp && isIncluded && (
                <span className="ml-2 text-xs text-yellow-600 font-medium">
                  ⚠️ 終了時間未入力
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditingTime(true)}
            className="px-2 py-1 text-xs text-green-600 hover:text-green-800 border border-green-600 rounded hover:bg-green-50"
            title="時刻・話者名を編集"
          >
            時刻編集
          </button>
          <button
            onClick={() => setIsEditingContent(true)}
            className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-600 rounded hover:bg-blue-50"
            title="本文を編集"
          >
            本文編集
          </button>
          {onSectionDeleted && (
            <SectionDeleteButton
              sectionId={section.id}
              sectionNumber={section.sectionNumber}
              speaker={section.speaker}
              onSectionDeleted={onSectionDeleted}
            />
          )}
        </div>
      </div>
      <p className={`text-sm whitespace-pre-wrap ${!isIncluded ? 'line-through text-gray-400' : ''}`}>{section.content}</p>
    </div>
  );
}

