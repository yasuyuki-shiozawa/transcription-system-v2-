# デザイントークン定義 v1.0

**作成者**: Aphrodite（UI/UXデザイナー）  
**日付**: 2025-06-26  
**バージョン**: 1.0  
**対象**: 音声文字起こしシステム

## 概要

デザインシステムの基盤となるデザイントークンを定義します。一貫性のあるUI実装と保守性向上を目的とします。

## CSS変数定義

### カラーパレット

#### プライマリーカラー（ブルー系）
```css
:root {
  /* Primary - メインアクション、リンク */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;  /* メインブルー */
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;
}
```

#### セマンティックカラー
```css
:root {
  /* Success - 成功状態 */
  --color-success-50: #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-success-700: #15803d;
  
  /* Warning - 警告状態 */
  --color-warning-50: #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  --color-warning-700: #b45309;
  
  /* Error - エラー状態 */
  --color-error-50: #fef2f2;
  --color-error-100: #fee2e2;
  --color-error-500: #ef4444;
  --color-error-600: #dc2626;
  --color-error-700: #b91c1c;
  
  /* Info - 情報表示 */
  --color-info-50: #f0f9ff;
  --color-info-100: #e0f2fe;
  --color-info-500: #0ea5e9;
  --color-info-600: #0284c7;
  --color-info-700: #0369a1;
}
```

#### ニュートラルカラー
```css
:root {
  /* Gray - 基本UI要素 */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
}
```

#### テーマカラー（ライト/ダーク）
```css
:root {
  /* Light Theme */
  --color-background: #ffffff;
  --color-foreground: #1f2937;
  --color-card: #ffffff;
  --color-card-foreground: #1f2937;
  --color-border: #e5e7eb;
  --color-input: #ffffff;
  --color-ring: #3b82f6;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark Theme */
    --color-background: #0f172a;
    --color-foreground: #f1f5f9;
    --color-card: #1e293b;
    --color-card-foreground: #f1f5f9;
    --color-border: #334155;
    --color-input: #1e293b;
    --color-ring: #3b82f6;
  }
}
```

### タイポグラフィ

#### フォントファミリー
```css
:root {
  --font-sans: 'Inter', 'Noto Sans JP', system-ui, -apple-system, sans-serif;
  --font-mono: 'Fira Code', 'SF Mono', Consolas, monospace;
}
```

#### フォントサイズ
```css
:root {
  --font-size-xs: 0.75rem;      /* 12px */
  --font-size-sm: 0.875rem;     /* 14px */
  --font-size-base: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;     /* 18px */
  --font-size-xl: 1.25rem;      /* 20px */
  --font-size-2xl: 1.5rem;      /* 24px */
  --font-size-3xl: 1.875rem;    /* 30px */
  --font-size-4xl: 2.25rem;     /* 36px */
}
```

#### 行間
```css
:root {
  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;
}
```

#### フォントウェイト
```css
:root {
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

### スペーシング

```css
:root {
  --spacing-0: 0;
  --spacing-px: 1px;
  --spacing-0-5: 0.125rem;    /* 2px */
  --spacing-1: 0.25rem;       /* 4px */
  --spacing-1-5: 0.375rem;    /* 6px */
  --spacing-2: 0.5rem;        /* 8px */
  --spacing-2-5: 0.625rem;    /* 10px */
  --spacing-3: 0.75rem;       /* 12px */
  --spacing-3-5: 0.875rem;    /* 14px */
  --spacing-4: 1rem;          /* 16px */
  --spacing-5: 1.25rem;       /* 20px */
  --spacing-6: 1.5rem;        /* 24px */
  --spacing-7: 1.75rem;       /* 28px */
  --spacing-8: 2rem;          /* 32px */
  --spacing-10: 2.5rem;       /* 40px */
  --spacing-12: 3rem;         /* 48px */
  --spacing-16: 4rem;         /* 64px */
  --spacing-20: 5rem;         /* 80px */
  --spacing-24: 6rem;         /* 96px */
}
```

### ボーダー

#### ボーダー幅
```css
:root {
  --border-width-0: 0px;
  --border-width-1: 1px;
  --border-width-2: 2px;
  --border-width-4: 4px;
  --border-width-8: 8px;
}
```

#### ボーダー半径
```css
:root {
  --border-radius-none: 0;
  --border-radius-sm: 0.125rem;   /* 2px */
  --border-radius-base: 0.25rem;  /* 4px */
  --border-radius-md: 0.375rem;   /* 6px */
  --border-radius-lg: 0.5rem;     /* 8px */
  --border-radius-xl: 0.75rem;    /* 12px */
  --border-radius-2xl: 1rem;      /* 16px */
  --border-radius-full: 9999px;
}
```

### シャドウ

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
}
```

### z-index

```css
:root {
  --z-index-dropdown: 1000;
  --z-index-sticky: 1020;
  --z-index-fixed: 1030;
  --z-index-modal-backdrop: 1040;
  --z-index-modal: 1050;
  --z-index-popover: 1060;
  --z-index-tooltip: 1070;
  --z-index-toast: 1080;
}
```

### トランジション

```css
:root {
  --transition-duration-75: 75ms;
  --transition-duration-100: 100ms;
  --transition-duration-150: 150ms;
  --transition-duration-200: 200ms;
  --transition-duration-300: 300ms;
  --transition-duration-500: 500ms;
  --transition-duration-700: 700ms;
  --transition-duration-1000: 1000ms;
  
  --transition-timing-ease: ease;
  --transition-timing-ease-in: ease-in;
  --transition-timing-ease-out: ease-out;
  --transition-timing-ease-in-out: ease-in-out;
  --transition-timing-linear: linear;
}
```

## セマンティックトークン

### ボタン
```css
:root {
  /* Primary Button */
  --button-primary-bg: var(--color-primary-600);
  --button-primary-bg-hover: var(--color-primary-700);
  --button-primary-text: #ffffff;
  --button-primary-border: var(--color-primary-600);
  
  /* Secondary Button */
  --button-secondary-bg: transparent;
  --button-secondary-bg-hover: var(--color-gray-50);
  --button-secondary-text: var(--color-gray-700);
  --button-secondary-border: var(--color-gray-300);
  
  /* Success Button */
  --button-success-bg: var(--color-success-600);
  --button-success-bg-hover: var(--color-success-700);
  --button-success-text: #ffffff;
  
  /* Danger Button */
  --button-danger-bg: var(--color-error-600);
  --button-danger-bg-hover: var(--color-error-700);
  --button-danger-text: #ffffff;
}
```

### フォーム要素
```css
:root {
  --input-bg: var(--color-input);
  --input-border: var(--color-border);
  --input-border-focus: var(--color-primary-500);
  --input-text: var(--color-foreground);
  --input-placeholder: var(--color-gray-400);
  --input-ring: var(--color-ring);
  
  --label-text: var(--color-gray-700);
  --label-required: var(--color-error-500);
}
```

### メッセージ
```css
:root {
  /* Success Message */
  --message-success-bg: var(--color-success-50);
  --message-success-border: var(--color-success-200);
  --message-success-text: var(--color-success-800);
  --message-success-icon: var(--color-success-600);
  
  /* Warning Message */
  --message-warning-bg: var(--color-warning-50);
  --message-warning-border: var(--color-warning-200);
  --message-warning-text: var(--color-warning-800);
  --message-warning-icon: var(--color-warning-600);
  
  /* Error Message */
  --message-error-bg: var(--color-error-50);
  --message-error-border: var(--color-error-200);
  --message-error-text: var(--color-error-800);
  --message-error-icon: var(--color-error-600);
  
  /* Info Message */
  --message-info-bg: var(--color-info-50);
  --message-info-border: var(--color-info-200);
  --message-info-text: var(--color-info-800);
  --message-info-icon: var(--color-info-600);
}
```

## 実装ガイドライン

### CSS変数の使用例

```css
/* コンポーネントスタイル例 */
.button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  border: var(--border-width-1) solid var(--button-primary-border);
  transition: background-color var(--transition-duration-150) var(--transition-timing-ease-in-out);
}

.button:hover {
  background-color: var(--button-primary-bg-hover);
}
```

### Tailwind CSS設定

```javascript
// tailwind.config.js でカスタム値として使用
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          // ...
        }
      },
      spacing: {
        '0.5': 'var(--spacing-0-5)',
        '1': 'var(--spacing-1)',
        // ...
      }
    }
  }
}
```

## バリデーション

### アクセシビリティ要件
- **カラーコントラスト**: WCAG 2.1 AA準拠（4.5:1以上）
- **フォーカス状態**: 明確な視覚的表示
- **タッチターゲット**: 最小44px×44px

### ブラウザサポート
- CSS変数サポート: IE11+, 主要モダンブラウザ
- calc()関数: 計算値の動的生成

## 更新ログ

### v1.0 (2025-06-26)
- 初期デザイントークン定義
- カラーパレット確立
- タイポグラフィ体系化
- スペーシングシステム構築

## 次のステップ

1. **実装**: globals.cssへの統合
2. **検証**: 既存コンポーネントでの動作確認
3. **拡張**: 追加のセマンティックトークン定義
4. **文書化**: 使用ガイドラインの詳細化

---

**[DESIGN]** このデザイントークンにより、一貫性のある美しいUIを効率的に構築できます。

**設計者**: Aphrodite（アフロディーテ）