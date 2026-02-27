import fs from 'fs/promises';
import { Section } from '@prisma/client';

interface ParsedStatement {
  sectionNumber: string;
  speaker: string;
  timestamp: string;
  content: string;
  speakerId?: string | null;
}

export class ParserService {
  // 全角文字を半角に正規化する関数（パターンマッチ用）
  private normalizeForMatching(line: string): string {
    let normalized = line;
    
    // 全角数字 → 半角数字
    normalized = normalized.replace(/[０-９]/g, (ch) => 
      String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    );
    
    // 全角コロン → 半角コロン
    normalized = normalized.replace(/：/g, ':');
    
    // 全角括弧 → 対応する括弧に変換
    // 半角丸括弧 → 全角丸括弧（Manusフォーマットは全角括弧を期待）
    normalized = normalized.replace(/\(/g, '（');
    normalized = normalized.replace(/\)/g, '）');
    
    // 全角角括弧 → 半角角括弧
    normalized = normalized.replace(/［/g, '[');
    normalized = normalized.replace(/］/g, ']');
    
    // 全角スペース → 半角スペース
    normalized = normalized.replace(/　/g, ' ');
    
    return normalized;
  }

  // 話者名の区切り文字を正規化する関数
  // 話者行では半角コロンも全角コロンとして扱う
  private normalizeSpeakerLine(line: string): string {
    let normalized = line;
    // 行末の半角コロンを全角コロンに変換（話者パターンマッチ用）
    // ただし、タイムスタンプ内のコロンは変換しない
    if (normalized.match(/^.+:$/) && !normalized.match(/\d:\d/)) {
      normalized = normalized.slice(0, -1) + ':';
    }
    return normalized;
  }

  // Parse NOTTA format with section numbers
  async parseNottaFile(filePath: string): Promise<ParsedStatement[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const statements: ParsedStatement[] = [];
    
    console.log('=== NOTTA PARSER DEBUG ===');
    console.log('File path:', filePath);
    console.log('Total lines:', lines.length);
    console.log('First 10 lines:', lines.slice(0, 10));
    
    let currentStatement: ParsedStatement | null = null;
    // 話者番号または話者名の両方に対応
    // 正規化後は全角コロンが半角になるので、パターンも半角コロンで定義
    const sectionPattern = /^【セクション:(\d+)】\[(.+?)\]\[(\d{2}:\d{2})\]$/;
    const nottaPattern = /^話者\s*(\d+)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/;  // MM:SSまたHH:MM:SS形式に対応
    let sectionCounter = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and header sections
      if (!line || line.includes('録音版') || line.includes('AI要約') || line.includes('文字起こし')) {
        continue;
      }
      
      // パターンマッチ用に全角・半角を正規化
      const normalizedLine = this.normalizeForMatching(line);
      
      // Check for section pattern first
      if (sectionPattern.test(normalizedLine)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        // Parse new section header
        const match = normalizedLine.match(sectionPattern);
        if (match) {
          currentStatement = {
            sectionNumber: match[1],
            speaker: match[2],  // 話者名をそのまま使用
            timestamp: match[3],
            content: ''
          };
        }
      } 
      // Check for NOTTA standard format
      else if (nottaPattern.test(normalizedLine)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        // Parse NOTTA format
        const match = normalizedLine.match(nottaPattern);
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
    
    console.log('=== NOTTA PARSER RESULT ===');
    console.log('Total statements parsed:', statements.length);
    console.log('Statements:', statements.map(s => ({ section: s.sectionNumber, speaker: s.speaker, timestamp: s.timestamp, contentLength: s.content.length })));
    
    return statements;
  }
  
  // Parse Manus format (with enhanced pattern recognition)
  async parseManusFile(filePath: string): Promise<ParsedStatement[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const statements: ParsedStatement[] = [];
    
    let currentStatement: ParsedStatement | null = null;
    // 従来のセクションパターン（正規化後は半角コロン）
    const sectionPattern = /^【セクション:(\d+)】\[(.+?)\]\[(\d{2}:\d{2})\]$/;
    // 新しいManusフォーマットのパターン（タイムスタンプが括弧で囲まれている）
    const manusTimestampPattern = /^\（(\d{2}:\d{2})\）(?:\（(\d{2}:\d{2}:\d{2})\）)?$/;
    // 話者行のパターン（「話者名:」の形式、正規化後は半角コロン）
    const speakerPattern = /^(.+?):$/;
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
      if (i < 10 && (line === '議事録' || line.startsWith('質問者名：') || line.startsWith('質問者名:') || line.startsWith('日時：') || line.startsWith('日時:') || line.startsWith('質問事項：') || line.startsWith('質問事項:') || line === '---')) {
        continue;
      }
      
      // パターンマッチ用に全角・半角を正規化
      const normalizedLine = this.normalizeForMatching(line);
      
      // 従来のセクションパターンをチェック
      if (sectionPattern.test(normalizedLine)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        // Parse new section header
        const match = normalizedLine.match(sectionPattern);
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
      else if (manusTimestampPattern.test(normalizedLine)) {
        // タイムスタンプ行を見つけた場合、次の行が話者行であることを期待
        const match = normalizedLine.match(manusTimestampPattern);
        if (match) {
          pendingTimestamp = match[1]; // 最初のタイムスタンプを使用
          inManusFormat = true;
        }
      }
      // 話者行をチェック（Manusフォーマットの場合）
      // 正規化後は全角コロンも半角コロンになっている
      else if (inManusFormat && speakerPattern.test(normalizedLine)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        const match = normalizedLine.match(speakerPattern);
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
      else if (nottaPattern.test(normalizedLine)) {
        // Save previous statement if exists
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        // Parse NOTTA format
        const match = normalizedLine.match(nottaPattern);
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
      speakerId: statement.speakerId || null, // 話者IDを使用
      timestamp: statement.timestamp,
      endTimestamp: null,
      content: statement.content.trim(),
      order: index + 1,
      isExcluded: false
    }));
  }
}

