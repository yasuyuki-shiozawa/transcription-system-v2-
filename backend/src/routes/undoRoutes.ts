import express from 'express';
import { undo, redo, checkCanUndo, getHistory } from '../controllers/undoController';

const router = express.Router();

// Undo実行
router.post('/sessions/:sessionId/undo', undo);

// Redo実行
router.post('/sessions/:sessionId/redo', redo);

// Undo/Redo可能かチェック
router.get('/sessions/:sessionId/can-undo', checkCanUndo);

// 操作履歴取得
router.get('/sessions/:sessionId/actions', getHistory);

export default router;
