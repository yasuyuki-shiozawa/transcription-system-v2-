import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { SpeakerService } from '../services/speakerService';
import { WordTemplateService } from '../services/wordTemplateService';
import fs from 'fs';
import path from 'path';

// 累積時間計算のためのヘルパー関数
const timeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
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
  
  // 常にHH:MM:SS形式で返す
  return `${hours.toString().padStart(2, '0')}：${minutes.toString().padStart(2, '0')}：${secs.toString().padStart(2, '0')}`;
};

// 話者名を4文字分の幅に調整する関数
const padSpeakerNameTo4Chars = (name: string): string => {
  const nameChars = [...name]; // サロゲートペア対応
  const nameLength = nameChars.length;
  
  if (nameLength === 4) {
    return name; // 既に4文字なら何もしない
  } else if (nameLength < 4) {
    // 4文字未満なら全角スペースで埋める
    return name + '　'.repeat(4 - nameLength);
  } else {
    // 4文字より多い場合はそのまま返す（切り詰めない）
    return name;
  }
};

export class DownloadController {
  private speakerService: SpeakerService;
  private wordTemplateService: WordTemplateService;
  
  constructor() {
    this.speakerService = new SpeakerService();
    this.wordTemplateService = new WordTemplateService();
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
        // Create Word document
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              // Title
              new Paragraph({
                text: manusData.session.name,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER
              }),
              // Date
              new Paragraph({
                text: `開催日: ${new Date(manusData.session.date).toLocaleDateString('ja-JP')}`,
                spacing: { after: 200 }
              }),
              // Section count
              new Paragraph({
                text: `出力セクション数: ${manusData.sections.length}`,
                spacing: { after: 400 }
              }),
              // Separator
              new Paragraph({
                text: '─'.repeat(50),
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
                
                // このセクションの開始時の全体経過時間
                const totalStartTime = secondsToTime(totalElapsedSeconds);
                
                // このセクションの長さ
                let sectionDuration = 0;
                if (section.endTimestamp) {
                  sectionDuration = timeToSeconds(section.endTimestamp) - timeToSeconds(section.timestamp);
                }
                
                // このセクションの終了時の全体経過時間
                const totalEndTime = secondsToTime(totalElapsedSeconds + sectionDuration);
                
                // 話者名を取得（話者マスターから標準化）
                const speakerName = await this.speakerService.formatSpeakerForWord(section.speaker, sessionId);
                
                // 話者名を4文字分の幅に調整（全角スペースでパディング）
                const paddedSpeakerName = padSpeakerNameTo4Chars(speakerName);
                
                return [
                  // 開始タイムスタンプ（全体経過時間）（話者の開始時間 00:00:00）
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `（${totalStartTime}）（00：00：00）`,
                        color: '000000',
                        size: 22
                      })
                    ],
                    spacing: { before: 200, after: 100 }
                  }),
                  
                  // 話者名（4文字分の幅に調整）
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${paddedSpeakerName}：`,
                        bold: true,
                        size: 24,
                        font: "MS Gothic" // 固定幅フォントを使用
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
                  
                  // 終了タイムスタンプ（全体経過時間）（このセクションの長さ）
                  ...(section.endTimestamp ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `（${totalEndTime}）（${secondsToTime(sectionDuration)}）`,
                          color: '000000',
                          size: 22
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

  downloadFilteredManusAsWordWithMacro = async (req: Request, res: Response, _next: NextFunction) => {
    try {
      // sessionIdはURLパスから取得（親ルーターから継承）
      const sessionId = req.params.id || req.params.sessionId;
      const { includedSections = [] } = req.body;
      
      console.log('downloadFilteredManusAsWordWithMacro called:', {
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
        // マクロ付きWordテンプレートが利用可能かチェック
        if (!this.wordTemplateService.isTemplateAvailable()) {
          console.log('Macro template not available, falling back to basic Word generation');
          // マクロなしの基本的なWord文書を生成
          return this.downloadFilteredManusAsWord(req, res, _next);
        }

        // セクションデータを整形
        const formattedSections = await Promise.all(manusData.sections.map(async (section, index) => {
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
          
          // このセクションの開始時の全体経過時間
          const totalStartTime = secondsToTime(totalElapsedSeconds);
          
          // このセクションの長さ
          let sectionDuration = 0;
          if (section.endTimestamp) {
            sectionDuration = timeToSeconds(section.endTimestamp) - timeToSeconds(section.timestamp);
          }
          
          // このセクションの終了時の全体経過時間
          const totalEndTime = secondsToTime(totalElapsedSeconds + sectionDuration);
          
          // 話者名を取得（話者マスターから標準化）
          const speakerName = await this.speakerService.formatSpeakerForWord(section.speaker, sessionId);
          
          return {
            id: section.id,
            sectionNumber: section.sectionNumber,
            timestamp: totalStartTime,
            endTimestamp: totalEndTime,
            speaker: speakerName,
            content: section.content,
            source: section.source,
            order: section.order,
            sectionDuration: secondsToTime(sectionDuration)
          };
        }));

        // マクロ付きWord文書を生成
        const buffer = await this.wordTemplateService.generateWordDocumentWithMacro({
          sessionName: manusData.session.name,
          sessionDate: new Date(manusData.session.date).toLocaleDateString('ja-JP'),
          sections: formattedSections
        });

        console.log('Macro-enabled Word document created successfully');

        // Set headers for Word file download (.docm for macro-enabled)
        const filename = `${manusData.session.name}_macro_${new Date().toISOString().split('T')[0]}.docm`;
        res.setHeader('Content-Type', 'application/vnd.ms-word.document.macroEnabled.12');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        // Send the buffer
        res.send(buffer);
        console.log('Macro-enabled Word document sent to client');
      } catch (docError) {
        console.error('Error creating macro-enabled Word document:', docError);
        console.log('Falling back to basic Word generation');
        // エラーが発生した場合は基本的なWord文書にフォールバック
        return this.downloadFilteredManusAsWord(req, res, _next);
      }
    } catch (error) {
      console.error('Error in downloadFilteredManusAsWordWithMacro:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'マクロ付きWord形式のダウンロード中にエラーが発生しました'
      };
      res.status(500).json(response);
    }
  };
}

