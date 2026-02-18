import { Router } from 'express';
import { createClient, getClients, updateClient, deleteClient } from '../controllers/clientController';

const router = Router();

router.get('/', getClients);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;
