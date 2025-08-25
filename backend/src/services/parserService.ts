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
  
  // Parse Manus format (assuming similar structure)
  async parseManusFile(filePath: string): Promise<ParsedStatement[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const statements: ParsedStatement[] = [];
    
    let currentStatement: ParsedStatement | null = null;
    const sectionPattern = /^【セクション：(\d+)】\[(.+?)\]\[(\d{2}:\d{2})\]$/;
    const nottaPattern = /^話者\s*(\d+)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/;  // MM:SSまたはHH:MM:SS形式に対応
    let sectionCounter = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and header sections
      if (!line || line.includes('録音版') || line.includes('AI要約') || line.includes('文字起こし')) {
        continue;
      }
      
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
      // Check for NOTTA standard format (same as Manus files might use this format)
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
  
  // Convert parsed statements to Section format for database
  convertToSections(statements: ParsedStatement[], transcriptionDataId: string): Omit<Section, 'id'>[] {
    // 現在のタイムスタンプをプレフィックスとして使用して一意性を確保
    const timestamp = new Date().getTime().toString();
    
    return statements.map((statement, index) => ({
      transcriptionDataId,
      // タイムスタンプとインデックスを組み合わせて一意のセクション番号を生成
      sectionNumber: `${timestamp}-${statement.sectionNumber}`,
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