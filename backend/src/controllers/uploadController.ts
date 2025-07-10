import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/uploadService';
import { MatchingService } from '../services/matchingService';
import { ApiResponse } from '../types';
import { PrismaClient } from '@prisma/client';

export class UploadController {
  private uploadService: UploadService;
  private matchingService: MatchingService;
  private prisma: PrismaClient;

  constructor() {
    this.uploadService = new UploadService();
    this.matchingService = new MatchingService();
    this.prisma = new PrismaClient();
  }

  uploadNotta = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId } = req.params;
      const file = req.file;

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: 'No file uploaded',
        };
        res.status(400).json(response);
        return;
      }

      // Fix encoding for Japanese filenames
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      const result = await this.uploadService.processUploadedFile(
        sessionId,
        'NOTTA',
        file.path,
        originalName
      );

      // Try auto-matching after upload
      await this.matchingService.performAutoMatching(sessionId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'NOTTA file uploaded and processed successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  uploadManus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId } = req.params;
      const file = req.file;

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: 'No file uploaded',
        };
        res.status(400).json(response);
        return;
      }

      // Fix encoding for Japanese filenames
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      const result = await this.uploadService.processUploadedFile(
        sessionId,
        'MANUS',
        file.path,
        originalName
      );

      // Try auto-matching after upload
      await this.matchingService.performAutoMatching(sessionId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Manus file uploaded and processed successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  uploadAudio = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId, source } = req.params; // source is now from URL params
      const file = req.file;

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: 'No file uploaded',
        };
        res.status(400).json(response);
        return;
      }

      if (!source || !['NOTTA', 'MANUS'].includes(source)) {
        const response: ApiResponse = {
          success: false,
          error: 'Source must be either NOTTA or MANUS',
        };
        res.status(400).json(response);
        return;
      }

      // Fix encoding for Japanese filenames
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      const result = await this.uploadService.processAudioFile(
        sessionId,
        source as 'NOTTA' | 'MANUS',
        file.path,
        originalName
      );

      // Try auto-matching after upload
      await this.matchingService.performAutoMatching(sessionId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Audio file uploaded and transcribed successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getTranscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId } = req.params;
      
      const transcriptions = await this.uploadService.getTranscriptionsBySession(sessionId);
      
      const response: ApiResponse = {
        success: true,
        data: transcriptions,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  performMatching = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId } = req.params;
      
      const mappings = await this.matchingService.performAutoMatching(sessionId);
      
      const response: ApiResponse = {
        success: true,
        data: mappings,
        message: `Created ${mappings.length} section mappings`,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getMappings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId } = req.params;
      
      const mappings = await this.matchingService.getMappingsBySession(sessionId);
      
      const response: ApiResponse = {
        success: true,
        data: mappings,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // 手動テキスト入力用エンドポイント
  uploadText = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId, source } = req.params;
      const { text, speakerName } = req.body;

      // バリデーション
      if (!text || !text.trim()) {
        const response: ApiResponse = {
          success: false,
          error: 'Text content is required',
        };
        res.status(400).json(response);
        return;
      }

      if (!source || !['notta', 'manus'].includes(source.toLowerCase())) {
        const response: ApiResponse = {
          success: false,
          error: 'Source must be either notta or manus',
        };
        res.status(400).json(response);
        return;
      }

      // セッションの存在確認
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        const response: ApiResponse = {
          success: false,
          error: 'Session not found',
        };
        res.status(404).json(response);
        return;
      }

      // テキストを保存
      const dataSource = source.toUpperCase() as 'NOTTA' | 'MANUS';
      const transcriptionData = await this.prisma.transcriptionData.create({
        data: {
          sessionId,
          source: dataSource,
          originalFileName: `manual_input_${Date.now()}.txt`,
          fileType: 'text',
          status: 'PROCESSED',
        },
      });

      // セクションに分割して保存
      const sections = text.trim().split('\n\n').filter((s: string) => s.trim());
      let sectionNumber = 1;

      for (const sectionContent of sections) {
        await this.prisma.section.create({
          data: {
            transcriptionDataId: transcriptionData.id,
            sectionNumber: sectionNumber.toString(),
            speaker: speakerName || '話者不明',
            content: sectionContent.trim(),
            timestamp: '00:00:00',
            order: sectionNumber,
          },
        });
        sectionNumber++;
      }

      // 自動マッチングを試行
      await this.matchingService.performAutoMatching(sessionId);

      const response: ApiResponse = {
        success: true,
        data: {
          transcriptionId: transcriptionData.id,
          sectionsCreated: sections.length,
        },
        message: 'Text uploaded and processed successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}