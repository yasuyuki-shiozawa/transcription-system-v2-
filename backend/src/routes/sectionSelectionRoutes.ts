import express from 'express';
import { PrismaClient } from '@prisma/client';
import { SectionSelectionState } from '../models/SectionSelection';

const router = express.Router();
const prisma = new PrismaClient();

// セクション選択状態取得
router.get('/sessions/:sessionId/selections', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // データベースから選択状態を取得（将来的な実装用）
    // 現在はPrismaスキーマにsection_selectionsテーブルがないため、
    // 一時的にセッションデータから推測して返す
    
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        transcriptions: {
          include: {
            sections: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // 既存のexcludedセクションデータから選択状態を構築
    const selections: { [key: string]: any } = {};
    
    session.transcriptions.forEach((data: any) => {
      data.sections.forEach((section: any) => {
        selections[section.id] = {
          isSelected: !section.isExcluded, // excludedの逆が選択状態
          timestamp: Date.now(),
          source: data.source as 'NOTTA' | 'MANUS'
        };
      });
    });

    const selectionState: SectionSelectionState = {
      sessionId,
      selections,
      metadata: {
        lastUpdated: Date.now(),
        totalSelected: Object.values(selections).filter((sel: any) => sel.isSelected).length,
        selectionMode: 'inclusive'
      }
    };

    return res.json({
      success: true,
      data: selectionState
    });
  } catch (error) {
    console.error('Error fetching section selections:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch section selections',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// セクション選択状態保存
router.post('/sessions/:sessionId/selections', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const selectionState: SectionSelectionState = req.body;

    // バリデーション
    if (!selectionState || selectionState.sessionId !== sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid selection state data'
      });
    }

    // 既存のセクションデータを更新（isExcludedフィールドを使用）
    const updatePromises = Object.entries(selectionState.selections).map(async ([sectionId, selection]) => {
      try {
        // セクションが存在するかチェック
        const existingSection = await prisma.section.findUnique({
          where: { id: sectionId }
        });

        if (existingSection) {
          // isSelectedの逆がisExcluded
          await prisma.section.update({
            where: { id: sectionId },
            data: {
              isExcluded: !selection.isSelected
            }
          });
        }
      } catch (error) {
        console.error(`Error updating section ${sectionId}:`, error);
      }
    });

    await Promise.all(updatePromises);

    return res.json({
      success: true,
      message: 'Section selections saved successfully'
    });
  } catch (error) {
    console.error('Error saving section selections:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save section selections',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// セクション選択状態更新（部分更新）
router.put('/sessions/:sessionId/selections', async (req, res) => {
  try {
    const { sectionId, isSelected } = req.body;

    if (!sectionId || typeof isSelected !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data. sectionId and isSelected are required.'
      });
    }

    // セクションのisExcludedを更新
    await prisma.section.update({
      where: { id: sectionId },
      data: {
        isExcluded: !isSelected
      }
    });

    return res.json({
      success: true,
      data: {
        sectionId,
        isSelected,
        timestamp: Date.now()
      },
      message: 'Section selection updated successfully'
    });
  } catch (error) {
    console.error('Error updating section selection:', error);
    
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update section selection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;