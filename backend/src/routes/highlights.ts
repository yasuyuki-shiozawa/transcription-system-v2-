import express from 'express';
import {
  createHighlight,
  getHighlightsBySection,
  updateHighlight,
  deleteHighlight
} from '../controllers/highlightController';

const router = express.Router();

// セクションのハイライト作成
// /api/highlights/section/:sectionId (POST)
router.post('/section/:sectionId', createHighlight);

// セクションのハイライト一覧取得
// /api/highlights/section/:sectionId (GET)
router.get('/section/:sectionId', getHighlightsBySection);

// ハイライト更新
// /api/highlights/:highlightId (PUT)
router.put('/:highlightId', updateHighlight);

// ハイライト削除
// /api/highlights/:highlightId (DELETE)
router.delete('/:highlightId', deleteHighlight);

// 後方互換性のための追加ルート（既存のフロントエンドコード用）
router.post('/sections/:sectionId/highlights', createHighlight);
router.get('/sections/:sectionId/highlights', getHighlightsBySection);

export default router;

