import { SectionSelectionState } from '../types/SectionSelection';

// セクションデータ型定義
interface SectionData {
  id: string;
  sectionNumber: string;
  speaker: string;
  content: string;
  isExcluded: boolean;
  source?: 'NOTTA' | 'MANUS';
}

// 既存のexcludedSections形式から新しいSectionSelectionState形式への移行
export const migrateExcludedSections = (
  sessionId: string,
  excludedSections: Set<string>,
  allSections: SectionData[]
): SectionSelectionState => {
  const selections: { [key: string]: any } = {};
  
  // 全セクションを処理
  allSections.forEach(section => {
    const isExcluded = excludedSections.has(section.id);
    
    selections[section.id] = {
      isSelected: !isExcluded, // excludedの逆が選択状態
      timestamp: Date.now(),
      source: section.source || determineSectionSource(section.sectionNumber)
    };
  });

  return {
    sessionId,
    selections,
    metadata: {
      lastUpdated: Date.now(),
      totalSelected: Object.values(selections).filter((sel: any) => sel.isSelected).length,
      selectionMode: 'inclusive'
    }
  };
};

// 新しいSectionSelectionState形式から既存のexcludedSections形式への変換
export const extractExcludedSections = (
  selectionState: SectionSelectionState
): Set<string> => {
  const excludedSections = new Set<string>();
  
  Object.entries(selectionState.selections).forEach(([sectionId, selection]) => {
    if (!selection.isSelected) {
      excludedSections.add(sectionId);
    }
  });
  
  return excludedSections;
};

// セクション番号からソースを判定
export const determineSectionSource = (sectionNumber: string): 'NOTTA' | 'MANUS' => {
  // NOTTA形式: "NOTTA_001", "NOTTA_002" など
  if (sectionNumber.startsWith('NOTTA_')) {
    return 'NOTTA';
  }
  
  // MANUS形式: 数字のみ "1", "2", "3" など
  if (/^\d+$/.test(sectionNumber)) {
    return 'MANUS';
  }
  
  // デフォルトはMANUS
  return 'MANUS';
};

// データ整合性チェック
export const validateSelectionState = (state: SectionSelectionState): boolean => {
  try {
    // 基本構造チェック
    if (!state.sessionId || !state.selections || !state.metadata) {
      return false;
    }
    
    // メタデータの整合性チェック
    const actualSelected = Object.values(state.selections).filter(sel => sel.isSelected).length;
    if (state.metadata.totalSelected !== actualSelected) {
      console.warn('Selection count mismatch detected');
      return false;
    }
    
    // 選択データの構造チェック
    for (const [sectionId, selection] of Object.entries(state.selections)) {
      if (
        typeof selection.isSelected !== 'boolean' ||
        typeof selection.timestamp !== 'number' ||
        !['NOTTA', 'MANUS'].includes(selection.source)
      ) {
        console.warn(`Invalid selection data for section ${sectionId}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating selection state:', error);
    return false;
  }
};

// 自動修復機能
export const repairSelectionState = (
  state: SectionSelectionState
): SectionSelectionState => {
  const repairedState = { ...state };
  
  // メタデータの修復
  const actualSelected = Object.values(state.selections).filter(sel => sel.isSelected).length;
  repairedState.metadata.totalSelected = actualSelected;
  repairedState.metadata.lastUpdated = Date.now();
  
  // 不正な選択データの修復
  Object.entries(repairedState.selections).forEach(([sectionId, selection]) => {
    if (typeof selection.isSelected !== 'boolean') {
      repairedState.selections[sectionId].isSelected = false;
    }
    
    if (typeof selection.timestamp !== 'number') {
      repairedState.selections[sectionId].timestamp = Date.now();
    }
    
    if (!['NOTTA', 'MANUS'].includes(selection.source)) {
      repairedState.selections[sectionId].source = determineSectionSource(sectionId);
    }
  });
  
  return repairedState;
};

// バックアップとリストア
export const createSelectionBackup = (state: SectionSelectionState): string => {
  return JSON.stringify({
    ...state,
    backupTimestamp: Date.now(),
    version: '1.0'
  });
};

export const restoreSelectionBackup = (backupString: string): SectionSelectionState | null => {
  try {
    const backup = JSON.parse(backupString);
    
    // バージョンチェック
    if (backup.version !== '1.0') {
      console.warn('Unsupported backup version');
      return null;
    }
    
    // バックアップ固有のフィールドを除去
    const { backupTimestamp, version, ...state } = backup;
    
    // 整合性チェック
    if (!validateSelectionState(state)) {
      return repairSelectionState(state);
    }
    
    return state;
  } catch (error) {
    console.error('Error restoring backup:', error);
    return null;
  }
};