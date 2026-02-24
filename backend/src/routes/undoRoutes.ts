import express from 'express';
import { undo, checkCanUndo, getHistory } from '../controllers/undoController';

const router = express.Router();

// Undo実行
router.post('/sessions/:sessionId/undo', undo);

// Undo可能かチェック
router.get('/sessions/:sessionId/can-undo', checkCanUndo);

// 操作履歴取得
router.get('/sessions/:sessionId/actions', getHistory);

export default router;
