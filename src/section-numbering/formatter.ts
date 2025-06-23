import { Statement, SectionedStatement, FormatOptions } from '../types';

/**
 * 発言データをフォーマットする
 */
export class StatementFormatter {
  /**
   * 発言リストにセクション番号を付与
   * @param statements 発言のリスト
   * @param options フォーマットオプション
   * @returns セクション番号付きの発言リスト
   */
  public addSectionNumbers(
    statements: Statement[],
    options: FormatOptions = {}
  ): SectionedStatement[] {
    const { startNumber = 1, digits = 4 } = options;

    return statements.map((statement, index) => ({
      ...statement,
      sectionNumber: this.formatSectionNumber(startNumber + index, digits)
    }));
  }

  /**
   * セクション番号をフォーマット
   * @param number 番号
   * @param digits 桁数
   * @returns フォーマットされたセクション番号
   */
  private formatSectionNumber(number: number, digits: number): string {
    return number.toString().padStart(digits, '0');
  }

  /**
   * セクション番号付き発言を文字列に変換
   * @param statement セクション番号付き発言
   * @returns フォーマットされた文字列
   */
  public formatStatement(statement: SectionedStatement): string {
    const header = `【セクション：${statement.sectionNumber}】[話者${statement.speakerNumber}][${statement.time}]`;
    return `${header}\n${statement.content}`;
  }

  /**
   * 発言リスト全体を文字列に変換
   * @param statements セクション番号付き発言のリスト
   * @returns フォーマットされた文字列
   */
  public formatAll(statements: SectionedStatement[]): string {
    return statements
      .map(statement => this.formatStatement(statement))
      .join('\n\n');
  }

  /**
   * 統計情報を生成
   * @param statements 発言のリスト
   * @returns 統計情報の文字列
   */
  public generateStatistics(statements: Statement[]): string {
    const speakerCounts = new Map<number, number>();
    let totalLength = 0;

    for (const statement of statements) {
      speakerCounts.set(
        statement.speakerNumber,
        (speakerCounts.get(statement.speakerNumber) || 0) + 1
      );
      totalLength += statement.content.length;
    }

    const stats = [
      `=== 処理統計 ===`,
      `総セクション数: ${statements.length}`,
      `話者数: ${speakerCounts.size}`,
      `総文字数: ${totalLength}`,
      ``,
      `話者別発言回数:`
    ];

    const sortedSpeakers = Array.from(speakerCounts.entries())
      .sort((a, b) => a[0] - b[0]);

    for (const [speaker, count] of sortedSpeakers) {
      stats.push(`  話者${speaker}: ${count}回`);
    }

    return stats.join('\n');
  }
}