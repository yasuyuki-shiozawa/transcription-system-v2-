import { useState } from 'react';

// DEBUG: Console log at component load
console.log('=== EDITABLE MANUS SECTION COMPONENT LOADED ===', new Date().toISOString());

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
  isExcluded?: boolean;
  onToggleExclude?: (sectionId: string) => void;
  showWarning?: boolean;
}

export default function EditableManusSection({ section, onUpdate, isExcluded = false, onToggleExclude, showWarning = false }: EditableManusSectonProps) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedSpeaker, setEditedSpeaker] = useState(section.speaker);
  const [editedTimestamp, setEditedTimestamp] = useState(section.timestamp);
  const [editedEndTimestamp, setEditedEndTimestamp] = useState(section.endTimestamp || '');
  const [editedContent, setEditedContent] = useState(section.content);
  const [isSaving, setIsSaving] = useState(false);

  // 時刻入力を自動フォーマットする関数
  const formatTimeInput = (value: string): string => {
    // 数字以外を除去
    const numbers = value.replace(/[^\d]/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      // MM:SS形式
      return `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
    } else if (numbers.length <= 6) {
      // HH:MM:SS形式
      return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}:${numbers.slice(4)}`;
    }
    // 6桁を超える場合は最初の6桁のみ使用
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}:${numbers.slice(4, 6)}`;
  };

  // 時刻入力のハンドラー
  const handleTimeChange = (value: string, setter: (value: string) => void) => {
    const formatted = formatTimeInput(value);
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
              onChange={(e) => handleTimeChange(e.target.value, setEditedTimestamp)}
              className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-500 w-24"
              placeholder="0518"
              title="数字のみ入力（例: 0518 → 05:18）"
              disabled={isSaving}
            />
            <span className="text-sm text-gray-500">〜</span>
            <input
              type="text"
              value={editedEndTimestamp}
              onChange={(e) => handleTimeChange(e.target.value, setEditedEndTimestamp)}
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
              時刻は数字のみで入力できます（例: 0518 → 05:18、013005 → 01:30:05）
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
        <p className="text-sm whitespace-pre-wrap">{section.content}</p>
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
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          rows={6}
          disabled={isSaving}
        />
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={handleSaveContent}
            disabled={isSaving}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={handleCancelContent}
            disabled={isSaving}
            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            キャンセル
          </button>
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
    <div className={isExcluded ? 'opacity-50' : ''}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          {onToggleExclude && (
            <input
              type="checkbox"
              checked={isExcluded}
              onChange={() => onToggleExclude(section.id)}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              title="チェックすると出力から除外されます"
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
              {showWarning && !section.endTimestamp && !isExcluded && (
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
        </div>
      </div>
      <p className={`text-sm whitespace-pre-wrap ${isExcluded ? 'line-through text-gray-400' : ''}`}>{section.content}</p>
    </div>
  );
}// trigger rebuild
