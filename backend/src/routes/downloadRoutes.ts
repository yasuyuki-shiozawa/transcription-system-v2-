import { Router } from 'express';
import { DownloadController } from '../controllers/downloadController';

const router = Router();
const downloadController = new DownloadController();

// Text download routes
router.get('/:id/download/notta', downloadController.downloadAllSections);
router.get('/:id/download/manus', downloadController.downloadAllManusData);
router.get('/:transcriptionId/download/notta/:sessionId', downloadController.downloadNottaData);
router.get('/:transcriptionId/download/manus/:sessionId', downloadController.downloadManusData);

// Word download routes
router.post('/:id/download/word', downloadController.downloadFilteredManusAsWord);
router.post('/:id/download/word-macro', downloadController.downloadFilteredManusAsWordWithMacro);

export default router;

