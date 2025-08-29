import { Router } from 'express';
import { SectionController } from '../controllers/sectionController';

const router = Router();
const sectionController = new SectionController();

// Add new section to session
router.post('/session/:sessionId', sectionController.addSection);

// Delete section
router.delete('/:sectionId', sectionController.deleteSection);

// Reorder sections in session
router.patch('/session/:sessionId/reorder', sectionController.reorderSections);

// Update single section
router.patch('/:sectionId', sectionController.updateSection);

// Batch update sections
router.patch('/', sectionController.updateSections);

export default router;

