import { Statement, ParseResult } from '../types';

/**
 * NOTTAの文字起こしデータをパースする
 */
export class NottaParser {
  /** 話者パターンの正規表現 */
  private readonly SPEAKER_PATTERN = /^話者\s*(\d+)\s*(\d{2}:\d{2})\s*$/;

  /**
   * テキストデータをパースして発言のリストを生成
   * @param text パース対象のテキスト
   * @returns パース結果
   */
  public parse(text: string): ParseResult {
    const lines = text.split('\n');
    const statements: Statement[] = [];
    const errors: string[] = [];
    
    let currentStatement: Partial<Statement> | null = null;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      // 空行はスキップ
      if (!trimmedLine) {
        // 現在の発言を保存
        if (currentStatement && currentStatement.content) {
          statements.push(currentStatement as Statement);
          currentStatement = null;
        }
        continue;
      }

      // 話者パターンのチェック
      const match = this.SPEAKER_PATTERN.exec(trimmedLine);
      if (match) {
        // 前の発言を保存
        if (currentStatement && currentStatement.content) {
          statements.push(currentStatement as Statement);
        }

        // 新しい発言の開始
        currentStatement = {
          speakerNumber: parseInt(match[1], 10),
          time: match[2],
          content: ''
        };
      } else if (currentStatement) {
        // 発言内容の追加
        if (currentStatement.content) {
          currentStatement.content += '\n';
        }
        currentStatement.content += trimmedLine;
      } else {
        // 話者情報なしでテキストが出現
        errors.push(`行 ${lineNumber}: 話者情報が見つからないテキストです: "${trimmedLine}"`);
      }
    }

    // 最後の発言を保存
    if (currentStatement && currentStatement.content) {
      statements.push(currentStatement as Statement);
    }

    return { statements, errors };
  }

  /**
   * ファイルの内容が有効なNOTTAデータかチェック
   * @param text チェック対象のテキスト
   * @returns 有効な場合はtrue
   */
  public isValidFormat(text: string): boolean {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return false;

    // 最初の非空行が話者パターンかチェック
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        return this.SPEAKER_PATTERN.test(trimmed);
      }
    }
    return false;
  }
}