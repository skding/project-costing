import { Router } from 'express';
import { createProject, getProjectDetails, getProjects, updateProject } from '../controllers/projectController';

const router = Router();

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProjectDetails);
router.put('/:id', updateProject);

export default router;
