import { prisma } from '../utils/prisma';
import { ParserService } from './parserService';
import { DataSource, ProcessingStatus } from '@prisma/client';
import fs from 'fs/promises';

export class UploadService {
  private parserService: ParserService;

  constructor() {
    this.parserService = new ParserService();
  }

  async processUploadedFile(
    sessionId: string,
    source: DataSource,
    filePath: string,
    originalFileName: string
  ) {
    try {
      // Create transcription data record
      const transcriptionData = await prisma.transcriptionData.create({
        data: {
          sessionId,
          source,
          originalFileName,
          status: ProcessingStatus.PROCESSING
        }
      });

      // Parse file based on source
      console.log(`Processing file: ${filePath}`);
      const statements = source === DataSource.NOTTA
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
          status: ProcessingStatus.PROCESSED,
          processedAt: new Date()
        }
      });

      // Clean up uploaded file (temporarily disabled for debugging)
      // await fs.unlink(filePath);

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
}