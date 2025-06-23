/**
 * 話者の発言を表すインターフェース
 */
export interface Statement {
  /** 話者番号 */
  speakerNumber: number;
  /** 発言時刻 (HH:MM形式) */
  time: string;
  /** 発言内容 */
  content: string;
}

/**
 * セクション番号付きの発言を表すインターフェース
 */
export interface SectionedStatement extends Statement {
  /** セクション番号 (4桁の数字) */
  sectionNumber: string;
}

/**
 * パース結果を表すインターフェース
 */
export interface ParseResult {
  /** パースされた発言のリスト */
  statements: Statement[];
  /** エラーメッセージのリスト */
  errors: string[];
}

/**
 * フォーマットオプション
 */
export interface FormatOptions {
  /** セクション番号の開始値 (デフォルト: 1) */
  startNumber?: number;
  /** セクション番号の桁数 (デフォルト: 4) */
  digits?: number;
}