import { Router } from 'express';
import { DownloadController } from '../controllers/downloadController';

const router = Router();
const downloadController = new DownloadController();

// Text download routes
router.get('/:id/notta', downloadController.downloadAllSections);
router.get('/:id/manus', downloadController.downloadAllManusData);
router.get('/:transcriptionId/notta/:sessionId', downloadController.downloadNottaData);
router.get('/:transcriptionId/manus/:sessionId', downloadController.downloadManusData);

// Word download routes
router.post('/:id/word', downloadController.downloadFilteredManusAsWord);

export default router;

