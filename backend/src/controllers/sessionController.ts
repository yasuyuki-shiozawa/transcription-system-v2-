import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/sessionService';
import { ApiResponse, CreateSessionDto, UpdateSessionDto } from '../types';

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  createSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreateSessionDto = req.body;
      
      // Validation
      if (!data.name || !data.date) {
        const response: ApiResponse = {
          success: false,
          error: 'Missing required fields: name and date',
        };
        return res.status(400).json(response);
      }

      const session = await this.sessionService.createSession(data);
      
      const response: ApiResponse = {
        success: true,
        data: session,
        message: 'Session created successfully',
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  getAllSessions = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await this.sessionService.getAllSessions();
      
      const response: ApiResponse = {
        success: true,
        data: sessions,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getSessionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const session = await this.sessionService.getSessionById(id);
      
      if (!session) {
        const response: ApiResponse = {
          success: false,
          error: 'Session not found',
        };
        return res.status(404).json(response);
      }
      
      const response: ApiResponse = {
        success: true,
        data: session,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  updateSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: UpdateSessionDto = req.body;
      
      const session = await this.sessionService.updateSession(id, data);
      
      const response: ApiResponse = {
        success: true,
        data: session,
        message: 'Session updated successfully',
      };
      
      res.json(response);
    } catch (error: any) {
      if (error.code === 'P2025') {
        const response: ApiResponse = {
          success: false,
          error: 'Session not found',
        };
        return res.status(404).json(response);
      }
      next(error);
    }
  };

  deleteSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      await this.sessionService.deleteSession(id);
      
      const response: ApiResponse = {
        success: true,
        message: 'Session deleted successfully',
      };
      
      res.json(response);
    } catch (error: any) {
      if (error.code === 'P2025') {
        const response: ApiResponse = {
          success: false,
          error: 'Session not found',
        };
        return res.status(404).json(response);
      }
      next(error);
    }
  };

  getSessionWithSections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const session = await this.sessionService.getSessionWithSections(id);
      
      if (!session) {
        const response: ApiResponse = {
          success: false,
          error: 'Session not found',
        };
        return res.status(404).json(response);
      }
      
      const response: ApiResponse = {
        success: true,
        data: session,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}