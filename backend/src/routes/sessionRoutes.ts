import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';

const router = Router();
const sessionController = new SessionController();

// Session CRUD routes
router.post('/', sessionController.createSession);
router.get('/', sessionController.getAllSessions);
router.get('/:id', sessionController.getSessionById);
router.put('/:id', sessionController.updateSession);
router.delete('/:id', sessionController.deleteSession);

// Additional routes
router.get('/:id/sections', sessionController.getSessionWithSections);

export default router;