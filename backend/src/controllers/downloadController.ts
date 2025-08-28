import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

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

// 話者名を4文字に調整する関数
const formatSpeakerName = async (speaker: string): Promise<string> => {
  // 「話者1」などの形式を除外
  if (/^話者\d+$/.test(speaker)) {
    return speaker;
  }
  
  let speakerName = speaker;
  
  // 「議員」が含まれる場合の特別処理
  if (speaker.includes('議員')) {
    try {
      // 話者マスターから該当する話者を検索
      const speakerRecord = await prisma.speaker.findFirst({
        where: {
          OR: [
            { fullName: { contains: speaker.replace('議員', '') } },
            { displayName: { contains: speaker } },
            { aliases: { contains: speaker } }
          ],
          speakerType: 'MEMBER' // 議員タイプのみ
        }
      });
      
      if (speakerRecord) {
        // 話者マスターに登録されている場合はフルネーム+議員を使用
        speakerName = `${speakerRecord.fullName}議員`;
      }
    } catch (error) {
      console.error('Error finding speaker in database:', error);
      // エラー時は元の名前をそのまま使用
    }
  }
  
  // 文字数を取得
  const nameLength = [...speakerName].length; // サロゲートペア対応
  
  if (nameLength === 4) {
    // 既に4文字なら何もしない
    return speakerName;
  } else if (nameLength < 4) {
    // 4文字未満なら空白で埋める
    return speakerName.padEnd(4 + (speakerName.length - nameLength), '　');
  } else {
    // 4文字より多い場合は切り詰める（ただし「議員」は維持）
    if (speakerName.endsWith('議員')) {
      // 「議員」を除いた部分を調整
      const baseName = speakerName.slice(0, -2);
      const baseNameLength = [...baseName].length;
      if (baseNameLength <= 2) {
        // 「議員」を含めても4文字以下なら何もしない
        return speakerName;
      } else {
        // 「議員」を含めて4文字になるように調整
        return [...baseName].slice(0, 2).join('') + '議員';
      }
    } else {
      // 「議員」がない場合は単純に4文字に切り詰める
      return [...speakerName].slice(0, 4).join('');
    }
  }
};

export class DownloadController {
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
                alignment: 'center'
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
                
                // 話者名を4文字の均等割り付けに整形（非同期関数に変更）
                const formattedSpeakerName = await formatSpeakerName(section.speaker);
                
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
                  
                  // 話者名（4文字均等割り付け）
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${formattedSpeakerName}：`,
                        bold: true,
                        size: 24
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
}

