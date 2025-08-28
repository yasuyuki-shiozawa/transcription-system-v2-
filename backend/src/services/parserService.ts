import fs from 'fs/promises';
import { Section } from '@prisma/client';

interface ParsedStatement {
  sectionNumber: string;
  speaker: string;
  timestamp: string;
  content: string;
}

export class ParserService {
  // Parse NOTTA format with section numbers
  async parseNottaFile(filePath: string): Promise<ParsedStatement[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const statements: ParsedStatement[] = [];
    
    let currentStatement: ParsedStatement | null = null;
    const sectionPattern = /^【セクション：(\d+)】\[話者(\d+)\]\[(\d{2}:\d{2})\]$/;
    const nottaPattern = /^話者\s*(\d+)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/;  // MM:SSまたはHH:MM:SS形式に対応
    let sectionCounter = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and header sections
      if (!line || line.includes('録音版') || line.includes('AI要約') || line.includes('文字起こし')) {
        continue;
      }
      
      // Check for section pattern first
      if (sectionPattern.test(line)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        // Parse new section header
        const match = line.match(sectionPattern);
        if (match) {
          currentStatement = {
            sectionNumber: match[1],
            speaker: `話者${match[2]}`,
            timestamp: match[3],
            content: ''
          };
        }
      } 
      // Check for NOTTA standard format
      else if (nottaPattern.test(line)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        // Parse NOTTA format
        const match = line.match(nottaPattern);
        if (match) {
          currentStatement = {
            sectionNumber: String(sectionCounter).padStart(4, '0'),
            speaker: `話者${match[1]}`,
            timestamp: match[2],
            content: ''
          };
          sectionCounter++;
        }
      } else if (currentStatement && line) {
        // Add content to current statement
        currentStatement.content += (currentStatement.content ? '\n' : '') + line;
      }
    }
    
    // Add last statement
    if (currentStatement) {
      statements.push(currentStatement);
    }
    
    return statements;
  }
  
  // Parse Manus format (with enhanced pattern recognition)
  async parseManusFile(filePath: string): Promise<ParsedStatement[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const statements: ParsedStatement[] = [];
    
    let currentStatement: ParsedStatement | null = null;
    // 従来のセクションパターン
    const sectionPattern = /^【セクション：(\d+)】\[(.+?)\]\[(\d{2}:\d{2})\]$/;
    // 新しいManusフォーマットのパターン（タイムスタンプが括弧で囲まれている）
    const manusTimestampPattern = /^\（(\d{2}:\d{2})\）(?:\（(\d{2}:\d{2}:\d{2})\）)?$/;
    // 話者行のパターン（「話者名：」の形式）
    const speakerPattern = /^(.+?)：$/;
    // 従来のNOTTAパターン
    const nottaPattern = /^話者\s*(\d+)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/;
    
    let sectionCounter = 1;
    let inManusFormat = false;
    let pendingTimestamp = '';
    let pendingSpeaker = '';
    
    console.log(`Parsing Manus file: ${filePath}`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and header sections
      if (!line || line.includes('録音版') || line.includes('AI要約') || line.includes('文字起こし')) {
        continue;
      }
      
      // ヘッダー情報をスキップ（「議事録」や「質問者名：」などの行）
      if (i < 10 && (line === '議事録' || line.startsWith('質問者名：') || line.startsWith('日時：') || line.startsWith('質問事項：') || line === '---')) {
        continue;
      }
      
      // 従来のセクションパターンをチェック
      if (sectionPattern.test(line)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        // Parse new section header
        const match = line.match(sectionPattern);
        if (match) {
          currentStatement = {
            sectionNumber: match[1],
            speaker: match[2],
            timestamp: match[3],
            content: ''
          };
        }
      } 
      // 新しいManusフォーマットのタイムスタンプをチェック
      else if (manusTimestampPattern.test(line)) {
        // タイムスタンプ行を見つけた場合、次の行が話者行であることを期待
        const match = line.match(manusTimestampPattern);
        if (match) {
          pendingTimestamp = match[1]; // 最初のタイムスタンプを使用
          inManusFormat = true;
        }
      }
      // 話者行をチェック（Manusフォーマットの場合）
      else if (inManusFormat && speakerPattern.test(line)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        const match = line.match(speakerPattern);
        if (match && pendingTimestamp) {
          pendingSpeaker = match[1];
          currentStatement = {
            sectionNumber: String(sectionCounter).padStart(4, '0'),
            speaker: pendingSpeaker,
            timestamp: pendingTimestamp,
            content: ''
          };
          sectionCounter++;
          pendingTimestamp = '';
        }
      }
      // 従来のNOTTAパターンをチェック
      else if (nottaPattern.test(line)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        // Parse NOTTA format
        const match = line.match(nottaPattern);
        if (match) {
          currentStatement = {
            sectionNumber: String(sectionCounter).padStart(4, '0'),
            speaker: `話者${match[1]}`,
            timestamp: match[2],
            content: ''
          };
          sectionCounter++;
        }
      } 
      // 内容行の処理
      else if (currentStatement && line) {
        // 話者行の直後の内容行（Manusフォーマットの場合）
        if (inManusFormat && pendingSpeaker && !currentStatement.content) {
          pendingSpeaker = '';
        }
        
        // Add content to current statement
        currentStatement.content += (currentStatement.content ? '\n' : '') + line;
      }
    }
    
    // Add last statement
    if (currentStatement) {
      statements.push(currentStatement);
    }
    
    console.log(`Parsed ${statements.length} statements from Manus file`);
    return statements;
  }
  
  // Convert parsed statements to Section format for database
  convertToSections(statements: ParsedStatement[], transcriptionDataId: string): Omit<Section, 'id'>[] {
    return statements.map((statement, index) => ({
      transcriptionDataId,
      sectionNumber: statement.sectionNumber,
      speaker: statement.speaker,
      speakerId: null, // 話者IDは後で話者認識処理で設定
      timestamp: statement.timestamp,
      endTimestamp: null,
      content: statement.content.trim(),
      order: index + 1,
      isExcluded: false
    }));
  }
}

