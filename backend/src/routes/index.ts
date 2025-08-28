import { Router } from 'express';
import sessionRoutes from './sessionRoutes';
import uploadRoutes from './uploadRoutes';
import sectionRoutes from './sectionRoutes';
import downloadRoutes from './downloadRoutes';

const router = Router();

// Mount routes
router.use('/sessions', sessionRoutes);
router.use('/sessions/:id/upload', uploadRoutes);
router.use('/sessions', downloadRoutes);
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
        notta: 'GET /api/sessions/:id/download/notta',
        manus: 'GET /api/sessions/:id/download/manus',
        word: 'POST /api/sessions/:id/download/word',
        wordMacro: 'POST /api/sessions/:id/download/word-macro',
      },
    },
  });
});

export default router;