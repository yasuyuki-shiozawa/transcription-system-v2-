import { Router } from 'express';
import sessionRoutes from './sessionRoutes';
import uploadRoutes from './uploadRoutes';
import sectionRoutes from './sectionRoutes';
import downloadRoutes from './downloadRoutes';

const router = Router();

// Mount routes
router.use('/sessions', sessionRoutes);
router.use('/sessions/:id/upload', uploadRoutes);
router.use('/download', downloadRoutes);
router.use('/sections', sectionRoutes);

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
        wordMacro: 'POST /api/download/:id/word-macro',
      },
    },
  });
});

export default router;