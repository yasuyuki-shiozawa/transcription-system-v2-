import { Request, Response } from 'express';
import { executeUndo, executeRedo, canUndo, canRedo, getLastAction, getLastUndoneAction, getActionHistory } from '../services/actionHistoryService';

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
 * Redo実行
 */
export const redo = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Redo可能かチェック
    const canRedoResult = await canRedo(sessionId);
    if (!canRedoResult) {
      return res.status(400).json({
        success: false,
        message: 'Redo可能な操作がありません'
      });
    }

    // Redo実行
    const result = await executeRedo(sessionId);

    return res.json(result);
  } catch (error) {
    console.error('Error executing redo:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

/**
 * Undo/Redo可能かチェック
 */
export const checkCanUndo = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const canUndoResult = await canUndo(sessionId);
    const canRedoResult = await canRedo(sessionId);
    const lastAction = await getLastAction(sessionId);
    const lastUndoneAction = await getLastUndoneAction(sessionId);

    return res.json({
      success: true,
      canUndo: canUndoResult,
      canRedo: canRedoResult,
      lastAction: lastAction ? {
        actionType: lastAction.actionType,
        createdAt: lastAction.createdAt
      } : null,
      lastUndoneAction: lastUndoneAction ? {
        actionType: lastUndoneAction.actionType,
        createdAt: lastUndoneAction.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error checking can undo/redo:', error);
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
