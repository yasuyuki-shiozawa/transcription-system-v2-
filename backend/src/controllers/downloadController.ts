import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../types';
import { DataSource } from '@prisma/client';

export class DownloadController {
  downloadManusData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, transcriptionId } = req.params;

      // Get transcription data with sections
      const transcription = await prisma.transcriptionData.findFirst({
        where: {
          id: transcriptionId,
          sessionId: sessionId,
          source: DataSource.MANUS
        },
        include: {
          sections: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!transcription) {
        const response: ApiResponse = {
          success: false,
          error: 'Transcription data not found'
        };
        res.status(404).json(response);
        return;
      }

      // Format sections with section numbers
      const formattedContent = transcription.sections
        .map(section => {
          const header = `【セクション：${section.sectionNumber}】[${section.speaker}][${section.timestamp}]`;
          return `${header}\n${section.content}`;
        })
        .join('\n\n');

      // Set headers for file download
      const filename = `manus_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Send the formatted content
      res.send(formattedContent);
    } catch (error) {
      next(error);
    }
  };

  downloadAllManusData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId } = req.params;
      console.log('Download Manus request for session:', sessionId);

      // Get all MANUS sections for the session
      const manusData = await prisma.transcriptionData.findFirst({
        where: {
          sessionId: sessionId,
          source: DataSource.MANUS
        },
        include: {
          sections: {
            orderBy: { order: 'asc' }
          },
          session: true
        }
      });

      if (!manusData || manusData.sections.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'No MANUS data found for this session'
        };
        res.status(404).json(response);
        return;
      }

      // Add header with session info
      let content = `${manusData.session.name}\n`;
      content += `開催日: ${new Date(manusData.session.date).toLocaleDateString('ja-JP')}\n`;
      content += `セクション数: ${manusData.sections.length}\n`;
      content += '='.repeat(50) + '\n\n';

      // Format sections
      content += manusData.sections
        .map(section => {
          const header = `【セクション：${section.sectionNumber}】[${section.speaker}][${section.timestamp}]`;
          return `${header}\n${section.content}`;
        })
        .join('\n\n');

      // Set headers for file download
      const filename = `${manusData.session.name}_manus_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      res.send(content);
    } catch (error) {
      next(error);
    }
  };
  downloadNottaData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, transcriptionId } = req.params;

      // Get transcription data with sections
      const transcription = await prisma.transcriptionData.findFirst({
        where: {
          id: transcriptionId,
          sessionId: sessionId,
          source: DataSource.NOTTA
        },
        include: {
          sections: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!transcription) {
        const response: ApiResponse = {
          success: false,
          error: 'Transcription data not found'
        };
        res.status(404).json(response);
        return;
      }

      // Format sections with section numbers
      const formattedContent = transcription.sections
        .map(section => {
          const header = `【セクション：${section.sectionNumber}】[${section.speaker}][${section.timestamp}]`;
          return `${header}\n${section.content}`;
        })
        .join('\n\n');

      // Set headers for file download
      const filename = `notta_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Send the formatted content
      res.send(formattedContent);
    } catch (error) {
      next(error);
    }
  };

  downloadAllSections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: sessionId } = req.params;
      console.log('Download request for session:', sessionId);

      // Get all NOTTA sections for the session
      const nottaData = await prisma.transcriptionData.findFirst({
        where: {
          sessionId: sessionId,
          source: DataSource.NOTTA
        },
        include: {
          sections: {
            orderBy: { order: 'asc' }
          },
          session: true
        }
      });

      if (!nottaData || nottaData.sections.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'No NOTTA data found for this session'
        };
        res.status(404).json(response);
        return;
      }

      // Add header with session info
      let content = `${nottaData.session.name}\n`;
      content += `開催日: ${new Date(nottaData.session.date).toLocaleDateString('ja-JP')}\n`;
      content += `セクション数: ${nottaData.sections.length}\n`;
      content += '='.repeat(50) + '\n\n';

      // Format sections
      content += nottaData.sections
        .map(section => {
          const header = `【セクション：${section.sectionNumber}】[${section.speaker}][${section.timestamp}]`;
          return `${header}\n${section.content}`;
        })
        .join('\n\n');

      // Set headers for file download
      const filename = `${nottaData.session.name}_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      res.send(content);
    } catch (error) {
      next(error);
    }
  };
}