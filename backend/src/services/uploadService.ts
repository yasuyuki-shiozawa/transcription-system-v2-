import { prisma } from '../utils/prisma';
import { ParserService } from './parserService';
import { TranscriptionService } from './transcriptionService';
import fs from 'fs/promises';

export class UploadService {
  private parserService: ParserService;
  private transcriptionService: TranscriptionService;

  constructor() {
    this.parserService = new ParserService();
    this.transcriptionService = new TranscriptionService();
  }

  async processUploadedFile(
    sessionId: string,
    source: any,
    filePath: string,
    originalFileName: string
  ) {
    try {
      // First, delete any existing transcription data for this session and source
      const existingTranscriptions = await prisma.transcriptionData.findMany({
        where: {
          sessionId,
          source
        }
      });

      // Delete existing transcription data and related sections
      for (const existing of existingTranscriptions) {
        await prisma.section.deleteMany({
          where: { transcriptionDataId: existing.id }
        });
        await prisma.transcriptionData.delete({
          where: { id: existing.id }
        });
      }

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

      // Convert to sections
      const sections = this.parserService.convertToSections(
        statements,
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

      // Add transcriptionDataId to sections
      const sectionsWithId = sections.map(section => ({
        ...section,
        transcriptionDataId: transcriptionData.id
      }));

      // Bulk create sections
      await prisma.section.createMany({
        data: sectionsWithId
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