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
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
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
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
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
    return statements.map((statement, index) => ({
      transcriptionDataId,
      sectionNumber: statement.sectionNumber,
      speaker: statement.speaker,
      timestamp: statement.timestamp,
      content: statement.content.trim(),
      order: index + 1
    }));
  }
}