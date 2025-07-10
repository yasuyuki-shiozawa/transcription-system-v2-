# 音声文字起こしフロー UX設計仕様書 v2.0

**作成者**: Aphrodite（UI/UXデザイナー・UX委員会委員長）  
**日付**: 2025-06-26  
**緊急度**: Critical  
**対象**: TranscriptionProgressIndicator統合による完全UXフロー

## 🎯 概要

IrisによるTranscriptionProgressIndicator実装を受け、音声文字起こし全体のUX体験を包括的に設計します。アップロード→処理→完了の全段階で最高のユーザー体験を提供します。

## 📊 現在の実装分析

### ✅ 実装済み機能
1. **WebSocket進捗表示**: `transcriptionId`による リアルタイム更新
2. **状態管理**: `isTranscribing`による処理状態の制御
3. **エラーハンドリング**: `handleTranscriptionError`による失敗対応
4. **完了処理**: `handleTranscriptionComplete`による成功処理

### 🔧 技術的統合ポイント
```typescript
// 新たに追加された状態
const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
const [isTranscribing, setIsTranscribing] = useState(false);

// WebSocket進捗表示の統合
{isTranscribing && transcriptionId && (
  <TranscriptionProgressIndicator
    transcriptionId={transcriptionId}
    onComplete={handleTranscriptionComplete}
    onError={handleTranscriptionError}
  />
)}
```

## 🌊 完全UXフロー設計

### Phase 1: ファイル選択・検証
```
[ドラッグ&ドロップエリア] → [ファイル検証] → [音声プレビュー]
```

**UX要素**:
- ✨ ホバー時の視覚的フィードバック
- 🎵 音声ファイル専用アイコンアニメーション
- ✅ リアルタイム検証結果表示

### Phase 2: アップロード進行
```
[アップロード開始] → [進捗表示] → [完了確認]
```

**現在の実装**:
```typescript
{uploadProgress > 0 && (
  <div className="space-y-2">
    <div className="flex justify-between text-sm text-gray-600">
      <span>アップロード中...</span>
      <span>{uploadProgress}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className="bg-blue-600 h-2 rounded-full transition-all duration-500"
           style={{ width: `${uploadProgress}%` }} />
    </div>
  </div>
)}
```

**UX改善提案**:
- 🌊 スムーズな進捗アニメーション
- 📊 ファイルサイズ・速度情報の表示
- 🎵 音声波形風の進捗バー

### Phase 3: 文字起こし処理 ⭐**新実装**
```
[処理開始] → [WebSocket進捗] → [リアルタイム更新] → [完了]
```

**現在の実装**:
```typescript
// WebSocket進捗表示開始
if (data.data?.transcriptionId) {
  setTranscriptionId(data.data.transcriptionId);
  setIsTranscribing(true);
}

// 進捗コンポーネント表示
{isTranscribing && transcriptionId && (
  <TranscriptionProgressIndicator
    transcriptionId={transcriptionId}
    onComplete={handleTranscriptionComplete}
    onError={handleTranscriptionError}
  />
)}
```

## 🎨 UX改善仕様

### 1. 音声処理専用ビジュアル

#### 音声波形アニメーション
```css
.audio-processing-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
}

.audio-bar {
  width: 3px;
  background: linear-gradient(to top, var(--color-primary-400), var(--color-primary-600));
  border-radius: 2px;
  animation: audio-pulse 1.5s ease-in-out infinite;
}

.audio-bar:nth-child(1) { height: 12px; animation-delay: 0s; }
.audio-bar:nth-child(2) { height: 18px; animation-delay: 0.1s; }
.audio-bar:nth-child(3) { height: 24px; animation-delay: 0.2s; }
.audio-bar:nth-child(4) { height: 18px; animation-delay: 0.3s; }
.audio-bar:nth-child(5) { height: 12px; animation-delay: 0.4s; }

@keyframes audio-pulse {
  0%, 100% { transform: scaleY(0.5); opacity: 0.6; }
  50% { transform: scaleY(1.2); opacity: 1; }
}
```

#### 処理段階の表現
```jsx
const TranscriptionStages = [
  { id: 'upload', label: 'アップロード', icon: '📤', status: 'completed' },
  { id: 'process', label: 'AI分析中', icon: '🎵', status: 'current' },
  { id: 'transcribe', label: '文字起こし', icon: '✍️', status: 'pending' },
  { id: 'complete', label: '完了', icon: '✅', status: 'pending' }
];
```

### 2. エラー状態のUX改善

#### 親しみやすいエラーメッセージ
```typescript
const transcriptionErrorMessages = {
  'network_error': {
    title: '接続に問題が発生しました',
    message: 'インターネット接続を確認して、もう一度お試しください。',
    icon: '🌐',
    actions: ['再試行', 'オフラインで保存']
  },
  'file_too_large': {
    title: 'ファイルサイズが大きすぎます',
    message: '100MB以下のファイルをお選びください。長い音声は分割してアップロードできます。',
    icon: '📏',
    actions: ['ファイルを分割', '別ファイルを選択']
  },
  'transcription_failed': {
    title: '音声の認識が困難でした',
    message: 'ノイズが多いか、音質が不明瞭な可能性があります。',
    icon: '🎤',
    actions: ['音質改善のヒント', '手動で修正']
  }
};
```

### 3. 成功体験の演出

#### 完了時のマイクロアニメーション
```css
@keyframes transcription-success {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.transcription-complete {
  animation: transcription-success 0.6s ease-out;
  background: linear-gradient(135deg, var(--color-success-400), var(--color-success-600));
  color: white;
  padding: var(--spacing-4);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
}
```

#### 結果プレビューの設計
```jsx
const TranscriptionResult = ({ result }) => (
  <div className="transcription-result">
    <div className="result-header">
      <h3>文字起こし完了！ 🎉</h3>
      <span className="processing-time">処理時間: {result.processingTime}秒</span>
    </div>
    <div className="result-preview">
      <p>{result.preview}...</p>
      <button>全文を確認</button>
    </div>
    <div className="result-actions">
      <button className="primary">結果を保存</button>
      <button className="secondary">もう一度処理</button>
    </div>
  </div>
);
```

## 🔧 技術実装ガイド

### TranscriptionProgressIndicator 拡張提案

```typescript
interface TranscriptionProgressProps {
  transcriptionId: string;
  onComplete: (result: TranscriptionResult) => void;
  onError: (error: TranscriptionError) => void;
  onProgress?: (progress: ProgressUpdate) => void;
  showDetailedStages?: boolean;
  showAudioVisualization?: boolean;
}

interface ProgressUpdate {
  stage: 'analyzing' | 'transcribing' | 'finalizing';
  progress: number; // 0-100
  estimatedTimeRemaining?: number;
  currentOperation?: string;
}
```

### WebSocket メッセージ形式
```typescript
type WebSocketMessage = {
  type: 'progress' | 'stage_change' | 'complete' | 'error';
  transcriptionId: string;
  data: {
    progress?: number;
    stage?: string;
    operation?: string;
    result?: TranscriptionResult;
    error?: TranscriptionError;
  };
};
```

## 📱 レスポンシブ対応

### モバイル特化の設計
```css
@media (max-width: 768px) {
  .transcription-flow {
    /* 縦画面での最適化 */
    flex-direction: column;
  }
  
  .audio-visualization {
    /* タッチデバイスでの音声バー表示 */
    scale: 1.2;
    margin: var(--spacing-4) 0;
  }
  
  .progress-stages {
    /* ステップ表示の簡略化 */
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-2);
  }
}
```

## ♿ アクセシビリティ強化

### スクリーンリーダー対応
```jsx
<div role="progressbar" 
     aria-valuenow={progress} 
     aria-valuemin="0" 
     aria-valuemax="100"
     aria-label={`音声文字起こし処理中: ${stage} - ${progress}%完了`}>
  
  <div aria-live="polite" aria-atomic="true">
    {currentOperation && (
      <span className="sr-only">
        現在の処理: {currentOperation}
      </span>
    )}
  </div>
</div>
```

### 高コントラスト対応
```css
@media (prefers-contrast: high) {
  .audio-processing-indicator {
    --color-primary-400: #0066cc;
    --color-primary-600: #003d7a;
  }
  
  .transcription-progress {
    border: 2px solid currentColor;
    background: var(--color-background);
  }
}
```

## 🎯 成功指標・KPI

### ユーザー体験指標
- **処理時間の体感短縮**: 30%目標
- **エラー復旧率**: 90%以上
- **完了時満足度**: 95%以上

### 技術指標
- **WebSocket接続安定性**: 99%
- **進捗更新の遅延**: 100ms以下
- **メモリ使用量**: 最適化済み

## 🚀 実装優先度

### Phase 1（今日中）
- [x] TranscriptionProgressIndicator統合確認
- [ ] 音声波形アニメーション実装
- [ ] エラーメッセージ改善

### Phase 2（48時間以内）
- [ ] 処理段階の詳細表示
- [ ] 成功時のマイクロアニメーション
- [ ] モバイル対応最適化

### Phase 3（1週間以内）
- [ ] アクセシビリティ完全対応
- [ ] パフォーマンス最適化
- [ ] ユーザーテスト実施

## 💡 Iris への実装提案

### 即座対応項目
1. **音声波形アニメーション**: CSS追加で実現可能
2. **エラーメッセージ改善**: 既存エラーハンドリングの拡張
3. **進捗詳細表示**: WebSocketメッセージの活用

### 技術的サポート
- デザイントークンの活用
- 既存コンポーネントとの整合性確保
- パフォーマンス最適化の考慮

## 🎨 結論

**TranscriptionProgressIndicatorの実装により、音声文字起こしのUXが次のレベルに到達！**

この仕様書に基づく改善により、ユーザーは：
- 📊 **処理の透明性**: 何が起きているかを明確に理解
- 🎵 **音声処理の実感**: AIが音声を「聞いている」感覚
- ✨ **成功の喜び**: 完了時の達成感と満足度

業界トップクラスの音声UIを実現し、ユーザーが「また使いたい」と思える体験を創造します。

---

**[DESIGN]** 音声AIとユーザーをつなぐ、美しい架け橋を築きましょう 🎵✨

**設計者**: Aphrodite（アフロディーテ）