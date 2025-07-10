// セクション選択状態管理型定義
export interface SectionSelectionState {
  sessionId: string;
  selections: {
    [sectionId: string]: {
      isSelected: boolean;
      timestamp: number;
      source: 'NOTTA' | 'MANUS';
    };
  };
  metadata: {
    lastUpdated: number;
    totalSelected: number;
    selectionMode: 'inclusive' | 'exclusive';
  };
}

// API レスポンス形式
export interface SelectionResponse {
  success: boolean;
  data: SectionSelectionState;
  message?: string;
}

// セクション選択統計
export interface SelectionStats {
  selectedCount: number;
  totalCount: number;
  progress: number; // 0-100%
  nattaSelected: number;
  manusSelected: number;
}

// セクション選択更新リクエスト
export interface SelectionUpdateRequest {
  sectionId: string;
  isSelected: boolean;
  source: 'NOTTA' | 'MANUS';
}

// セクション選択管理フック戻り値
export interface UseSectionSelectionsReturn {
  selections: SectionSelectionState | null;
  stats: SelectionStats;
  updateSelection: (sectionId: string, isSelected: boolean) => Promise<void>;
  selectAll: () => Promise<void>;
  selectNone: () => Promise<void>;
  invertSelection: () => Promise<void>;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  error: string | null;
}

// 累積統合データ
export interface CumulativeData {
  totalSections: number;
  selectedSections: number;
  excludedSections: number;
  selectionRate: number;
  lastActivity: number;
}