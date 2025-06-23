import { Router } from 'express';
import sessionRoutes from './sessionRoutes';
import uploadRoutes from './uploadRoutes';

const router = Router();

// Mount routes
router.use('/sessions', sessionRoutes);
router.use('/sessions/:id/upload', uploadRoutes);

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
        notta: 'POST /api/sessions/:id/upload/notta (coming soon)',
        manus: 'POST /api/sessions/:id/upload/manus (coming soon)',
      },
    },
  });
});

export default router;