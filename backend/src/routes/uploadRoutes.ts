import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { upload } from '../middlewares/upload';

const router = Router({ mergeParams: true });
const uploadController = new UploadController();

// Upload routes
router.post('/notta', upload.single('file'), uploadController.uploadNotta);
router.post('/manus', upload.single('file'), uploadController.uploadManus);

// Get transcriptions for a session
router.get('/transcriptions', uploadController.getTranscriptions);

// Matching routes
router.post('/match', uploadController.performMatching);
router.get('/mappings', uploadController.getMappings);

export default router;