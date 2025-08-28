import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { Section } from '../types/section';

export interface WordTemplateData {
  sessionName: string;
  sessionDate: string;
  sections: Section[];
}

export class WordTemplateService {
  private templatePath: string;
  private macroVbaPath: string;

  constructor() {
    this.templatePath = path.join(__dirname, '../../templates/word_template_with_macro.dotm');
    this.macroVbaPath = path.join(__dirname, '../../templates/word_macro.vba');
  }

  /**
   * マクロ付きWord文書を生成
   * 注意: 現在の実装では、docxライブラリを使用してWord文書を生成し、
   * マクロの説明をコメントとして追加しています。
   * 実際のVBAマクロの埋め込みには、より高度なライブラリまたは
   * Microsoft Wordの自動化が必要です。
   */
  async generateWordDocumentWithMacro(data: WordTemplateData): Promise<Buffer> {
    try {
      // VBAマクロコードを読み込み
      let macroCode = '';
      if (fs.existsSync(this.macroVbaPath)) {
        macroCode = fs.readFileSync(this.macroVbaPath, 'utf-8');
      }

      // セクションデータを整形
      const formattedSections = this.formatSectionsForTemplate(data.sections);

      // Word文書を生成
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // マクロ使用説明
            new Paragraph({
              text: "【マクロ付き議事録】",
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              text: "この文書にはVBAマクロが含まれています。",
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: "使用方法：",
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: "1. マクロを有効にしてください",
              indent: { left: 360 },
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: "2. 「均等割り付け実行」ボタンをクリックして話者名を4文字幅に調整",
              indent: { left: 360 },
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: "3. 編集作業を完了",
              indent: { left: 360 },
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: "4. 納品前に「納品用に変換」マクロを実行してボタンを削除",
              indent: { left: 360 },
              spacing: { after: 400 }
            }),
            
            // セッション情報
            new Paragraph({
              text: data.sessionName,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              text: `開催日: ${data.sessionDate}`,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `出力セクション数: ${formattedSections.length}`,
              spacing: { after: 400 }
            }),
            new Paragraph({
              text: '─'.repeat(50),
              spacing: { after: 400 }
            }),
            
            // セクション内容
            ...formattedSections.map(section => [
              // タイムスタンプ
              new Paragraph({
                children: [
                  new TextRun({
                    text: `（${section.timestamp}）（00：00：00）`,
                    color: '000000',
                    size: 22
                  })
                ],
                spacing: { before: 200, after: 100 }
              }),
              
              // 話者名（太字、4文字幅調整対象）
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${section.speaker}：`,
                    bold: true,
                    size: 24,
                    font: "MS Gothic" // 固定幅フォント
                  })
                ],
                spacing: { after: 100 }
              }),
              
              // セクション内容（インデント付き）
              new Paragraph({
                text: section.content,
                indent: { left: 360 }, // 全角スペース2つ分のインデント
                spacing: { after: 100 }
              }),
              
              // 終了タイムスタンプ（存在する場合）
              ...(section.endTimestamp ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `（${section.endTimestamp}）（${section.sectionDuration || '00：00：00'}）`,
                      color: '000000',
                      size: 22
                    })
                  ],
                  spacing: { after: 400 }
                })
              ] : [])
            ]).flat(),
            
            // マクロコードの説明（コメントとして追加）
            new Paragraph({
              text: "─".repeat(50),
              spacing: { before: 800, after: 200 }
            }),
            new Paragraph({
              text: "【VBAマクロコード】",
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: "以下のVBAコードを「開発」タブ→「Visual Basic」で追加してください：",
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: macroCode,
              indent: { left: 360 },
              spacing: { after: 200 }
            })
          ]
        }]
      });

      // Word文書をBufferとして生成
      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      console.error('Word文書生成エラー:', error);
      throw new Error(`Word文書の生成に失敗しました: ${error.message}`);
    }
  }

  /**
   * セクションデータをテンプレート用に整形
   */
  private formatSectionsForTemplate(sections: Section[]): any[] {
    return sections.map(section => ({
      sectionNumber: section.sectionNumber,
      timestamp: section.timestamp,
      endTimestamp: section.endTimestamp,
      speaker: section.speaker,
      content: section.content,
      source: section.source,
      sectionDuration: section.sectionDuration,
      // Word文書用の書式設定
      isBold: true, // 話者名を太字に
      hasTimestamp: section.timestamp && section.timestamp.trim() !== '',
      formattedTimestamp: section.timestamp ? `（${section.timestamp}）` : '',
    }));
  }

  /**
   * 基本的なWord文書を生成（マクロなし）
   */
  async generateBasicWordDocument(data: WordTemplateData): Promise<Buffer> {
    try {
      // 基本的なWord文書の生成ロジック
      const content = this.generateWordContent(data);
      
      // 簡単なWord文書として生成
      return Buffer.from(content, 'utf-8');
    } catch (error) {
      console.error('基本Word文書生成エラー:', error);
      throw new Error(`基本Word文書の生成に失敗しました: ${error.message}`);
    }
  }

  /**
   * Word文書のコンテンツを生成
   */
  private generateWordContent(data: WordTemplateData): string {
    let content = `議事録\n\n`;
    content += `セッション名: ${data.sessionName}\n`;
    content += `日付: ${data.sessionDate}\n\n`;

    data.sections.forEach(section => {
      if (section.timestamp) {
        content += `（${section.timestamp}）\n`;
      }
      content += `${section.speaker}：${section.content}\n\n`;
    });

    return content;
  }

  /**
   * テンプレートファイルの存在確認
   */
  isTemplateAvailable(): boolean {
    // VBAマクロファイルの存在を確認
    return fs.existsSync(this.macroVbaPath);
  }

  /**
   * テンプレートファイルのパスを取得
   */
  getTemplatePath(): string {
    return this.templatePath;
  }

  /**
   * VBAマクロファイルのパスを取得
   */
  getMacroVbaPath(): string {
    return this.macroVbaPath;
  }
}

