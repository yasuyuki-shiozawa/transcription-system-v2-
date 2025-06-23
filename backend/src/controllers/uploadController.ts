import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/uploadService';
import { MatchingService } from '../services/matchingService';
import { ApiResponse } from '../types';
import { DataSource } from '@prisma/client';

export class UploadController {
  private uploadService: UploadService;
  private matchingService: MatchingService;

  constructor() {
    this.uploadService = new UploadService();
    this.matchingService = new MatchingService();
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

      const result = await this.uploadService.processUploadedFile(
        sessionId,
        DataSource.NOTTA,
        file.path,
        file.originalname
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

      const result = await this.uploadService.processUploadedFile(
        sessionId,
        DataSource.MANUS,
        file.path,
        file.originalname
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
}