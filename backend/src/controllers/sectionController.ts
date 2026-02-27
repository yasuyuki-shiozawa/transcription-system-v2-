import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse, CreateSectionDto, ReorderSectionsDto } from '../types';
import { recordAction } from '../services/actionHistoryService';

export class SectionController {
  updateSection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sectionId } = req.params;
      const { speaker, timestamp, endTimestamp, content, isExcluded } = req.body;
      
      console.log('PATCH /sections/:sectionId received:', {
        sectionId,
        body: req.body,
        isExcluded: isExcluded
      });

      // Validate input
      if (!speaker && !timestamp && !endTimestamp && !content && isExcluded === undefined) {
        const response: ApiResponse = {
          success: false,
          error: 'At least one field must be provided'
        };
        res.status(400).json(response);
        return;
      }

      // Check if section exists (include transcriptionData to get sessionId)
      const existingSection = await prisma.section.findUnique({
        where: { id: sectionId },
        include: { transcriptionData: true }
      });

      if (!existingSection) {
        const response: ApiResponse = {
          success: false,
          error: 'Section not found'
        };
        res.status(404).json(response);
        return;
      }

      const sessionId = existingSection.transcriptionData.sessionId;

      // テキスト編集の場合（content, speaker, timestampの変更）、操作履歴を記録
      const isTextEdit = (content !== undefined && content !== existingSection.content) ||
                         (speaker !== undefined && speaker !== existingSection.speaker) ||
                         (timestamp !== undefined && timestamp !== existingSection.timestamp) ||
                         (endTimestamp !== undefined && endTimestamp !== existingSection.endTimestamp);

      // beforeStateを保存
      const beforeState = {
        speaker: existingSection.speaker,
        timestamp: existingSection.timestamp,
        endTimestamp: existingSection.endTimestamp,
        content: existingSection.content,
      };

      // Update section
      const updatedSection = await prisma.section.update({
        where: { id: sectionId },
        data: {
          ...(speaker && { speaker }),
          ...(timestamp && { timestamp }),
          ...(endTimestamp !== undefined && { endTimestamp }),
          ...(content && { content }),
          ...(isExcluded !== undefined && { isExcluded })
        }
      });

      // テキスト編集の操作履歴を記録（isExcludedの変更は既存のSECTION_EXCLUDE/INCLUDEで処理される）
      if (isTextEdit) {
        const afterState = {
          speaker: updatedSection.speaker,
          timestamp: updatedSection.timestamp,
          endTimestamp: updatedSection.endTimestamp,
          content: updatedSection.content,
        };

        await recordAction(
          sessionId,
          'SECTION_EDIT',
          sectionId,
          beforeState,
          afterState
        );
        console.log('Recorded SECTION_EDIT action for section:', sectionId);
      }
      
      console.log('Section updated successfully:', {
        id: updatedSection.id,
        isExcluded: updatedSection.isExcluded
      });

      const response: ApiResponse = {
        success: true,
        data: updatedSection,
        message: 'Section updated successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // Batch update for multiple sections
  updateSections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sections } = req.body;

      if (!Array.isArray(sections) || sections.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Sections array is required'
        };
        res.status(400).json(response);
        return;
      }

      // Update sections in a transaction
      const results = await prisma.$transaction(
        sections.map(section => 
          prisma.section.update({
            where: { id: section.id },
            data: {
              ...(section.speaker && { speaker: section.speaker }),
              ...(section.timestamp && { timestamp: section.timestamp }),
              ...(section.endTimestamp !== undefined && { endTimestamp: section.endTimestamp }),
              ...(section.content && { content: section.content }),
              ...(section.isExcluded !== undefined && { isExcluded: section.isExcluded })
            }
          })
        )
      );

      const response: ApiResponse = {
        success: true,
        data: results,
        message: `${results.length} sections updated successfully`
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // Add new section to session
  addSection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { source, speaker, timestamp, endTimestamp, content, insertPosition }: CreateSectionDto = req.body;
      
      console.log('POST /sections/session/:sessionId received:', {
        sessionId,
        body: req.body
      });

      // Validate required fields
      if (!source || !speaker || !timestamp) {
        const response: ApiResponse = {
          success: false,
          error: 'Source, speaker, and timestamp are required'
        };
        res.status(400).json(response);
        return;
      }

      // Check if session exists
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        const response: ApiResponse = {
          success: false,
          error: 'Session not found'
        };
        res.status(404).json(response);
        return;
      }

      // Find or create transcription data for this session and source
      let transcriptionData = await prisma.transcriptionData.findFirst({
        where: {
          sessionId: sessionId,
          source: source
        }
      });

      // If no transcription data exists for this source, create it
      if (!transcriptionData) {
        transcriptionData = await prisma.transcriptionData.create({
          data: {
            sessionId: sessionId,
            source: source,
            originalFileName: `${source.toLowerCase()}_manual_entry`,
            status: 'COMPLETED'
          }
        });
      }

      // Get all existing sections for this transcription data
      const existingSections = await prisma.section.findMany({
        where: { transcriptionDataId: transcriptionData.id },
        orderBy: { sectionNumber: 'asc' }
      });

      // Calculate insert position
      const targetPosition = insertPosition !== undefined ? insertPosition : existingSections.length;
      
      // Use transaction to handle section number updates
      const result = await prisma.$transaction(async (tx) => {
        // If inserting in the middle, update section numbers of existing sections
        if (targetPosition < existingSections.length) {
          // Update section numbers for sections that come after the insert position
          const sectionsToUpdate = existingSections.slice(targetPosition);
          for (let i = 0; i < sectionsToUpdate.length; i++) {
            await tx.section.update({
              where: { id: sectionsToUpdate[i].id },
              data: { sectionNumber: (targetPosition + i + 2).toString().padStart(4, '0') }
            });
          }
        }

        // Create new section at the target position
        const newSectionNumber = (targetPosition + 1).toString().padStart(4, '0');
        const newSection = await tx.section.create({
          data: {
            transcriptionDataId: transcriptionData.id,
            sectionNumber: newSectionNumber,
            speaker: speaker,
            timestamp: timestamp,
            endTimestamp: endTimestamp || null,
            content: content || '',
            order: targetPosition + 1,
            isExcluded: false
          }
        });

        return newSection;
      });

      // セクション挿入の操作履歴を記録
      const afterState = {
        transcriptionDataId: result.transcriptionDataId,
        sectionNumber: result.sectionNumber,
        speaker: result.speaker,
        speakerId: result.speakerId,
        timestamp: result.timestamp,
        endTimestamp: result.endTimestamp,
        content: result.content,
        order: result.order,
        isExcluded: result.isExcluded,
      };

      await recordAction(
        sessionId,
        'SECTION_INSERT',
        result.id,
        null, // beforeState: 挿入前は存在しない
        afterState
      );
      console.log('Recorded SECTION_INSERT action for section:', result.id);

      console.log('Section created successfully:', {
        id: result.id,
        sectionNumber: result.sectionNumber,
        insertPosition: targetPosition
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Section added successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  // Delete section
  deleteSection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sectionId } = req.params;
      
      console.log('DELETE /sections/:sectionId received:', { sectionId });

      // Check if section exists (include transcriptionData to get sessionId)
      const existingSection = await prisma.section.findUnique({
        where: { id: sectionId },
        include: { transcriptionData: true }
      });

      if (!existingSection) {
        const response: ApiResponse = {
          success: false,
          error: 'Section not found'
        };
        res.status(404).json(response);
        return;
      }

      const sessionId = existingSection.transcriptionData.sessionId;

      // セクション削除の操作履歴を記録（削除前に記録）
      const beforeState = {
        transcriptionDataId: existingSection.transcriptionDataId,
        sectionNumber: existingSection.sectionNumber,
        speaker: existingSection.speaker,
        speakerId: existingSection.speakerId,
        timestamp: existingSection.timestamp,
        endTimestamp: existingSection.endTimestamp,
        content: existingSection.content,
        order: existingSection.order,
        isExcluded: existingSection.isExcluded,
      };

      await recordAction(
        sessionId,
        'SECTION_DELETE',
        sectionId,
        beforeState,
        null // afterState: 削除後は存在しない
      );
      console.log('Recorded SECTION_DELETE action for section:', sectionId);

      // Delete the section
      await prisma.section.delete({
        where: { id: sectionId }
      });

      // Reorder remaining sections
      const remainingSections = await prisma.section.findMany({
        where: { transcriptionDataId: existingSection.transcriptionDataId },
        orderBy: { sectionNumber: 'asc' }
      });

      // Update section numbers to be sequential
      await prisma.$transaction(
        remainingSections.map((section, index) =>
          prisma.section.update({
            where: { id: section.id },
            data: { sectionNumber: (index + 1).toString().padStart(4, '0') }
          })
        )
      );

      console.log('Section deleted and remaining sections reordered');

      const response: ApiResponse = {
        success: true,
        message: 'Section deleted successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // Reorder sections in session
  reorderSections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { source }: ReorderSectionsDto = req.body;
      
      console.log('PATCH /sections/session/:sessionId/reorder received:', {
        sessionId,
        source
      });

      // Validate required fields
      if (!source) {
        const response: ApiResponse = {
          success: false,
          error: 'Missing required field: source'
        };
        res.status(400).json(response);
        return;
      }

      // Find the transcription data
      const transcriptionData = await prisma.transcriptionData.findFirst({
        where: {
          sessionId: sessionId,
          source: source
        }
      });

      if (!transcriptionData) {
        const response: ApiResponse = {
          success: false,
          error: 'Transcription data not found'
        };
        res.status(404).json(response);
        return;
      }

      // Get all sections and reorder them
      const sections = await prisma.section.findMany({
        where: { transcriptionDataId: transcriptionData.id },
        orderBy: { sectionNumber: 'asc' }
      });

      // Update section numbers to be sequential
      await prisma.$transaction(
        sections.map((section, index) =>
          prisma.section.update({
            where: { id: section.id },
            data: { sectionNumber: (index + 1).toString().padStart(4, '0') }
          })
        )
      );

      console.log('Sections reordered successfully');

      const response: ApiResponse = {
        success: true,
        message: 'Sections reordered successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
