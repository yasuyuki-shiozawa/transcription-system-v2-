import express from 'express';
import {
  createHighlight,
  getHighlightsBySection,
  updateHighlight,
  deleteHighlight
} from '../controllers/highlightController';

const router = express.Router();

// セクションのハイライト作成
router.post('/sections/:sectionId/highlights', createHighlight);

// セクションのハイライト一覧取得
router.get('/sections/:sectionId/highlights', getHighlightsBySection);

// ハイライト更新
router.put('/highlights/:highlightId', updateHighlight);

// ハイライト削除
router.delete('/highlights/:highlightId', deleteHighlight);

export default router;

