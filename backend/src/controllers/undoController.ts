import { Request, Response } from 'express';
import { executeUndo, canUndo, getLastAction, getActionHistory } from '../services/actionHistoryService';

/**
 * Undo実行
 */
export const undo = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Undo可能かチェック
    const canUndoResult = await canUndo(sessionId);
    if (!canUndoResult) {
      return res.status(400).json({
        success: false,
        message: 'Undo可能な操作がありません'
      });
    }

    // Undo実行
    const result = await executeUndo(sessionId);

    return res.json(result);
  } catch (error) {
    console.error('Error executing undo:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

/**
 * Undo可能かチェック
 */
export const checkCanUndo = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const canUndoResult = await canUndo(sessionId);
    const lastAction = await getLastAction(sessionId);

    return res.json({
      success: true,
      canUndo: canUndoResult,
      lastAction: lastAction ? {
        actionType: lastAction.actionType,
        createdAt: lastAction.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error checking can undo:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * 操作履歴取得
 */
export const getHistory = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const histories = await getActionHistory(sessionId, limit);

    return res.json({
      success: true,
      data: histories
    });
  } catch (error) {
    console.error('Error getting action history:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
