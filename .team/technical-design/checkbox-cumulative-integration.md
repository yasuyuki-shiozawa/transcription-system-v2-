# 📋 チェックボックス累積統合機能 詳細設計書

**設計書ID**: TDD-001  
**作成者**: Hephaestus (技術委員会委員長)  
**作成日**: 2025年6月26日  
**期限**: 2025年6月27日 17:30 JST  
**レビュー対象**: Iris・Athena・Aphrodite・Minerva

---

## 1. 📊 機能概要 - 統合効果とユーザビリティ目標

### 1.1 機能概要
セクション別チェックボックス選択状態の累積統合機能により、ユーザーがセクション管理を効率的に行えるシステムを構築。

### 1.2 統合効果目標
- **作業効率向上**: セクション選択作業の50%効率化
- **ユーザビリティ向上**: 直感的なUI操作による使いやすさ向上
- **データ整合性確保**: 選択状態の永続化と一貫性保証
- **システム安定性**: エラー耐性とフォールバック機能

### 1.3 ビジネス価値
- **議事録作成時間短縮**: 平均30%の作業時間削減
- **操作ミス削減**: チェック状態の可視化による確認作業簡素化
- **データ保全性向上**: セッション状態の確実な保存

---

## 2. 🔍 現状分析 - 既存コード課題と変更箇所

### 2.1 現状のコード構造
```typescript
// 現在のセクション管理 (app/sessions/[id]/page.tsx)
const [excludedSections, setExcludedSections] = useState<Set<string>>(new Set());

// 問題点：
// 1. 選択状態の可視化不足
// 2. 累積統合機能の欠如
// 3. 永続化メカニズムの不完全
```

### 2.2 特定された課題
1. **UI課題**: チェックボックス状態の視覚的フィードバック不足
2. **状態管理課題**: セクション選択状態の複雑な管理
3. **データ永続化課題**: ブラウザリロード時の状態復元不完全
4. **統合機能課題**: セクション間の関連性管理不足

### 2.3 変更対象ファイル
```
frontend/
├── app/sessions/[id]/page.tsx - メイン状態管理
├── components/EditableManusSection.tsx - セクション表示
└── backend/
    └── src/routes/sessionRoutes.ts - 状態永続化API
```

---

## 3. 🔧 技術仕様 - データ構造・アルゴリズム・UI設計

### 3.1 データ構造設計
```typescript
// セクション選択状態管理
interface SectionSelectionState {
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
interface SelectionResponse {
  success: boolean;
  data: SectionSelectionState;
  message?: string;
}
```

### 3.2 アルゴリズム設計
```typescript
// 累積統合アルゴリズム
class SectionSelectionManager {
  // 1. 状態更新アルゴリズム
  updateSelection(sectionId: string, isSelected: boolean): SectionSelectionState {
    // デバウンス処理 (300ms)
    // 状態の原子性保証
    // 変更履歴の記録
  }

  // 2. 統合計算アルゴリズム
  calculateCumulativeState(): CumulativeData {
    // 選択されたセクションの統計計算
    // 依存関係の検証
    // 整合性チェック
  }

  // 3. 永続化アルゴリズム
  persistState(): Promise<boolean> {
    // バックエンドAPIへの非同期保存
    // エラーハンドリング
    // リトライ機構
  }
}
```

### 3.3 UI設計仕様
```tsx
// チェックボックス統合UI
interface CheckboxIntegrationUI {
  // ビジュアルフィードバック
  selectedCount: number;
  totalCount: number;
  progress: number; // 0-100%
  
  // 操作UI
  selectAll: () => void;
  selectNone: () => void;
  invertSelection: () => void;
  
  // 状態表示
  isLoading: boolean;
  hasChanges: boolean;
  lastSaved: Date;
}
```

---

## 4. 📅 実装計画 - Phase分割とファイル別変更内容

### 4.1 Phase 1: 基盤実装 (6時間)
```typescript
// app/sessions/[id]/page.tsx
// 1. 状態管理の拡張
const [sectionSelections, setSectionSelections] = useState<SectionSelectionState>();
const [selectionStats, setSelectionStats] = useState<SelectionStats>();

// 2. API統合
const saveSectionSelections = async (selections: SectionSelectionState) => {
  // バックエンドAPIとの統合
};
```

### 4.2 Phase 2: UI実装 (4時間)
```tsx
// components/SectionSelectionManager.tsx (新規作成)
export const SectionSelectionManager: React.FC = () => {
  return (
    <div className="section-selection-manager">
      <SelectionControls />
      <SelectionStats />
      <SelectionHistory />
    </div>
  );
};
```

### 4.3 Phase 3: バックエンド実装 (4時間)
```typescript
// backend/src/routes/sectionSelectionRoutes.ts (新規作成)
router.post('/sessions/:id/selections', saveSectionSelections);
router.get('/sessions/:id/selections', getSectionSelections);
router.put('/sessions/:id/selections', updateSectionSelections);
```

### 4.4 Phase 4: 統合テスト (4時間)
- ユニットテスト実装
- 統合テスト実行
- UI/UXテスト
- パフォーマンステスト

---

## 5. 🔄 データ移行戦略 - 互換性確保

### 5.1 既存データ互換性
```typescript
// 既存のexcludedSections形式からの移行
const migrateExistingData = (excludedSections: Set<string>): SectionSelectionState => {
  return {
    sessionId: currentSessionId,
    selections: Array.from(excludedSections).reduce((acc, sectionId) => ({
      ...acc,
      [sectionId]: {
        isSelected: false, // excluded = not selected
        timestamp: Date.now(),
        source: determineSectionSource(sectionId)
      }
    }), {}),
    metadata: {
      lastUpdated: Date.now(),
      totalSelected: 0,
      selectionMode: 'exclusive'
    }
  };
};
```

### 5.2 段階的移行計画
1. **Phase 1**: 既存データの自動移行
2. **Phase 2**: 新旧システムの並行運用
3. **Phase 3**: 旧システムの段階的廃止
4. **Phase 4**: 新システムへの完全移行

### 5.3 データ整合性保証
- **自動検証**: データ移行時の整合性チェック
- **フォールバック**: 移行失敗時の既存システム復帰
- **ログ記録**: 移行プロセスの詳細ログ

---

## 6. 🧪 テスト計画 - 単体・統合・ユーザビリティテスト

### 6.1 単体テスト計画
```typescript
// components/__tests__/SectionSelectionManager.test.tsx
describe('SectionSelectionManager', () => {
  test('should update selection state correctly', () => {
    // 選択状態更新の正確性テスト
  });
  
  test('should persist state to backend', () => {
    // バックエンド永続化テスト
  });
  
  test('should handle errors gracefully', () => {
    // エラーハンドリングテスト
  });
});
```

### 6.2 統合テスト計画
```typescript
// integration-tests/selection-integration.test.ts
describe('Selection Integration', () => {
  test('Frontend-Backend data sync', () => {
    // フロントエンド-バックエンド統合テスト
  });
  
  test('State persistence across sessions', () => {
    // セッション間の状態永続化テスト
  });
});
```

### 6.3 ユーザビリティテスト計画
- **操作効率テスト**: 従来比の作業時間測定
- **直感性テスト**: 初見ユーザーの操作成功率
- **エラー回復テスト**: エラー発生時の回復操作

### 6.4 パフォーマンステスト
- **レスポンス時間**: < 200ms目標
- **メモリ使用量**: 既存比+10%以内
- **CPU使用率**: 既存比+5%以内

---

## 7. ⚠️ リスク分析 - 技術的リスクと対策

### 7.1 高リスク項目
| リスク項目 | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| 状態同期エラー | 高 | 中 | デバウンス処理・リトライ機構 |
| パフォーマンス劣化 | 中 | 中 | 最適化・プロファイリング |
| データ整合性問題 | 高 | 低 | 厳密な検証・ロールバック |

### 7.2 技術的リスク詳細

#### 7.2.1 状態管理の複雑化
**リスク**: React状態管理の複雑化によるバグ増加
**対策**: 
- Redux Toolkit採用検討
- 状態管理の単純化
- 包括的テスト実装

#### 7.2.2 API通信の不安定性
**リスク**: ネットワーク問題による状態同期失敗
**対策**:
- オフライン対応機能
- 楽観的更新 + ロールバック
- エラー時の明確なユーザーフィードバック

### 7.3 リスク軽減戦略
- **段階的実装**: 小さな単位での実装・テスト
- **フィーチャーフラグ**: 新機能の段階的ロールアウト
- **モニタリング**: リアルタイム監視とアラート

---

## 8. 📅 実装スケジュール - タイムラインと責任分担

### 8.1 詳細スケジュール
```
Day 1 (2025-06-26)
├── 17:30-21:30 Phase 1: 基盤実装 (Hephaestus)
└── 21:30-22:00 設計レビュー (全チーム)

Day 2 (2025-06-27)  
├── 09:00-13:00 Phase 2: UI実装 (Iris + Hephaestus)
├── 13:00-17:00 Phase 3: バックエンド実装 (Hephaestus)
└── 17:00-21:00 Phase 4: 統合テスト (Athena + 全チーム)
```

### 8.2 責任分担
- **Hephaestus (技術委員会)**: バックエンド・API・統合
- **Iris (フロントエンド)**: UI/UX実装・コンポーネント開発
- **Athena (品質委員会)**: テスト計画・品質保証
- **Aphrodite (UX委員会)**: ユーザビリティ・デザイン検証
- **Minerva (CPO)**: プロジェクト管理・統合調整

### 8.3 マイルストーン
- **M1**: 基盤実装完了 (Day 1 21:30)
- **M2**: UI実装完了 (Day 2 13:00)
- **M3**: バックエンド実装完了 (Day 2 17:00)
- **M4**: 統合テスト完了 (Day 2 21:00)

---

## 9. 💻 技術的詳細 - コード例とAPI仕様

### 9.1 React コンポーネント実装例
```tsx
// components/SectionSelectionManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSectionSelections } from '../hooks/useSectionSelections';

interface Props {
  sessionId: string;
  sections: SectionData[];
}

export const SectionSelectionManager: React.FC<Props> = ({ 
  sessionId, 
  sections 
}) => {
  const {
    selections,
    updateSelection,
    selectAll,
    selectNone,
    isLoading,
    hasUnsavedChanges
  } = useSectionSelections(sessionId);

  const handleSelectionChange = useCallback((
    sectionId: string, 
    isSelected: boolean
  ) => {
    updateSelection(sectionId, isSelected);
  }, [updateSelection]);

  return (
    <div className="section-selection-manager">
      {/* ヘッダー統計 */}
      <div className="selection-header">
        <span>選択済み: {selections.selectedCount}/{sections.length}</span>
        <div className="selection-actions">
          <button onClick={selectAll}>全選択</button>
          <button onClick={selectNone}>全解除</button>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="selection-progress">
        <div 
          className="progress-bar"
          style={{ width: `${selections.progress}%` }}
        />
      </div>

      {/* セクションリスト */}
      <div className="section-list">
        {sections.map(section => (
          <SectionCheckboxItem
            key={section.id}
            section={section}
            isSelected={selections.isSelected(section.id)}
            onChange={handleSelectionChange}
          />
        ))}
      </div>

      {/* 保存状態 */}
      {hasUnsavedChanges && (
        <div className="unsaved-indicator">
          未保存の変更があります
        </div>
      )}
    </div>
  );
};
```

### 9.2 API仕様詳細
```typescript
// API Endpoints

// 1. セクション選択状態取得
GET /api/sessions/{sessionId}/selections
Response: {
  success: boolean;
  data: SectionSelectionState;
}

// 2. セクション選択状態保存
POST /api/sessions/{sessionId}/selections
Request Body: SectionSelectionState
Response: {
  success: boolean;
  message: string;
}

// 3. セクション選択状態更新
PUT /api/sessions/{sessionId}/selections/{sectionId}
Request Body: {
  isSelected: boolean;
  timestamp: number;
}
Response: {
  success: boolean;
  data: UpdatedSelectionState;
}
```

### 9.3 データベーススキーマ拡張
```sql
-- section_selections テーブル追加
CREATE TABLE section_selections (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  section_id VARCHAR(255) NOT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  source VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, section_id)
);

-- インデックス追加
CREATE INDEX idx_section_selections_session ON section_selections(session_id);
CREATE INDEX idx_section_selections_updated ON section_selections(updated_at);
```

---

## 10. ✅ 完了基準 - 品質基準と受け入れ基準

### 10.1 機能完了基準
- ✅ **基本機能**: セクション選択・解除が正常動作
- ✅ **統合機能**: 累積統計計算が正確
- ✅ **永続化**: 状態がセッション間で保持
- ✅ **UI/UX**: 直感的な操作が可能

### 10.2 品質基準
| 項目 | 基準値 | 測定方法 |
|---|---|---|
| レスポンス時間 | < 200ms | パフォーマンステスト |
| テストカバレッジ | > 90% | Jest カバレッジレポート |
| ユーザビリティスコア | > 85% | SUS (System Usability Scale) |
| エラー率 | < 0.1% | エラーログ分析 |

### 10.3 受け入れ基準

#### 10.3.1 Iris (フロントエンド) 受け入れ基準
- ✅ React コンポーネントの型安全性
- ✅ UI/UX デザインガイドライン準拠
- ✅ アクセシビリティ基準 (WCAG 2.1 AA) 準拠
- ✅ レスポンシブデザイン対応

#### 10.3.2 Athena (品質委員会) 受け入れ基準
- ✅ 全テストケース PASS
- ✅ エラーハンドリング完備
- ✅ パフォーマンス基準クリア
- ✅ セキュリティ要件充足

#### 10.3.3 Aphrodite (UX委員会) 受け入れ基準
- ✅ ユーザビリティテスト合格
- ✅ 操作効率 30% 向上確認
- ✅ エラー発生時の適切な UX
- ✅ アクセシビリティ検証完了

#### 10.3.4 Minerva (CPO) 受け入れ基準
- ✅ ビジネス要件完全充足
- ✅ 実装スケジュール遵守
- ✅ 品質基準全項目クリア
- ✅ 事務所内テスト合格

### 10.4 最終チェックリスト
```
□ 機能テスト完了
□ パフォーマンステスト完了  
□ セキュリティテスト完了
□ ユーザビリティテスト完了
□ 統合テスト完了
□ ドキュメント完成
□ 全レビュー完了
□ 事務所内テスト準備完了
```

---

## 📋 設計書サマリー

### 🎯 設計書の価値実現
- ✅ **実装効率化**: 詳細な実装計画による開発速度向上
- ✅ **品質向上**: 包括的テスト計画による高品質保証
- ✅ **リスク軽減**: リスク分析による問題の事前防止
- ✅ **チーム連携**: 明確な責任分担による効率的協働
- ✅ **保守性向上**: 詳細ドキュメントによる将来的保守性確保

### 🚀 次のアクション
1. **設計レビュー**: Iris・Athena・Aphrodite・Minerva による確認
2. **実装開始**: Phase 1 基盤実装の着手
3. **進捗報告**: 24時間以内の完了目標達成

---

**作成者**: Hephaestus (技術委員会委員長)  
**承認待ち**: Iris・Athena・Aphrodite・Minerva  
**実装開始予定**: レビュー完了後即座  
**完了予定**: 2025年6月27日 21:00 JST