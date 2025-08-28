import { prisma } from '../utils/prisma';
import { ParserService } from './parserService';
import { TranscriptionService } from './transcriptionService';
import { SpeakerService } from './speakerService';
import fs from 'fs/promises';

export class UploadService {
  private parserService: ParserService;
  private transcriptionService: TranscriptionService;
  private speakerService: SpeakerService;
  
  constructor() {
    this.parserService = new ParserService();
    this.transcriptionService = new TranscriptionService();
    this.speakerService = new SpeakerService();
  }
  
  async processUploadedFile(
    sessionId: string,
    source: any,
    filePath: string,
    originalFileName: string
  ) {
    try {
      // 既存データを削除せず、新しいデータを追加する
      // Create new transcription data record
      const transcriptionData = await prisma.transcriptionData.create({
        data: {
          sessionId,
          source,
          originalFileName,
          status: 'PROCESSING'
        }
      });
      
      // Parse file based on source
      console.log(`Processing file: ${filePath}`);
      const statements = source === 'NOTTA'
        ? await this.parserService.parseNottaFile(filePath)
        : await this.parserService.parseManusFile(filePath);
      
      console.log(`Parsed ${statements.length} statements`);
      
      // 話者名を標準化
      const standardizedStatements = await Promise.all(statements.map(async (statement) => {
        // 話者名を標準化
        const standardizedSpeaker = await this.speakerService.standardizeSpeakerName(statement.speaker, sessionId);
        
        // 話者IDを取得
        const speaker = await this.speakerService.findSpeakerByName(statement.speaker, sessionId);
        const speakerId = speaker ? speaker.id : null;
        
        return {
          ...statement,
          speaker: standardizedSpeaker,
          speakerId
        };
      }));
      
      // Convert to sections with unique section numbers
      const sections = this.parserService.convertToSections(
        standardizedStatements,
        transcriptionData.id
      );
      
      // Bulk create sections
      await prisma.section.createMany({
        data: sections
      });
      
      // Update transcription data status
      await prisma.transcriptionData.update({
        where: { id: transcriptionData.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date()
        }
      });
      
      // Clean up uploaded file (temporarily disabled for debugging)
      // await fs.unlink(filePath);
      
      return transcriptionData;
    } catch (error) {
      console.error('Error processing uploaded file:', error);
      // Clean up on error
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.error('Failed to clean up file:', e);
      }
      throw error;
    }
  }
  
  async getTranscriptionsBySession(sessionId: string) {
    return await prisma.transcriptionData.findMany({
      where: { sessionId },
      include: {
        sections: {
          orderBy: { order: 'asc' }
        }
      }
    });
  }
  
  async processAudioFile(
    sessionId: string,
    source: 'NOTTA' | 'MANUS',
    filePath: string,
    originalFileName: string
  ) {
    try {
      // Get file stats
      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;
      const audioFormat = originalFileName.split('.').pop()?.toLowerCase() || 'unknown';
      
      // Create transcription data record
      const transcriptionData = await prisma.transcriptionData.create({
        data: {
          sessionId,
          source,
          originalFileName,
          status: 'TRANSCRIBING',
          fileType: 'audio',
          fileSize,
          audioFormat
        }
      });
      
      // Transcribe audio using Whisper API
      console.log(`Transcribing audio file: ${filePath}`);
      const { sections } = await this.transcriptionService.transcribeAudio(
        filePath,
        source
      );
      
      console.log(`Transcribed ${sections.length} sections`);
      
      // 話者名を標準化
      const standardizedSections = await Promise.all(sections.map(async (section) => {
        // 話者名を標準化
        const standardizedSpeaker = await this.speakerService.standardizeSpeakerName(section.speaker, sessionId);
        
        // 話者IDを取得
        const speaker = await this.speakerService.findSpeakerByName(section.speaker, sessionId);
        const speakerId = speaker ? speaker.id : null;
        
        return {
          ...section,
          speaker: standardizedSpeaker,
          speakerId,
          transcriptionDataId: transcriptionData.id
        };
      }));
      
      // Bulk create sections
      await prisma.section.createMany({
        data: standardizedSections
      });
      
      // Update transcription data status
      await prisma.transcriptionData.update({
        where: { id: transcriptionData.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date()
        }
      });
      
      // Clean up uploaded file
      await fs.unlink(filePath);
      
      return transcriptionData;
    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.error('Failed to clean up file:', e);
      }
      throw error;
    }
  }
}

