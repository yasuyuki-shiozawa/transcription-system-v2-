// セクション選択状態データベースモデル
export interface SectionSelectionModel {
  id: number;
  sessionId: string;
  sectionId: string;
  isSelected: boolean;
  source: 'NOTTA' | 'MANUS';
  createdAt: Date;
  updatedAt: Date;
}

// Prisma拡張用のスキーマ型定義
export interface SectionSelectionCreateInput {
  sessionId: string;
  sectionId: string;
  isSelected: boolean;
  source: 'NOTTA' | 'MANUS';
}

export interface SectionSelectionUpdateInput {
  isSelected?: boolean;
  updatedAt?: Date;
}

// API レスポンス用の集約データ型
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