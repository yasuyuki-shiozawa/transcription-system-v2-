# 🎨 セクション選択機能 UX設計・ワイヤーフレーム

**UX委員会**: Aphrodite（アフロディーテ）  
**作成日**: 2025-06-26 23:55 JST  
**目的**: 30%効率向上を実現するセクション選択UI/UX設計

---

## 🎯 UX設計目標

### 30%効率向上の核心
```
従来フロー（個別選択）:
議事録表示 → 個別チェックボックス → スクロール → 選択確認 → ダウンロード
推定時間: 3-5分（50セクション）

最適化フロー（一括選択）:
議事録表示 → 直感的一括選択 → 即座ダウンロード
目標時間: 1-2分（50セクション）→ 60%短縮
```

---

## 🎨 ワイヤーフレーム設計

### 1. セクション選択管理バー（新規コンポーネント）
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 セクション選択マネージャー                                │
├─────────────────────────────────────────────────────────────┤
│ ✅ 全選択   ❌ 全解除   🔄 選択反転   │ 選択済み: 45/50    │
│ 📊 詳細表示 ⚡ クイック選択          │ 📥 ダウンロード    │
└─────────────────────────────────────────────────────────────┘
```

### 2. クイック選択パネル（展開可能）
```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ クイック選択                          [📊 詳細表示] [×] │
├─────────────────────────────────────────────────────────────┤
│ 話者別選択:                                                 │
│ [✅ 議長 (12)] [✅ 田中委員 (8)] [☐ 佐藤委員 (15)]        │
│                                                             │
│ 時間範囲選択:                                               │
│ [09:00-10:00 ✅] [10:00-11:00 ✅] [11:00-12:00 ☐]         │
│                                                             │
│ プリセット:                                                 │
│ [📋 開会～議事] [📝 質疑応答のみ] [📊 採決のみ]           │
└─────────────────────────────────────────────────────────────┘
```

### 3. 既存セクション表示の強化
```
┌─────────────────────────────────────────────────────────────┐
│ [☐] セクション 001 - 議長 [09:00-09:03]        [📝] [❌]   │
│     開会の宣言。定足数の確認を行います...                   │
├─────────────────────────────────────────────────────────────┤
│ [✅] セクション 002 - 田中委員 [09:03-09:15]    [📝] [❌]   │
│     質問があります。予算について...                         │
│     ┌─ 選択済み（青いハイライト）                          │
└─────────────────────────────────────────────────────────────┘

コンポーネント説明:
[☐] = 選択チェックボックス（大きく、タップしやすい）
[📝] = セクション編集ボタン
[❌] = 除外トグルボタン（既存機能）
```

---

## 🔧 技術実装設計

### 1. SectionSelectionManager コンポーネント
```typescript
interface SectionSelectionManagerProps {
  sections: Section[];
  selectedSections: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onDownload: () => void;
  downloadFormat: 'text' | 'word';
  onFormatChange: (format: 'text' | 'word') => void;
}

const SectionSelectionManager: React.FC<SectionSelectionManagerProps> = ({
  sections,
  selectedSections,
  onSelectionChange,
  onDownload,
  downloadFormat,
  onFormatChange
}) => {
  // 一括選択ロジック
  const selectAll = () => {
    const allIds = new Set(sections.map(s => s.id));
    onSelectionChange(allIds);
  };

  const deselectAll = () => {
    onSelectionChange(new Set());
  };

  const invertSelection = () => {
    const newSelection = new Set(
      sections
        .filter(s => !selectedSections.has(s.id))
        .map(s => s.id)
    );
    onSelectionChange(newSelection);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={selectAll}
            className="flex items-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            <CheckIcon className="w-4 h-4" />
            <span>全選択</span>
          </button>
          
          <button
            onClick={deselectAll}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
            <span>全解除</span>
          </button>
          
          <button
            onClick={invertSelection}
            className="flex items-center space-x-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>選択反転</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            選択済み: {selectedSections.size}/{sections.length}
          </span>
          
          <select
            value={downloadFormat}
            onChange={(e) => onFormatChange(e.target.value as 'text' | 'word')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="text">テキスト形式</option>
            <option value="word">Word形式</option>
          </select>
          
          <button
            onClick={onDownload}
            disabled={selectedSections.size === 0}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            📥 ダウンロード
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 2. QuickSelectionPanel コンポーネント
```typescript
interface QuickSelectionPanelProps {
  sections: Section[];
  selectedSections: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const QuickSelectionPanel: React.FC<QuickSelectionPanelProps> = ({
  sections,
  selectedSections,
  onSelectionChange,
  isOpen,
  onToggle
}) => {
  // 話者別選択ロジック
  const selectBySpeaker = (speaker: string) => {
    const speakerSections = sections
      .filter(s => s.speaker === speaker)
      .map(s => s.id);
    
    const newSelection = new Set([...selectedSections, ...speakerSections]);
    onSelectionChange(newSelection);
  };

  // 時間範囲選択ロジック
  const selectByTimeRange = (startTime: string, endTime: string) => {
    const rangeSections = sections
      .filter(s => {
        const sectionTime = s.timestamp;
        return sectionTime >= startTime && sectionTime <= endTime;
      })
      .map(s => s.id);
    
    const newSelection = new Set([...selectedSections, ...rangeSections]);
    onSelectionChange(newSelection);
  };

  // 話者統計
  const speakerStats = sections.reduce((acc, section) => {
    acc[section.speaker] = (acc[section.speaker] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 ${
      isOpen ? 'max-h-96' : 'max-h-0'
    }`}>
      {isOpen && (
        <div className="p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">⚡ クイック選択</h3>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 話者別選択 */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">話者別選択:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(speakerStats).map(([speaker, count]) => (
                <button
                  key={speaker}
                  onClick={() => selectBySpeaker(speaker)}
                  className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
                >
                  {speaker} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* プリセット選択 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">プリセット:</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  // 開会関連セクションを選択
                  const openingSections = sections
                    .filter(s => s.content.includes('開会') || s.sectionNumber <= '005')
                    .map(s => s.id);
                  onSelectionChange(new Set(openingSections));
                }}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors"
              >
                📋 開会～議事
              </button>
              
              <button
                onClick={() => {
                  // 質疑応答セクションを選択
                  const qaSections = sections
                    .filter(s => s.content.includes('質問') || s.content.includes('質疑'))
                    .map(s => s.id);
                  onSelectionChange(new Set(qaSections));
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                📝 質疑応答のみ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 3. 既存セクション表示の強化
```typescript
interface EnhancedSectionItemProps {
  section: Section;
  isSelected: boolean;
  onSelectionChange: (sectionId: string, selected: boolean) => void;
  onUpdate: (sectionId: string, updates: any) => void;
  onToggleExclude: (sectionId: string) => void;
  isExcluded: boolean;
}

const EnhancedSectionItem: React.FC<EnhancedSectionItemProps> = ({
  section,
  isSelected,
  onSelectionChange,
  onUpdate,
  onToggleExclude,
  isExcluded
}) => {
  return (
    <div className={`border rounded-lg transition-all duration-200 ${
      isSelected 
        ? 'border-blue-300 bg-blue-50 shadow-md' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    } ${isExcluded ? 'opacity-50' : ''}`}>
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* 大きな選択チェックボックス */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelectionChange(section.id, e.target.checked)}
              className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {/* セクション情報 */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  セクション {section.sectionNumber}
                </span>
                <span className="text-sm text-gray-600">
                  {section.speaker}
                </span>
                <span className="text-sm text-gray-500">
                  [{section.timestamp}]
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  title="セクションを編集"
                >
                  📝
                </button>
                <button
                  onClick={() => onToggleExclude(section.id)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    isExcluded
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isExcluded ? '除外を解除' : 'セクションを除外'}
                >
                  {isExcluded ? '復元' : '除外'}
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 leading-relaxed">
              {section.content.length > 100 
                ? `${section.content.substring(0, 100)}...` 
                : section.content
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## ⌨️ キーボードショートカット設計

### アクセシビリティ向上
```typescript
const useKeyboardShortcuts = (
  onSelectAll: () => void,
  onDeselectAll: () => void,
  onInvertSelection: () => void,
  onDownload: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+A: 全選択
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        onSelectAll();
      }
      
      // Ctrl+D: 全解除
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        onDeselectAll();
      }
      
      // Ctrl+I: 選択反転
      if (event.ctrlKey && event.key === 'i') {
        event.preventDefault();
        onInvertSelection();
      }
      
      // Ctrl+Enter: ダウンロード
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        onDownload();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSelectAll, onDeselectAll, onInvertSelection, onDownload]);
};
```

---

## 📊 効率性測定指標

### Before（現在の個別選択）
```
タスク: 50セクション中の30セクションを選択してダウンロード

操作ステップ:
1. スクロールしながら個別チェック (2-3分)
2. 選択確認・見落としチェック (30-60秒)
3. ダウンロードボタンクリック (5秒)

合計時間: 3-5分
クリック数: 30+ クリック
エラー率: 5-10%（選択漏れ・重複）
```

### After（新しい一括選択）
```
タスク: 同じ30セクションを選択してダウンロード

操作ステップ:
1. 全選択 → 不要20セクションを解除 (30-60秒)
   または
2. 話者別選択で対象者のみ選択 (15-30秒)

合計時間: 1-2分
クリック数: 5-10 クリック
エラー率: 1-2%（直感的操作）

効率向上: 60-70%向上 (目標30%を大幅に上回る)
```

---

## 🎨 視覚的フィードバック設計

### 選択状態の明確化
```css
/* 選択済みセクション */
.section-selected {
  @apply border-blue-300 bg-blue-50 shadow-md;
  transform: scale(1.02);
  transition: all 0.2s ease-in-out;
}

/* ホバー状態 */
.section-item:hover {
  @apply border-gray-300 shadow-sm;
  transform: translateY(-1px);
}

/* チェックボックスアニメーション */
.checkbox-selected {
  animation: checkmark 0.3s ease-in-out;
}

@keyframes checkmark {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 一括操作時のカウンターアニメーション */
.selection-counter {
  animation: bounce 0.5s ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

---

## 📱 レスポンシブ対応

### モバイル最適化
```typescript
const MobileSelectionManager = () => {
  return (
    <div className="lg:hidden">
      {/* モバイル用コンパクトデザイン */}
      <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button className="px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm">
              全選択
            </button>
            <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm">
              全解除
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {selectedSections.size}/{sections.length}
            </span>
            <button className="px-3 py-2 bg-green-600 text-white rounded text-sm">
              📥
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🔄 状態管理設計

### セクション選択状態の管理
```typescript
interface SectionSelectionState {
  selectedSections: Set<string>;
  excludedSections: Set<string>;
  quickSelectionOpen: boolean;
  downloadFormat: 'text' | 'word';
  lastAction: 'select' | 'deselect' | 'toggle' | null;
}

const useSectionSelection = (sections: Section[]) => {
  const [state, setState] = useState<SectionSelectionState>({
    selectedSections: new Set(),
    excludedSections: new Set(),
    quickSelectionOpen: false,
    downloadFormat: 'word',
    lastAction: null
  });

  // 楽観的更新によるUX向上
  const updateSelection = useCallback((newSelection: Set<string>) => {
    setState(prev => ({
      ...prev,
      selectedSections: newSelection,
      lastAction: 'select'
    }));
  }, []);

  // Undo機能
  const undoLastAction = useCallback(() => {
    // 前回の操作を取り消し
  }, []);

  return {
    ...state,
    updateSelection,
    undoLastAction,
    // その他のアクション...
  };
};
```

---

## 🎯 実装優先順位

### Phase 1: 基本機能（即座実装）
1. ✅ SectionSelectionManager コンポーネント
2. ✅ 一括選択・解除・反転機能
3. ✅ 選択状態の視覚的フィードバック
4. ✅ 基本的なキーボードショートカット

### Phase 2: 効率化機能（追加実装）
1. 🔄 QuickSelectionPanel コンポーネント
2. 🔄 話者別・時間範囲選択
3. 🔄 プリセット選択機能
4. 🔄 モバイル最適化

### Phase 3: 高度な機能（将来拡張）
1. ⏳ Undo/Redo機能
2. ⏳ 選択パターンの保存・読み込み
3. ⏳ ドラッグ&ドロップ選択
4. ⏳ AI による自動選択提案

---

**🚀 30%効率向上を実現するセクション選択機能の完全設計完了！**

この設計により、ユーザーは直感的かつ効率的にセクションを選択でき、
大幅な作業時間短縮を実現できます。