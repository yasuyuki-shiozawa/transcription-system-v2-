import { Router } from 'express';
import sessionRoutes from './sessionRoutes';
import uploadRoutes from './uploadRoutes';
import sectionRoutes from './sectionRoutes';
import downloadRoutes from './downloadRoutes';
import highlightRoutes from './highlights';
import adminRoutes from './admin';
// import recoveryRoutes from './recovery'; // 一時的に無効化

const router = Router();

// Mount routes
router.use('/sessions', sessionRoutes);
router.use('/sessions/:id/upload', uploadRoutes);
router.use('/download', downloadRoutes);
router.use('/sections', sectionRoutes);
router.use('/highlights', highlightRoutes);
router.use('/admin', adminRoutes);
// router.use('/recovery', recoveryRoutes); // 一時的に無効化

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    message: 'Transcription System API',
    version: '1.0.0',
    endpoints: {
      sessions: {
        list: 'GET /api/sessions',
        create: 'POST /api/sessions',
        get: 'GET /api/sessions/:id',
        update: 'PUT /api/sessions/:id',
        delete: 'DELETE /api/sessions/:id',
        sections: 'GET /api/sessions/:id/sections',
      },
      upload: {
        notta: 'POST /api/sessions/:id/upload/notta',
        manus: 'POST /api/sessions/:id/upload/manus',
        audio: 'POST /api/sessions/:id/upload/audio/:source',
        text: 'POST /api/sessions/:id/upload/text/:source',
      },
      download: {
        notta: 'GET /api/download/:id/notta',
        manus: 'GET /api/download/:id/manus',
        word: 'POST /api/download/:id/word',
      },
      highlights: {
        list: 'GET /api/highlights/section/:sectionId',
        create: 'POST /api/highlights/section/:sectionId',
        delete: 'DELETE /api/highlights/:id',
      },
    },
  });
});

export default router;