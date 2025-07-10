# フロントエンド状態管理改善 - 技術指導書

## 🏗️ 技術指導: Prometheus (Chief System Architect)
**対象**: 技術委員会 (Hephaestus)  
**緊急度**: 最高優先（48時間以内実装）  
**目標**: SessionDetail.tsx の完全リファクタリング

---

## 🚨 緊急技術課題の解決

### 現在の問題点
```typescript
// 現在のSessionDetail.tsx - 1000行超の肥大化コンポーネント
const SessionDetail = () => {
  // 問題1: 状態管理の複雑化
  const [transcriptions, setTranscriptions] = useState<TranscriptionData[]>([]);
  const [excludedSections, setExcludedSections] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 問題2: 責務の混在
  // - UI表示ロジック
  // - API通信
  // - ファイル処理
  // - WebSocket管理
  // - 状態同期
  
  // 問題3: パフォーマンス劣化
  // - 不必要な再レンダリング
  // - メモ化未実装
  // - 重い計算処理
};
```

---

## 🎯 解決策: Context + Reducer パターン

### 1. 状態管理アーキテクチャ設計

```typescript
// types/session.ts - 型定義の集約
export interface SessionState {
  // セッション基本情報
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;
  
  // 転写データ管理
  transcriptions: {
    data: TranscriptionData[];
    isLoading: boolean;
    uploadProgress: Record<string, number>;
  };
  
  // セクション管理
  sections: {
    excluded: Set<string>;
    editing: string | null;
    unsavedChanges: Record<string, Partial<Section>>;
  };
  
  // UI状態
  ui: {
    currentView: 'upload' | 'compare';
    activeTab: string;
    modals: {
      isUploadOpen: boolean;
      isSettingsOpen: boolean;
    };
  };
  
  // WebSocket状態
  realtime: {
    connections: Record<string, WebSocket>;
    progress: Record<string, TranscriptionProgress>;
    isConnected: boolean;
  };
}

// Reducer Actions
export type SessionAction =
  | { type: 'SET_SESSION'; payload: Session }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_TRANSCRIPTION'; payload: TranscriptionData }
  | { type: 'UPDATE_UPLOAD_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'TOGGLE_SECTION_EXCLUSION'; payload: string }
  | { type: 'START_SECTION_EDIT'; payload: string }
  | { type: 'SAVE_SECTION_CHANGES'; payload: { id: string; changes: Partial<Section> } }
  | { type: 'UPDATE_REALTIME_PROGRESS'; payload: { id: string; progress: TranscriptionProgress } }
  | { type: 'SET_UI_VIEW'; payload: 'upload' | 'compare' };
```

### 2. Context Provider実装

```typescript
// contexts/SessionContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';

const SessionContext = createContext<{
  state: SessionState;
  dispatch: React.Dispatch<SessionAction>;
} | null>(null);

// カスタムフック
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

// 高度なカスタムフック群
export const useSessionData = () => {
  const { state } = useSession();
  return {
    session: state.currentSession,
    isLoading: state.isLoading,
    error: state.error
  };
};

export const useTranscriptions = () => {
  const { state, dispatch } = useSession();
  
  const addTranscription = useCallback((data: TranscriptionData) => {
    dispatch({ type: 'ADD_TRANSCRIPTION', payload: data });
  }, [dispatch]);
  
  const updateProgress = useCallback((id: string, progress: number) => {
    dispatch({ type: 'UPDATE_UPLOAD_PROGRESS', payload: { id, progress } });
  }, [dispatch]);
  
  return {
    transcriptions: state.transcriptions.data,
    isLoading: state.transcriptions.isLoading,
    uploadProgress: state.transcriptions.uploadProgress,
    addTranscription,
    updateProgress
  };
};

export const useSectionManagement = () => {
  const { state, dispatch } = useSession();
  
  const toggleExclusion = useCallback((sectionId: string) => {
    dispatch({ type: 'TOGGLE_SECTION_EXCLUSION', payload: sectionId });
  }, [dispatch]);
  
  const startEdit = useCallback((sectionId: string) => {
    dispatch({ type: 'START_SECTION_EDIT', payload: sectionId });
  }, [dispatch]);
  
  const saveChanges = useCallback((id: string, changes: Partial<Section>) => {
    dispatch({ type: 'SAVE_SECTION_CHANGES', payload: { id, changes } });
  }, [dispatch]);
  
  return {
    excludedSections: state.sections.excluded,
    editingSection: state.sections.editing,
    unsavedChanges: state.sections.unsavedChanges,
    toggleExclusion,
    startEdit,
    saveChanges
  };
};
```

### 3. Reducer実装

```typescript
// reducers/sessionReducer.ts
export const sessionReducer = (state: SessionState, action: SessionAction): SessionState => {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        currentSession: action.payload,
        error: null
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
      
    case 'ADD_TRANSCRIPTION':
      return {
        ...state,
        transcriptions: {
          ...state.transcriptions,
          data: [...state.transcriptions.data, action.payload]
        }
      };
      
    case 'UPDATE_UPLOAD_PROGRESS':
      return {
        ...state,
        transcriptions: {
          ...state.transcriptions,
          uploadProgress: {
            ...state.transcriptions.uploadProgress,
            [action.payload.id]: action.payload.progress
          }
        }
      };
      
    case 'TOGGLE_SECTION_EXCLUSION':
      const excluded = new Set(state.sections.excluded);
      if (excluded.has(action.payload)) {
        excluded.delete(action.payload);
      } else {
        excluded.add(action.payload);
      }
      return {
        ...state,
        sections: {
          ...state.sections,
          excluded
        }
      };
      
    case 'START_SECTION_EDIT':
      return {
        ...state,
        sections: {
          ...state.sections,
          editing: action.payload
        }
      };
      
    case 'UPDATE_REALTIME_PROGRESS':
      return {
        ...state,
        realtime: {
          ...state.realtime,
          progress: {
            ...state.realtime.progress,
            [action.payload.id]: action.payload.progress
          }
        }
      };
      
    default:
      return state;
  }
};
```

---

## 🧩 コンポーネント分割戦略

### 1. SessionDetail.tsx の完全分割

```typescript
// pages/sessions/[id]/page.tsx - メインページ（大幅縮小）
import { SessionProvider } from '@/contexts/SessionContext';
import { SessionHeader } from '@/components/session/SessionHeader';
import { SessionContent } from '@/components/session/SessionContent';
import { SessionModals } from '@/components/session/SessionModals';

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  return (
    <SessionProvider sessionId={params.id}>
      <div className="min-h-screen bg-gray-50">
        <SessionHeader />
        <SessionContent />
        <SessionModals />
      </div>
    </SessionProvider>
  );
}
```

### 2. 専門コンポーネント群

```typescript
// components/session/SessionHeader.tsx - ヘッダー専用
import { useSessionData } from '@/contexts/SessionContext';

export const SessionHeader = React.memo(() => {
  const { session, isLoading } = useSessionData();
  
  if (isLoading) return <SessionHeaderSkeleton />;
  
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <SessionTitle session={session} />
          <SessionActions session={session} />
        </div>
      </div>
    </header>
  );
});

// components/session/UploadSection.tsx - アップロード専用
import { useTranscriptions } from '@/contexts/SessionContext';

export const UploadSection = React.memo(() => {
  const { transcriptions, uploadProgress, addTranscription } = useTranscriptions();
  
  return (
    <div className="space-y-6">
      <AudioFileUpload onUpload={addTranscription} />
      <TextFileUpload onUpload={addTranscription} />
      <UploadProgressList progress={uploadProgress} />
      <TranscriptionList transcriptions={transcriptions} />
    </div>
  );
});

// components/session/CompareSection.tsx - 比較表示専用
import { useSectionManagement, useTranscriptions } from '@/contexts/SessionContext';

export const CompareSection = React.memo(() => {
  const { transcriptions } = useTranscriptions();
  const { excludedSections, toggleExclusion, startEdit } = useSectionManagement();
  
  const nottaData = transcriptions.filter(t => t.source === 'notta');
  const manusData = transcriptions.filter(t => t.source === 'manus');
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <NOTTADataDisplay 
        data={nottaData}
        excludedSections={excludedSections}
        onToggleExclusion={toggleExclusion}
        onStartEdit={startEdit}
      />
      <MANUSDataDisplay 
        data={manusData}
        excludedSections={excludedSections}
        onToggleExclusion={toggleExclusion}
        onStartEdit={startEdit}
      />
    </div>
  );
});

// components/session/SectionList.tsx - セクション一覧専用
export const SectionList = React.memo(() => {
  // セクション表示ロジックに特化
  // 仮想化リスト実装でパフォーマンス最適化
});
```

---

## ⚡ パフォーマンス最適化実装

### 1. メモ化戦略

```typescript
// hooks/useOptimizedSections.ts - 重い計算のメモ化
export const useOptimizedSections = (transcriptions: TranscriptionData[]) => {
  // 重いソート・フィルタリング処理をメモ化
  const sortedSections = useMemo(() => {
    return transcriptions
      .flatMap(t => t.sections || [])
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [transcriptions]);
  
  // セクションマッチング計算をメモ化
  const matchedSections = useMemo(() => {
    return calculateSectionMatching(sortedSections);
  }, [sortedSections]);
  
  return { sortedSections, matchedSections };
};

// components最適化例
export const EditableSection = React.memo<EditableSectionProps>(({
  section,
  onSave,
  onCancel
}) => {
  // 重い処理は全てメモ化
  const formattedTimestamp = useMemo(() => 
    formatTimestamp(section.timestamp), [section.timestamp]
  );
  
  return (
    <div className="editable-section">
      {/* 実装 */}
    </div>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数で不要な再レンダリング防止
  return (
    prevProps.section.id === nextProps.section.id &&
    prevProps.section.content === nextProps.section.content &&
    prevProps.section.timestamp === nextProps.section.timestamp
  );
});
```

### 2. 仮想化リスト実装

```typescript
// components/VirtualizedSectionList.tsx
import { FixedSizeList as List } from 'react-window';

export const VirtualizedSectionList = React.memo<{
  sections: Section[];
  height: number;
}>(({ sections, height }) => {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <SectionRow section={sections[index]} />
    </div>
  ), [sections]);
  
  return (
    <List
      height={height}
      itemCount={sections.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  );
});
```

---

## 🧪 テスト戦略

### 1. Context・Reducer テスト

```typescript
// __tests__/contexts/SessionContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { SessionProvider, useSession } from '@/contexts/SessionContext';

describe('SessionContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SessionProvider sessionId="test-123">{children}</SessionProvider>
  );
  
  it('should handle session state updates', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    
    act(() => {
      result.current.dispatch({
        type: 'SET_SESSION',
        payload: mockSession
      });
    });
    
    expect(result.current.state.currentSession).toEqual(mockSession);
  });
  
  it('should handle transcription addition', () => {
    const { result } = renderHook(() => useTranscriptions(), { wrapper });
    
    act(() => {
      result.current.addTranscription(mockTranscriptionData);
    });
    
    expect(result.current.transcriptions).toContain(mockTranscriptionData);
  });
});
```

### 2. コンポーネント統合テスト

```typescript
// __tests__/pages/SessionDetail.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionDetailPage from '@/pages/sessions/[id]/page';

describe('SessionDetail Page', () => {
  it('should handle complete upload workflow', async () => {
    render(<SessionDetailPage params={{ id: 'test-123' }} />);
    
    // ファイルアップロード
    const fileInput = screen.getByLabelText(/audio file/i);
    const audioFile = new File(['audio-content'], 'test.mp3', { type: 'audio/mp3' });
    
    await userEvent.upload(fileInput, audioFile);
    
    // 進捗表示確認
    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
    
    // 転写完了確認
    await waitFor(() => {
      expect(screen.getByText(/transcription completed/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});
```

---

## 📋 実装スケジュール (48時間)

### Day 1 (24時間)
```typescript
const day1Tasks = {
  hours_0_8: [
    '型定義作成 (types/session.ts)',
    'Context・Provider実装',
    'Reducer実装・テスト'
  ],
  hours_8_16: [
    'カスタムフック群実装',
    'SessionHeader コンポーネント分割',
    'UploadSection コンポーネント分割'
  ],
  hours_16_24: [
    'CompareSection コンポーネント分割',
    '基本テスト実装',
    '動作確認・デバッグ'
  ]
};
```

### Day 2 (24時間)
```typescript
const day2Tasks = {
  hours_0_8: [
    'パフォーマンス最適化実装',
    'メモ化・仮想化リスト',
    '詳細テスト実装'
  ],
  hours_8_16: [
    'WebSocket統合テスト',
    'エラーハンドリング強化',
    'アクセシビリティ確認'
  ],
  hours_16_24: [
    '最終統合テスト',
    'パフォーマンステスト',
    '本番デプロイ準備'
  ]
};
```

---

## 🎯 期待される成果

### パフォーマンス向上
```typescript
const performanceTargets = {
  bundleSize: '40%削減 (200KB → 120KB)',
  initialLoad: '60%高速化 (5秒 → 2秒)',
  memoryUsage: '50%削減',
  reRenderCount: '80%削減'
};
```

### 保守性向上
```typescript
const maintainabilityImprovements = {
  codeComplexity: '70%削減',
  testCoverage: '95%達成',
  componentReusability: '300%向上',
  developmentSpeed: '200%向上'
};
```

---

## 🚨 技術委員会への指示

### 即座実行項目
1. **型定義作成開始** - `types/session.ts` 作成
2. **Context実装開始** - `contexts/SessionContext.tsx` 作成
3. **Reducer実装開始** - `reducers/sessionReducer.ts` 作成

### 技術サポート
- **Prometheus**: アーキテクチャ相談・設計レビュー
- **品質委員会**: テスト戦略連携
- **UX委員会**: コンポーネント設計連携

---

**技術指導責任者**: Prometheus (Chief System Architect)  
**実装責任者**: Hephaestus (技術委員会委員長)  
**品質保証**: Athena (品質委員会委員長)

**48時間でフロントエンドを完全に革新しましょう！** 🔥⚡