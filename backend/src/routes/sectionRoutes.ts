import { Router } from 'express';
import { SectionController } from '../controllers/sectionController';

const router = Router();
const sectionController = new SectionController();

// Update single section
router.patch('/:sectionId', sectionController.updateSection);

// Batch update sections
router.patch('/', sectionController.updateSections);

export default router;