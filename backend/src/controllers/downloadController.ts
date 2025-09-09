import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../types';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HighlightColor } from 'docx';
import { SpeakerService } from '../services/speakerService';

// ハイライト色をdocxライブラリの色にマッピングする関数
const mapHighlightColor = (color: string) => {
  switch (color) {
    case 'yellow':
      return HighlightColor.YELLOW;
    case 'blue':
      return HighlightColor.CYAN;
    case 'green':
      return HighlightColor.GREEN;
    case 'pink':
      return HighlightColor.MAGENTA;
    case 'orange':
      return HighlightColor.YELLOW; // オレンジはYELLOWで代用
    default:
      return HighlightColor.YELLOW;
  }
};

// 累積時間計算のためのヘルパー関数
const timeToSeconds = (timeStr: string): number => {
  // 半角・全角コロン両方に対応し、角括弧も除去
  const normalizedTimeStr = timeStr.replace(/[\[\]]/g, '').replace(/：/g, ':');
  const parts = normalizedTimeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

const secondsToTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  // 常にHH:MM:SS形式で返す（半角コロンに統一）
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 新しいタイムスタンプ形式のための計算関数
const calculateTimestamps = (section: any) => {
  // ①セクションの開始時間
  const sectionStartTime = section.timestamp;
  
  // ②そのセクションにおけるその話者の会話開始秒数（すべて0スタート）
  const speakerStartTime = '00:00';
  
  // ③セクションの終わり時間
  const sectionEndTime = section.endTimestamp || section.timestamp;
  
  // ④そのセクションにおいて経過した時間（発言時間）
  const sectionDuration = section.endTimestamp 
    ? timeToSeconds(section.endTimestamp) - timeToSeconds(section.timestamp)
    : 0;
  const sectionDurationFormatted = secondsToTime(sectionDuration);
  
  return {
    sectionStartTime,
    speakerStartTime,
    sectionEndTime,
    sectionDurationFormatted
  };
};

// 日付を令和年号形式に変換する関数
const formatToReiwaDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 令和元年は2019年5月1日から
  if (year < 2019 || (year === 2019 && month < 5)) {
    // 平成年号（令和以前）
    const heisei = year - 1988;
    return `平成${heisei}年${month}月${day}日`;
  } else {
    // 令和年号
    let reiwa = year - 2018;
    if (year === 2019 && month < 5) {
      // 2019年1-4月は平成31年
      return `平成31年${month}月${day}日`;
    }
    if (reiwa === 1) {
      return `令和元年${month}月${day}日`;
    } else {
      return `令和${reiwa}年${month}月${day}日`;
    }
  }
};

// テキストにハイライトを適用するヘルパー関数
const applyHighlightsToText = (text: string, highlights: any[]): TextRun[] => {
  if (!highlights || highlights.length === 0) {
    return [new TextRun({ text })];
  }

  // ハイライトを開始位置でソート
  const sortedHighlights = highlights.sort((a, b) => a.startOffset - b.startOffset);
  
  const textRuns: TextRun[] = [];
  let currentPosition = 0;

  for (const highlight of sortedHighlights) {
    // ハイライト前のテキスト
    if (currentPosition < highlight.startOffset) {
      const beforeText = text.substring(currentPosition, highlight.startOffset);
      if (beforeText) {
        textRuns.push(new TextRun({ text: beforeText }));
      }
    }

    // ハイライト部分のテキスト
    const highlightedText = text.substring(highlight.startOffset, highlight.endOffset);
    if (highlightedText) {
      textRuns.push(new TextRun({
        text: highlightedText,
        highlight: mapHighlightColor(highlight.color)
      }));
    }

    currentPosition = Math.max(currentPosition, highlight.endOffset);
  }

  // 残りのテキスト
  if (currentPosition < text.length) {
    const remainingText = text.substring(currentPosition);
    if (remainingText) {
      textRuns.push(new TextRun({ text: remainingText }));
    }
  }

  return textRuns;
};

export class DownloadController {
  private speakerService: SpeakerService;
  
  constructor() {
    this.speakerService = new SpeakerService();
  }
  
  downloadManusData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, transcriptionId } = req.params;

      // Get transcription data with sections
      const transcription = await prisma.transcriptionData.findFirst({
        where: {
          id: transcriptionId,
          sessionId: sessionId,
          source: 'MANUS'
        },
        include: {
          sections: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!transcription) {
        const response: ApiResponse = {
          success: false,
          error: 'Transcription data not found'
        };
        res.status(404).json(response);
        return;
      }

      // Format sections with section numbers
      const formattedContent = transcription.sections
        .map(section => {
          const header = `【セクション：${section.sectionNumber}】[${section.speaker}][${section.timestamp}]`;
          return `${header}\n${section.content}`;
        })
        .join('\n\n');

      // Set headers for file download
      const filename = `manus_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Send the formatted content
      res.send(formattedContent);
    } catch (error) {
      next(error);
    }
  };

  downloadAllManusData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId } = req.params;
      console.log('Download Manus request for session:', sessionId);

      // Get all MANUS sections for the session
      const manusData = await prisma.transcriptionData.findFirst({
        where: {
          sessionId: sessionId,
          source: 'MANUS'
        },
        include: {
          sections: {
            orderBy: { order: 'asc' }
          },
          session: true
        }
      });

      if (!manusData || manusData.sections.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'No MANUS data found for this session'
        };
        res.status(404).json(response);
        return;
      }

      // Add header with session info
      let content = `${manusData.session.name}\n`;
      content += `開催日: ${new Date(manusData.session.date).toLocaleDateString('ja-JP')}\n`;
      content += `セクション数: ${manusData.sections.length}\n`;
      content += '='.repeat(50) + '\n\n';

      // Format sections
      content += manusData.sections
        .map(section => {
          const header = `【セクション：${section.sectionNumber}】[${section.speaker}][${section.timestamp}]`;
          return `${header}\n${section.content}`;
        })
        .join('\n\n');

      // Set headers for file download
      const filename = `${manusData.session.name}_manus_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      res.send(content);
    } catch (error) {
      next(error);
    }
  };
  downloadNottaData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, transcriptionId } = req.params;

      // Get transcription data with sections
      const transcription = await prisma.transcriptionData.findFirst({
        where: {
          id: transcriptionId,
          sessionId: sessionId,
          source: 'NOTTA'
        },
        include: {
          sections: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!transcription) {
        const response: ApiResponse = {
          success: false,
          error: 'Transcription data not found'
        };
        res.status(404).json(response);
        return;
      }

      // Format sections with section numbers
      const formattedContent = transcription.sections
        .map(section => {
          const header = `【セクション：${section.sectionNumber}】[${section.speaker}][${section.timestamp}]`;
          return `${header}\n${section.content}`;
        })
        .join('\n\n');

      // Set headers for file download
      const filename = `notta_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Send the formatted content
      res.send(formattedContent);
    } catch (error) {
      next(error);
    }
  };

  downloadAllSections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId } = req.params;
      console.log('Download request for session:', sessionId);

      // Get all NOTTA sections for the session
      const nottaData = await prisma.transcriptionData.findFirst({
        where: {
          sessionId: sessionId,
          source: 'NOTTA'
        },
        include: {
          sections: {
            orderBy: { order: 'asc' }
          },
          session: true
        }
      });

      if (!nottaData || nottaData.sections.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'No NOTTA data found for this session'
        };
        res.status(404).json(response);
        return;
      }

      // Add header with session info
      let content = `${nottaData.session.name}\n`;
      content += `開催日: ${new Date(nottaData.session.date).toLocaleDateString('ja-JP')}\n`;
      content += `セクション数: ${nottaData.sections.length}\n`;
      content += '='.repeat(50) + '\n\n';

      // Format sections
      content += nottaData.sections
        .map(section => {
          const header = `【セクション：${section.sectionNumber}】[${section.speaker}][${section.timestamp}]`;
          return `${header}\n${section.content}`;
        })
        .join('\n\n');

      // Set headers for file download
      const filename = `${nottaData.session.name}_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      res.send(content);
    } catch (error) {
      next(error);
    }
  };

  downloadFilteredManusAsWord = async (req: Request, res: Response, _next: NextFunction) => {
    try {
      // sessionIdはURLパスから取得（親ルーターから継承）
      const sessionId = req.params.id || req.params.sessionId;
      const { includedSections = [] } = req.body;
      
      console.log('downloadFilteredManusAsWord called:', {
        sessionId,
        includedSections,
        includedSectionsLength: includedSections.length
      });

      // Get MANUS data with included sections only
      const manusData = await prisma.transcriptionData.findFirst({
        where: {
          sessionId: sessionId,
          source: 'MANUS'
        },
        include: {
          sections: {
            where: {
              id: {
                in: includedSections as string[]
              }
            },
            include: {
              highlights: {
                orderBy: { startOffset: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          },
          session: true
        }
      });

      if (!manusData) {
        console.log('No MANUS transcription data found for session:', sessionId);
        const response: ApiResponse = {
          success: false,
          error: 'No MANUS data found for this session'
        };
        res.status(404).json(response);
        return;
      }
      
      if (manusData.sections.length === 0) {
        console.log('MANUS data found but no sections matched included IDs:', {
          sessionId,
          includedSectionsCount: includedSections.length,
          includedSections: includedSections.slice(0, 5) // 最初の5個のIDを表示
        });
        const response: ApiResponse = {
          success: false,
          error: 'No sections found with the specified IDs'
        };
        res.status(404).json(response);
        return;
      }

      try {
        // 質問者（議員）のリストを取得
        const uniqueSpeakers = [...new Set(manusData.sections.map(section => section.speaker))];
        const questionerNames = [];
        
        for (const speaker of uniqueSpeakers) {
          // 話者マスターから情報を取得
          const speakerInfo = await this.speakerService.findSpeakerByName(speaker, sessionId);
          const formattedName = await this.speakerService.formatSpeakerForWord(speaker, sessionId);
          
          // 議員かどうかを判定（speakerTypeがMEMBERまたは名前に「議員」が含まれる）
          if ((speakerInfo && speakerInfo.speakerType === 'MEMBER') || formattedName.includes('議員')) {
            questionerNames.push(formattedName);
          }
        }

        // Create Word document
        const doc = new Document({
          styles: {
            default: {
              document: {
                run: {
                  size: 21 // 10.5pt
                }
              }
            }
          },
          sections: [{
            properties: {},
            children: [
              // Questioner names (left-aligned)
              new Paragraph({
                children: [
                  new TextRun({
                    text: questionerNames.length > 0 ? `質問者 ${questionerNames.join(' ')}` : '質問者 （記録なし）',
                    bold: true
                  })
                ],
                alignment: AlignmentType.LEFT
              }),
              // Date
              new Paragraph({
                children: [
                  new TextRun({
                    text: `開催日: ${formatToReiwaDate(new Date(manusData.session.date))}`
                  })
                ],
                spacing: { after: 400 }
              }),
              // Sections with proper timestamp format
              ...await Promise.all(manusData.sections.map(async (section, index) => {
                // 現在のセクションまでの全体経過時間を計算
                let totalElapsedSeconds = 0;
                for (let i = 0; i < index; i++) {
                  const prevSection = manusData.sections[i];
                  if (prevSection.endTimestamp) {
                    const duration = timeToSeconds(prevSection.endTimestamp) - timeToSeconds(prevSection.timestamp);
                    if (duration > 0) {
                      totalElapsedSeconds += duration;
                    }
                  }
                }
                
                // 新しいタイムスタンプ形式を計算
                const timestamps = calculateTimestamps(section);
                
                // 話者名を取得（話者マスターから標準化）
                const speakerName = await this.speakerService.formatSpeakerForWord(section.speaker, sessionId);
                
                return [
                  // 開始タイムスタンプ（セクション開始時間）（話者開始秒数）
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `（${timestamps.sectionStartTime}）（${timestamps.speakerStartTime}）`,
                        color: '000000'
                      })
                    ],
                    spacing: { before: 200, after: 100 }
                  }),
                  
                  // 話者名（4文字均等割り付け）
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${speakerName}：`,
                        bold: true,
                        font: "MS Gothic" // 固定幅フォントを使用
                      })
                    ],
                    spacing: { after: 100 },
                    alignment: AlignmentType.JUSTIFIED, // 均等割り付け
                    thematicBreak: false,
                    contextualSpacing: false
                  }),
                  
                  // セクション内容（インデント付き、ハイライト適用）
                  new Paragraph({
                    children: applyHighlightsToText(section.content, section.highlights),
                    indent: { left: 360 }, // 全角スペース2つ分のインデント
                    spacing: { after: 100 }
                  }),
                  
                  // 終了タイムスタンプ（セクション終了時間）（セクション経過時間）
                  ...(section.endTimestamp ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `（${timestamps.sectionEndTime}）（${timestamps.sectionDurationFormatted}）`,
                          color: '000000'
                        })
                      ],
                      spacing: { after: 400 }
                    })
                  ] : [])
                ];
              })).then(sections => sections.flat())
            ]
          }]
        });

        console.log('Word document created successfully');

        // Generate buffer
        const buffer = await Packer.toBuffer(doc);
        console.log('Word document packed to buffer, size:', buffer.length);

        // Set headers for Word file download
        const filename = `manus_filtered_${new Date().toISOString().split('T')[0]}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        // Send the buffer
        res.send(buffer);
        console.log('Word document sent to client');
      } catch (docError) {
        console.error('Error creating Word document:', docError);
        const response: ApiResponse = {
          success: false,
          error: docError instanceof Error ? `Word文書の生成中にエラーが発生しました: ${docError.message}` : 'Word文書の生成中にエラーが発生しました'
        };
        res.status(500).json(response);
      }
    } catch (error) {
      console.error('Error in downloadFilteredManusAsWord:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Word形式のダウンロード中にエラーが発生しました'
      };
      res.status(500).json(response);
    }
  };

}

