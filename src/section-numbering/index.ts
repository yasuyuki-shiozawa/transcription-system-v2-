#!/usr/bin/env node

import { promises as fs } from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { NottaParser } from './parser';
import { StatementFormatter } from './formatter';
import { FormatOptions } from '../types';

/**
 * メインプログラム
 */
class SectionNumberingTool {
  private parser = new NottaParser();
  private formatter = new StatementFormatter();

  /**
   * ファイルを処理
   * @param inputPath 入力ファイルパス
   * @param outputPath 出力ファイルパス
   * @param options フォーマットオプション
   */
  async processFile(
    inputPath: string,
    outputPath: string,
    options: FormatOptions = {}
  ): Promise<void> {
    try {
      // ファイル読み込み
      console.log(`入力ファイルを読み込んでいます: ${inputPath}`);
      const content = await fs.readFile(inputPath, 'utf-8');

      // フォーマットチェック
      if (!this.parser.isValidFormat(content)) {
        throw new Error('入力ファイルがNOTTAの形式ではありません');
      }

      // パース処理
      console.log('文字起こしデータをパースしています...');
      const parseResult = this.parser.parse(content);

      if (parseResult.errors.length > 0) {
        console.warn('パース中に警告が発生しました:');
        parseResult.errors.forEach(error => console.warn(`  - ${error}`));
      }

      if (parseResult.statements.length === 0) {
        throw new Error('有効な発言が見つかりませんでした');
      }

      console.log(`${parseResult.statements.length}個の発言を検出しました`);

      // セクション番号付与
      const sectionedStatements = this.formatter.addSectionNumbers(
        parseResult.statements,
        options
      );

      // フォーマット
      const formattedContent = this.formatter.formatAll(sectionedStatements);

      // 統計情報の生成
      const statistics = this.formatter.generateStatistics(parseResult.statements);

      // 出力ファイルの作成
      await fs.writeFile(outputPath, formattedContent, 'utf-8');
      console.log(`出力ファイルを作成しました: ${outputPath}`);

      // 統計情報の表示
      console.log('\n' + statistics);

    } catch (error) {
      console.error('エラーが発生しました:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}

/**
 * CLIのエントリーポイント
 */
if (require.main === module) {
  const program = new Command();
  const tool = new SectionNumberingTool();

  program
    .name('section-numbering')
    .description('NOTTAの文字起こしデータにセクション番号を付与するツール')
    .version('1.0.0')
    .argument('<input>', '入力ファイルパス (NOTTAの文字起こしデータ)')
    .argument('[output]', '出力ファイルパス (デフォルト: input_sectioned.txt)')
    .option('-s, --start <number>', 'セクション番号の開始値', '1')
    .option('-d, --digits <number>', 'セクション番号の桁数', '4')
    .action(async (input: string, output?: string) => {
      const inputPath = path.resolve(input);
      const outputPath = output 
        ? path.resolve(output)
        : path.join(
            path.dirname(inputPath),
            path.basename(inputPath, path.extname(inputPath)) + '_sectioned.txt'
          );

      const options: FormatOptions = {
        startNumber: parseInt(program.opts().start, 10),
        digits: parseInt(program.opts().digits, 10)
      };

      await tool.processFile(inputPath, outputPath, options);
    });

  program.parse();
}

export { SectionNumberingTool };