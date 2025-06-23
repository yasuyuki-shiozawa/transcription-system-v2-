# 議会議事録作成システム 第3フェーズ設計書

## 1. 概要

### 1.1 目的
第1フェーズで作成したnottaのセクション番号付きデータと、第2フェーズでManusが生成したセクション番号付きデータを統合し、効率的に管理・参照できるシステムを構築する。

### 1.2 スコープ
- nottaデータとManusデータの取り込み機能
- データの統合・管理機能
- 両データの同期表示機能
- 基本的なデータ操作API

## 2. システムアーキテクチャ

### 2.1 全体構成
```
┌─────────────────┐     ┌─────────────────┐
│  nottaデータ    │     │  Manusデータ    │
│ (セクション付)  │     │ (セクション付)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │ データ統合   │
              │   サービス   │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  データベース │
              │ (PostgreSQL) │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   REST API   │
              │  (Express)   │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ Webフロント  │
              │  (Next.js)   │
              └─────────────┘
```

### 2.2 技術スタック
- **バックエンド**: Node.js + Express + TypeScript
- **データベース**: PostgreSQL
- **フロントエンド**: Next.js + React + TypeScript
- **ORM**: Prisma
- **認証**: JWT
- **ファイルストレージ**: ローカル/S3互換

## 3. データモデル

### 3.1 主要エンティティ

#### 3.1.1 Session（議会セッション）
```typescript
interface Session {
  id: string;
  name: string;
  date: Date;
  status: 'draft' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3.1.2 TranscriptionData（文字起こしデータ）
```typescript
interface TranscriptionData {
  id: string;
  sessionId: string;
  source: 'notta' | 'manus';
  originalFileName: string;
  uploadedAt: Date;
  processedAt: Date;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
}
```

#### 3.1.3 Section（セクション）
```typescript
interface Section {
  id: string;
  transcriptionDataId: string;
  sectionNumber: string;  // 例: "0001"
  speaker: string;        // 例: "話者1"
  timestamp: string;      // 例: "05:18"
  content: string;
  nottaContent?: string;  // nottaのテキスト
  manusContent?: string;  // Manusのテキスト
  isMatched: boolean;     // 両データの対応付け状態
  order: number;
}
```

#### 3.1.4 SectionMapping（セクション対応付け）
```typescript
interface SectionMapping {
  id: string;
  sessionId: string;
  nottaSectionId: string;
  manusSectionId: string;
  confidence: number;     // マッチング確信度 (0-1)
  isManuallyMapped: boolean;
  createdAt: Date;
}
```

## 4. 主要機能

### 4.1 データ取り込み機能
1. **ファイルアップロード**
   - nottaの出力ファイル（セクション番号付き）
   - Manusの出力ファイル（セクション番号付き）
   
2. **自動パース**
   - セクション番号の認識
   - 話者情報の抽出
   - タイムスタンプの解析

3. **データ検証**
   - フォーマットチェック
   - セクション番号の連続性確認
   - 重複チェック

### 4.2 データマッチング機能
1. **自動マッチング**
   - セクション番号による対応付け
   - タイムスタンプによる補助的マッチング
   - 話者情報による検証

2. **手動調整**
   - マッチングの修正
   - 欠落セクションの処理
   - 分割・結合操作

### 4.3 データ表示機能
1. **並列表示**
   - nottaとManusのデータを左右に表示
   - セクション単位での同期スクロール
   - 差分ハイライト

2. **統合ビュー**
   - マージされたデータの表示
   - 編集モード

## 5. API設計

### 5.1 エンドポイント一覧

#### セッション管理
- `POST /api/sessions` - 新規セッション作成
- `GET /api/sessions` - セッション一覧取得
- `GET /api/sessions/:id` - セッション詳細取得
- `PUT /api/sessions/:id` - セッション更新
- `DELETE /api/sessions/:id` - セッション削除

#### データアップロード
- `POST /api/sessions/:id/upload/notta` - nottaデータアップロード
- `POST /api/sessions/:id/upload/manus` - Manusデータアップロード

#### セクション管理
- `GET /api/sessions/:id/sections` - セクション一覧取得
- `GET /api/sections/:id` - セクション詳細取得
- `PUT /api/sections/:id` - セクション更新
- `POST /api/sessions/:id/sections/match` - セクションマッチング実行
- `PUT /api/section-mappings/:id` - マッピング更新

## 6. 画面設計

### 6.1 セッション一覧画面
- セッションリスト表示
- 新規作成ボタン
- ステータスフィルター

### 6.2 データアップロード画面
- ドラッグ&ドロップ対応
- ファイル種別選択（notta/Manus）
- アップロード進捗表示

### 6.3 データ統合画面
```
┌─────────────────────────────────────────────┐
│ [戻る] セッション: 令和6年第1回定例会       │
├─────────────────────────┬───────────────────┤
│ NOTTAデータ            │ Manusデータ      │
├─────────────────────────┼───────────────────┤
│【セクション：0001】    │【セクション：0001】│
│[話者1][05:18]         │[話者1][05:18]     │
│おはようございます...   │おはようございます... │
├─────────────────────────┼───────────────────┤
│【セクション：0002】    │【セクション：0002】│
│[話者2][05:27]         │[話者2][05:27]     │
│健次議員から...         │〇〇議員から...     │
└─────────────────────────┴───────────────────┘
[自動マッチング] [手動調整] [エクスポート]
```

## 7. 実装計画

### 7.1 フェーズ分け
1. **Phase 3-1**: 基本インフラ構築（1週間）
   - プロジェクト初期設定
   - データベース設計・構築
   - 基本APIの実装

2. **Phase 3-2**: データ取り込み機能（1週間）
   - ファイルアップロードAPI
   - パーサーの実装
   - データ保存処理

3. **Phase 3-3**: マッチング機能（1週間）
   - 自動マッチングアルゴリズム
   - 手動調整API
   - マッチング結果の保存

4. **Phase 3-4**: フロントエンド実装（2週間）
   - 画面コンポーネント作成
   - API連携
   - UI/UXの調整

### 7.2 開発環境
```bash
transcription-system/
├── backend/                # バックエンドAPI
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   ├── prisma/
│   └── package.json
├── frontend/              # Next.jsフロントエンド
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   └── package.json
├── shared/                # 共有型定義
└── docker-compose.yml     # 開発環境
```

## 8. 非機能要件

### 8.1 パフォーマンス
- 1万セクションまでのデータを3秒以内に表示
- ファイルアップロード: 50MBまで対応

### 8.2 セキュリティ
- 認証機能（第4フェーズで実装予定）
- データの暗号化保存
- アクセスログの記録

### 8.3 拡張性
- 第4フェーズ（録音再生機能）への対応を考慮
- プラグイン可能なパーサー設計

## 9. リスクと対策

### 9.1 技術的リスク
- **リスク**: Manusのデータフォーマットが不明
- **対策**: サンプルデータの早期入手、柔軟なパーサー設計

### 9.2 性能リスク
- **リスク**: 大量データでの表示速度低下
- **対策**: ページネーション、仮想スクロールの実装

## 10. 成功基準
- nottaとManusの両データを正確に取り込める
- セクション番号による自動マッチングが90%以上成功
- 手動調整が直感的に行える
- 第4フェーズへスムーズに移行できる設計