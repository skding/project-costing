import { Router } from 'express';
import * as equipmentController from '../controllers/equipmentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/sections/:sectionId/equipment', equipmentController.addEquipment);
router.put('/:id', equipmentController.updateEquipment);
router.delete('/:id', equipmentController.deleteEquipment);

export default router;
