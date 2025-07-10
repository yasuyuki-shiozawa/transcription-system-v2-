'use client';

import React, { useState, useMemo, useCallback } from 'react';

interface Section {
  id: string;
  sectionNumber: string;
  speaker: string;
  timestamp: string;
  endTimestamp?: string | null;
  content: string;
  isExcluded?: boolean;
}

interface FilterConfig {
  speaker: string;
  timeRange: {
    start: string;
    end: string;
  };
  contentSearch: string;
  hasEndTime: 'all' | 'with' | 'without';
  includedState: 'all' | 'included' | 'excluded';
}

interface SectionSelectionManagerProps {
  sections: Section[];
  selectedSections: Set<string>;
  includedSections: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onToggleInclude: (sectionId: string) => void;
}

const SectionSelectionManager: React.FC<SectionSelectionManagerProps> = ({
  sections,
  selectedSections,
  includedSections,
  onSelectionChange,
  onToggleInclude
}) => {
  const [filters, setFilters] = useState<FilterConfig>({
    speaker: '',
    timeRange: { start: '', end: '' },
    contentSearch: '',
    hasEndTime: 'all',
    includedState: 'all'
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // 時刻を秒数に変換
  const timeToSeconds = useCallback((timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }, []);

  // フィルター済みセクション
  const filteredSections = useMemo(() => {
    return sections.filter(section => {
      // 話者フィルター
      if (filters.speaker && !section.speaker.toLowerCase().includes(filters.speaker.toLowerCase())) {
        return false;
      }

      // 時間範囲フィルター
      if (filters.timeRange.start || filters.timeRange.end) {
        const sectionTime = timeToSeconds(section.timestamp);
        if (filters.timeRange.start && sectionTime < timeToSeconds(filters.timeRange.start)) {
          return false;
        }
        if (filters.timeRange.end && sectionTime > timeToSeconds(filters.timeRange.end)) {
          return false;
        }
      }

      // 内容検索フィルター
      if (filters.contentSearch && !section.content.toLowerCase().includes(filters.contentSearch.toLowerCase())) {
        return false;
      }

      // 終了時間フィルター
      if (filters.hasEndTime === 'with' && !section.endTimestamp) {
        return false;
      }
      if (filters.hasEndTime === 'without' && section.endTimestamp) {
        return false;
      }

      // 含める状態フィルター
      if (filters.includedState === 'included' && !includedSections.has(section.id)) {
        return false;
      }
      if (filters.includedState === 'excluded' && includedSections.has(section.id)) {
        return false;
      }

      return true;
    });
  }, [sections, filters, timeToSeconds, includedSections]);

  // 統計情報
  const stats = useMemo(() => {
    const total = sections.length;
    const filtered = filteredSections.length;
    const selected = Array.from(selectedSections).filter(id => 
      filteredSections.some(section => section.id === id)
    ).length;
    const included = Array.from(includedSections).length;

    // 選択されたセクションの合計時間計算
    const selectedTime = Array.from(selectedSections).reduce((total, id) => {
      const section = sections.find(s => s.id === id);
      if (section?.endTimestamp && !section.isExcluded) {
        return total + (timeToSeconds(section.endTimestamp) - timeToSeconds(section.timestamp));
      }
      return total;
    }, 0);

    return { total, filtered, selected, included, selectedTime };
  }, [sections, filteredSections, selectedSections, timeToSeconds]);

  // 全選択/全解除
  const handleSelectAll = () => {
    const newSelection = new Set(selectedSections);
    filteredSections.forEach(section => {
      newSelection.add(section.id);
    });
    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    const newSelection = new Set(selectedSections);
    filteredSections.forEach(section => {
      newSelection.delete(section.id);
    });
    onSelectionChange(newSelection);
  };

  // 話者別選択
  const handleSelectBySpeaker = (speaker: string) => {
    const newSelection = new Set(selectedSections);
    filteredSections
      .filter(section => section.speaker === speaker)
      .forEach(section => newSelection.add(section.id));
    onSelectionChange(newSelection);
  };

  // 時間範囲選択（将来の機能拡張用）
  // const handleSelectTimeRange = (startTime: string, endTime: string) => {
  //   const startSeconds = timeToSeconds(startTime);
  //   const endSeconds = timeToSeconds(endTime);
  //   const newSelection = new Set(selectedSections);
  //   
  //   filteredSections
  //     .filter(section => {
  //       const sectionTime = timeToSeconds(section.timestamp);
  //       return sectionTime >= startSeconds && sectionTime <= endSeconds;
  //     })
  //     .forEach(section => newSelection.add(section.id));
  //   
  //   onSelectionChange(newSelection);
  // };

  // フィルターリセット
  const resetFilters = () => {
    setFilters({
      speaker: '',
      timeRange: { start: '', end: '' },
      contentSearch: '',
      hasEndTime: 'all',
      includedState: 'all'
    });
  };

  // 話者リスト（重複除去）
  const speakers = useMemo(() => {
    const speakerSet = new Set(sections.map(section => section.speaker));
    return Array.from(speakerSet).sort();
  }, [sections]);

  // 時間を分:秒形式に変換
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">セクション選択管理</h3>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          aria-expanded={showAdvancedFilters}
        >
          {showAdvancedFilters ? '詳細フィルターを閉じる' : '詳細フィルター'}
        </button>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-600">総セクション</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{stats.filtered}</div>
          <div className="text-xs text-gray-600">表示中</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{stats.selected}</div>
          <div className="text-xs text-gray-600">選択中</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{stats.included}</div>
          <div className="text-xs text-gray-600">含める</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">{formatTime(stats.selectedTime)}</div>
          <div className="text-xs text-gray-600">選択時間</div>
        </div>
      </div>

      {/* 一括操作ボタン */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSelectAll}
          className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          disabled={filteredSections.length === 0}
        >
          表示中を全選択
        </button>
        <button
          onClick={handleDeselectAll}
          className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          disabled={filteredSections.length === 0}
        >
          表示中を全解除
        </button>
        {filters.speaker && (
          <button
            onClick={() => handleSelectBySpeaker(filters.speaker)}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {filters.speaker}を全選択
          </button>
        )}
      </div>

      {/* 詳細フィルター */}
      {showAdvancedFilters && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 話者フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                話者で絞り込み
              </label>
              <select
                value={filters.speaker}
                onChange={(e) => setFilters(prev => ({ ...prev, speaker: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべての話者</option>
                {speakers.map(speaker => (
                  <option key={speaker} value={speaker}>{speaker}</option>
                ))}
              </select>
            </div>

            {/* 終了時間フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了時間
              </label>
              <select
                value={filters.hasEndTime}
                onChange={(e) => setFilters(prev => ({ ...prev, hasEndTime: e.target.value as FilterConfig['hasEndTime'] }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="with">終了時間あり</option>
                <option value="without">終了時間なし</option>
              </select>
            </div>

            {/* 含める状態フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                含める状態
              </label>
              <select
                value={filters.includedState}
                onChange={(e) => setFilters(prev => ({ ...prev, includedState: e.target.value as FilterConfig['includedState'] }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="included">含める</option>
                <option value="excluded">含めない</option>
              </select>
            </div>
          </div>

          {/* 時間範囲フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              時間範囲で絞り込み
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="開始時間 (例: 05:30)"
                value={filters.timeRange.start}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  timeRange: { ...prev.timeRange, start: e.target.value }
                }))}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">〜</span>
              <input
                type="text"
                placeholder="終了時間 (例: 15:45)"
                value={filters.timeRange.end}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  timeRange: { ...prev.timeRange, end: e.target.value }
                }))}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 内容検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容で検索
            </label>
            <input
              type="text"
              placeholder="検索キーワードを入力"
              value={filters.contentSearch}
              onChange={(e) => setFilters(prev => ({ ...prev, contentSearch: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* フィルターリセット */}
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              フィルターをリセット
            </button>
          </div>
        </div>
      )}

      {/* セクションリスト */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredSections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            フィルター条件に一致するセクションがありません
          </div>
        ) : (
          filteredSections.map(section => (
            <div
              key={section.id}
              className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                !includedSections.has(section.id) ? 'bg-gray-100 border-gray-300' : 'border-gray-200'
              } ${
                selectedSections.has(section.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSections.has(section.id)}
                onChange={(e) => {
                  const newSelection = new Set(selectedSections);
                  if (e.target.checked) {
                    newSelection.add(section.id);
                  } else {
                    newSelection.delete(section.id);
                  }
                  onSelectionChange(newSelection);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                aria-label={`セクション ${section.sectionNumber} を選択`}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    #{section.sectionNumber}
                  </span>
                  <span className="text-sm text-gray-600">
                    {section.speaker}
                  </span>
                  <span className="text-sm text-gray-500">
                    [{section.timestamp}
                    {section.endTimestamp && ` 〜 ${section.endTimestamp}`}]
                  </span>
                  {includedSections.has(section.id) && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      含める
                    </span>
                  )}
                </div>
                <p className={`text-sm ${!includedSections.has(section.id) ? 'text-gray-400 line-through' : 'text-gray-700'} truncate`}>
                  {section.content}
                </p>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onToggleInclude(section.id)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    includedSections.has(section.id)
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  title={includedSections.has(section.id) ? '含めない' : '含める'}
                >
                  <input
                    type="checkbox"
                    checked={includedSections.has(section.id)}
                    onChange={() => onToggleInclude(section.id)}
                    className="w-3 h-3"
                    aria-label={`セクション${section.sectionNumber}を含める`}
                  />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SectionSelectionManager;