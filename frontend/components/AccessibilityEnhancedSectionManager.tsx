'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import SectionSelectionManager from './SectionSelectionManager';

interface Section {
  id: string;
  sectionNumber: string;
  speaker: string;
  timestamp: string;
  endTimestamp?: string | null;
  content: string;
  isExcluded?: boolean;
}

interface AccessibilityEnhancedSectionManagerProps {
  sections: Section[];
  selectedSections: Set<string>;
  includedSections: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onToggleInclude: (sectionId: string) => void;
}

const AccessibilityEnhancedSectionManager: React.FC<AccessibilityEnhancedSectionManagerProps> = ({
  sections,
  selectedSections,
  includedSections,
  onSelectionChange,
  onToggleInclude
}) => {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [keyboardNavMode, setKeyboardNavMode] = useState(false);
  
  const announcementRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // アナウンス機能
  const announce = useCallback((message: string) => {
    setAnnouncements(prev => [...prev.slice(-4), message]); // 最新5件まで保持
    
    // スクリーンリーダー用の即座アナウンス
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
    }
  }, []);

  // 選択変更時のアナウンス
  useEffect(() => {
    const selectedCount = selectedSections.size;
    const totalCount = sections.length;
    const excludedCount = sections.filter(s => s.isExcluded).length;
    
    announce(`${selectedCount}件のセクションが選択されています。全${totalCount}件中、${excludedCount}件が除外されています。`);
  }, [selectedSections.size, sections.length, sections, announce]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!keyboardNavMode) return;

    const sectionIds = sections.map(s => s.id);
    const currentIndex = focusedSectionId ? sectionIds.indexOf(focusedSectionId) : -1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < sectionIds.length - 1) {
          const nextId = sectionIds[currentIndex + 1];
          setFocusedSectionId(nextId);
          sectionRefs.current.get(nextId)?.focus();
          announce(`セクション${sections[currentIndex + 1].sectionNumber}: ${sections[currentIndex + 1].speaker}`);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          const prevId = sectionIds[currentIndex - 1];
          setFocusedSectionId(prevId);
          sectionRefs.current.get(prevId)?.focus();
          announce(`セクション${sections[currentIndex - 1].sectionNumber}: ${sections[currentIndex - 1].speaker}`);
        }
        break;

      case ' ':
      case 'Enter':
        event.preventDefault();
        if (focusedSectionId) {
          const newSelection = new Set(selectedSections);
          if (selectedSections.has(focusedSectionId)) {
            newSelection.delete(focusedSectionId);
            announce('セクションの選択を解除しました');
          } else {
            newSelection.add(focusedSectionId);
            announce('セクションを選択しました');
          }
          onSelectionChange(newSelection);
        }
        break;

      case 'Delete':
      case 'd':
        event.preventDefault();
        if (focusedSectionId) {
          onToggleInclude(focusedSectionId);
          const section = sections.find(s => s.id === focusedSectionId);
          announce(!section?.isExcluded ? 'セクションを含めるように設定しました' : 'セクションを含めないように設定しました');
        }
        break;

      case 'a':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const newSelection = new Set(sections.map(s => s.id));
          onSelectionChange(newSelection);
          announce('すべてのセクションを選択しました');
        }
        break;

      case 'Escape':
        event.preventDefault();
        setKeyboardNavMode(false);
        announce('キーボードナビゲーションを終了しました');
        break;
    }
  }, [keyboardNavMode, focusedSectionId, sections, selectedSections, onSelectionChange, onToggleInclude, announce]);

  // キーボードイベントリスナー
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // セクション参照の登録（現在未使用だが将来の機能拡張用）
  // const registerSectionRef = useCallback((sectionId: string, element: HTMLElement | null) => {
  //   if (element) {
  //     sectionRefs.current.set(sectionId, element);
  //   } else {
  //     sectionRefs.current.delete(sectionId);
  //   }
  // }, []);

  // 一括操作のアクセシビリティ対応
  const handleAccessibleSelectAll = () => {
    const newSelection = new Set(sections.map(s => s.id));
    onSelectionChange(newSelection);
    announce(`すべての${sections.length}件のセクションを選択しました`);
  };

  const handleAccessibleDeselectAll = () => {
    onSelectionChange(new Set());
    announce('すべての選択を解除しました');
  };

  const handleAccessibleToggleInclude = (sectionId: string) => {
    onToggleInclude(sectionId);
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      announce(
        !section.isExcluded 
          ? `セクション${section.sectionNumber}を含めるように設定しました` 
          : `セクション${section.sectionNumber}を含めないように設定しました`
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* スクリーンリーダー用アナウンス領域 */}
      <div
        ref={announcementRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* キーボードナビゲーション説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              キーボードナビゲーション
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">↑↓</kbd> セクション間移動</li>
                <li><kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Space/Enter</kbd> 選択切り替え</li>
                <li><kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">D/Delete</kbd> 含める/含めない切り替え</li>
                <li><kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Ctrl+A</kbd> 全選択</li>
                <li><kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Esc</kbd> ナビゲーション終了</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setKeyboardNavMode(true);
                announce('キーボードナビゲーションを開始しました。矢印キーでセクション間を移動できます。');
              }}
              className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              キーボードナビゲーション開始
            </button>
          </div>
        </div>
      </div>

      {/* アクセシビリティ対応された一括操作 */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="一括操作">
        <button
          onClick={handleAccessibleSelectAll}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          aria-describedby="select-all-desc"
        >
          すべて選択
        </button>
        <div id="select-all-desc" className="sr-only">
          表示されているすべてのセクションを選択します
        </div>

        <button
          onClick={handleAccessibleDeselectAll}
          className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          aria-describedby="deselect-all-desc"
        >
          すべて解除
        </button>
        <div id="deselect-all-desc" className="sr-only">
          選択されているすべてのセクションの選択を解除します
        </div>
      </div>

      {/* アナウンス履歴（デバッグ用・開発環境のみ表示） */}
      {process.env.NODE_ENV === 'development' && announcements.length > 0 && (
        <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer">
            アクセシビリティアナウンス履歴 ({announcements.length}件)
          </summary>
          <div className="mt-2 space-y-1">
            {announcements.map((announcement, index) => (
              <div key={index} className="text-xs text-gray-600 p-2 bg-white rounded border">
                {announcement}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* メインのセクション選択管理コンポーネント */}
      <div role="region" aria-label="セクション選択管理">
        <SectionSelectionManager
          sections={sections}
          selectedSections={selectedSections}
          includedSections={includedSections}
          onSelectionChange={onSelectionChange}
          onToggleInclude={handleAccessibleToggleInclude}
        />
      </div>

      {/* セクション操作のアリア説明 */}
      <div className="sr-only">
        <div id="section-instructions">
          セクションリストでは、チェックボックスで選択、除外ボタンで出力から除外できます。
          キーボードナビゲーションも利用可能です。
        </div>
      </div>
    </div>
  );
};

export default AccessibilityEnhancedSectionManager;