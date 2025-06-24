import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { DownloadController } from '../controllers/downloadController';
import { upload } from '../middlewares/upload';

const router = Router({ mergeParams: true });
const uploadController = new UploadController();
const downloadController = new DownloadController();

// Upload routes
router.post('/notta', upload.single('file'), uploadController.uploadNotta);
router.post('/manus', upload.single('file'), uploadController.uploadManus);

// Get transcriptions for a session
router.get('/transcriptions', uploadController.getTranscriptions);

// Matching routes
router.post('/match', uploadController.performMatching);
router.get('/mappings', uploadController.getMappings);

// Download routes
router.get('/download/notta', downloadController.downloadAllSections);
router.get('/download/notta/:transcriptionId', downloadController.downloadNottaData);
router.get('/download/manus', downloadController.downloadAllManusData);
router.get('/download/manus/:transcriptionId', downloadController.downloadManusData);

export default router;