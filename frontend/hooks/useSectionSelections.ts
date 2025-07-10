import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SectionSelectionState,
  SelectionStats,
  UseSectionSelectionsReturn,
  SelectionUpdateRequest
} from '../types/SectionSelection';

// デバウンス用のタイマー管理
const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: unknown[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

export const useSectionSelections = (sessionId: string): UseSectionSelectionsReturn => {
  const [selections, setSelections] = useState<SectionSelectionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 統計計算
  const calculateStats = useCallback((state: SectionSelectionState | null): SelectionStats => {
    if (!state) {
      return {
        selectedCount: 0,
        totalCount: 0,
        progress: 0,
        nattaSelected: 0,
        manusSelected: 0
      };
    }

    const selectionEntries = Object.entries(state.selections);
    const selectedEntries = selectionEntries.filter(([, sel]) => sel.isSelected);
    
    return {
      selectedCount: selectedEntries.length,
      totalCount: selectionEntries.length,
      progress: selectionEntries.length > 0 ? (selectedEntries.length / selectionEntries.length) * 100 : 0,
      nattaSelected: selectedEntries.filter(([, sel]) => sel.source === 'NOTTA').length,
      manusSelected: selectedEntries.filter(([, sel]) => sel.source === 'MANUS').length
    };
  }, []);

  const stats = calculateStats(selections);

  // API通信: 選択状態取得
  const fetchSelections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/sessions/${sessionId}/selections`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch selections: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSelections(data.data);
        setLastSaved(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch selections');
      }
    } catch (err) {
      console.error('Error fetching selections:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // エラー時は空の状態で初期化
      setSelections({
        sessionId,
        selections: {},
        metadata: {
          lastUpdated: Date.now(),
          totalSelected: 0,
          selectionMode: 'inclusive'
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // API通信: 選択状態保存
  const saveSelections = useCallback(async (state: SectionSelectionState) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/selections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
      });

      if (!response.ok) {
        throw new Error(`Failed to save selections: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to save selections');
      }
    } catch (err) {
      console.error('Error saving selections:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }, [sessionId]);

  // デバウンス付き保存
  const debouncedSave = useDebounce(saveSelections, 1000);

  // 選択状態更新
  const updateSelection = useCallback(async (sectionId: string, isSelected: boolean) => {
    if (!selections) return;

    const updatedSelections: SectionSelectionState = {
      ...selections,
      selections: {
        ...selections.selections,
        [sectionId]: {
          ...selections.selections[sectionId],
          isSelected,
          timestamp: Date.now()
        }
      },
      metadata: {
        ...selections.metadata,
        lastUpdated: Date.now(),
        totalSelected: Object.values({
          ...selections.selections,
          [sectionId]: {
            ...selections.selections[sectionId],
            isSelected
          }
        }).filter(sel => sel.isSelected).length
      }
    };

    setSelections(updatedSelections);
    setHasUnsavedChanges(true);
    
    // デバウンス付きで保存
    debouncedSave(updatedSelections);
  }, [selections, debouncedSave]);

  // 全選択
  const selectAll = useCallback(async () => {
    if (!selections) return;

    const updatedSelections: SectionSelectionState = {
      ...selections,
      selections: Object.fromEntries(
        Object.entries(selections.selections).map(([id, sel]) => [
          id,
          { ...sel, isSelected: true, timestamp: Date.now() }
        ])
      ),
      metadata: {
        ...selections.metadata,
        lastUpdated: Date.now(),
        totalSelected: Object.keys(selections.selections).length
      }
    };

    setSelections(updatedSelections);
    setHasUnsavedChanges(true);
    debouncedSave(updatedSelections);
  }, [selections, debouncedSave]);

  // 全解除
  const selectNone = useCallback(async () => {
    if (!selections) return;

    const updatedSelections: SectionSelectionState = {
      ...selections,
      selections: Object.fromEntries(
        Object.entries(selections.selections).map(([id, sel]) => [
          id,
          { ...sel, isSelected: false, timestamp: Date.now() }
        ])
      ),
      metadata: {
        ...selections.metadata,
        lastUpdated: Date.now(),
        totalSelected: 0
      }
    };

    setSelections(updatedSelections);
    setHasUnsavedChanges(true);
    debouncedSave(updatedSelections);
  }, [selections, debouncedSave]);

  // 選択反転
  const invertSelection = useCallback(async () => {
    if (!selections) return;

    const updatedSelections: SectionSelectionState = {
      ...selections,
      selections: Object.fromEntries(
        Object.entries(selections.selections).map(([id, sel]) => [
          id,
          { ...sel, isSelected: !sel.isSelected, timestamp: Date.now() }
        ])
      ),
      metadata: {
        ...selections.metadata,
        lastUpdated: Date.now(),
        totalSelected: Object.values(selections.selections).filter(sel => !sel.isSelected).length
      }
    };

    setSelections(updatedSelections);
    setHasUnsavedChanges(true);
    debouncedSave(updatedSelections);
  }, [selections, debouncedSave]);

  // 初期データ取得
  useEffect(() => {
    if (sessionId) {
      fetchSelections();
    }
  }, [sessionId, fetchSelections]);

  return {
    selections,
    stats,
    updateSelection,
    selectAll,
    selectNone,
    invertSelection,
    isLoading,
    hasUnsavedChanges,
    lastSaved,
    error
  };
};