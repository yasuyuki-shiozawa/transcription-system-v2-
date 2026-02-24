import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { recordAction } from '../services/actionHistoryService';

const prisma = new PrismaClient();

// ハイライト作成
export const createHighlight = async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.params;
    const { startOffset, endOffset, color, text } = req.body;

    // バリデーション
    if (startOffset === undefined || startOffset === null || 
        endOffset === undefined || endOffset === null || 
        !color || !text) {
      return res.status(400).json({
        success: false,
        message: 'startOffset, endOffset, color, text are required'
      });
    }

    if (startOffset >= endOffset) {
      return res.status(400).json({
        success: false,
        message: 'startOffset must be less than endOffset'
      });
    }

    const validColors = ['yellow', 'blue', 'green', 'pink', 'orange'];
    if (!validColors.includes(color)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid color. Must be one of: ' + validColors.join(', ')
      });
    }

    // セクションの存在確認
    const section = await prisma.section.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    // ハイライト作成
    const highlight = await prisma.highlight.create({
      data: {
        sectionId,
        startOffset: parseInt(startOffset),
        endOffset: parseInt(endOffset),
        color,
        text
      }
    });

    // セクションからセッションIDを取得
    const sectionWithTranscription = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        transcriptionData: true
      }
    });

    // 操作履歴を記録
    if (sectionWithTranscription) {
      await recordAction(
        sectionWithTranscription.transcriptionData.sessionId,
        'HIGHLIGHT_ADD',
        highlight.id,
        null,
        highlight
      );
    }

    return res.json({
      success: true,
      data: highlight
    });
  } catch (error) {
    console.error('Error creating highlight:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// セクションのハイライト一覧取得
export const getHighlightsBySection = async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.params;

    const highlights = await prisma.highlight.findMany({
      where: { sectionId },
      orderBy: { startOffset: 'asc' }
    });

    return res.json({
      success: true,
      data: highlights
    });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ハイライト更新
export const updateHighlight = async (req: Request, res: Response) => {
  try {
    const { highlightId } = req.params;
    const { startOffset, endOffset, color, text } = req.body;

    // ハイライトの存在確認
    const existingHighlight = await prisma.highlight.findUnique({
      where: { id: highlightId }
    });

    if (!existingHighlight) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found'
      });
    }

    // 更新データの準備
    const updateData: any = {};
    
    if (startOffset !== undefined) {
      updateData.startOffset = parseInt(startOffset);
    }
    if (endOffset !== undefined) {
      updateData.endOffset = parseInt(endOffset);
    }
    if (color !== undefined) {
      const validColors = ['yellow', 'blue', 'green', 'pink', 'orange'];
      if (!validColors.includes(color)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid color. Must be one of: ' + validColors.join(', ')
        });
      }
      updateData.color = color;
    }
    if (text !== undefined) {
      updateData.text = text;
    }

    // バリデーション
    const finalStartOffset = updateData.startOffset ?? existingHighlight.startOffset;
    const finalEndOffset = updateData.endOffset ?? existingHighlight.endOffset;
    
    if (finalStartOffset >= finalEndOffset) {
      return res.status(400).json({
        success: false,
        message: 'startOffset must be less than endOffset'
      });
    }

    // ハイライト更新
    const highlight = await prisma.highlight.update({
      where: { id: highlightId },
      data: updateData
    });

    return res.json({
      success: true,
      data: highlight
    });
  } catch (error) {
    console.error('Error updating highlight:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ハイライト削除
export const deleteHighlight = async (req: Request, res: Response) => {
  try {
    const { highlightId } = req.params;

    // ハイライトの存在確認
    const existingHighlight = await prisma.highlight.findUnique({
      where: { id: highlightId }
    });

    if (!existingHighlight) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found'
      });
    }

    // セクションからセッションIDを取得
    const sectionWithTranscription = await prisma.section.findUnique({
      where: { id: existingHighlight.sectionId },
      include: {
        transcriptionData: true
      }
    });

    // 操作履歴を記録（削除前の状態を保存）
    if (sectionWithTranscription) {
      await recordAction(
        sectionWithTranscription.transcriptionData.sessionId,
        'HIGHLIGHT_DELETE',
        highlightId,
        existingHighlight,
        null
      );
    }

    // ハイライト削除
    await prisma.highlight.delete({
      where: { id: highlightId }
    });

    return res.json({
      success: true,
      message: 'Highlight deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

