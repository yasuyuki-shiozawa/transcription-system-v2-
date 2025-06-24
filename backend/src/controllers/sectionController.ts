import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../types';

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

      // Check if section exists
      const existingSection = await prisma.section.findUnique({
        where: { id: sectionId }
      });

      if (!existingSection) {
        const response: ApiResponse = {
          success: false,
          error: 'Section not found'
        };
        res.status(404).json(response);
        return;
      }

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
}