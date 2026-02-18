import { Router } from 'express';
import { addSection, addSystem, getVersionDetails, updateIORequirements, addComponentToVersion, deleteProjectComponent, updateCostSettings, createNewVersion, updateSystem, updateSectionFields, updateVersion } from '../controllers/versionController';

const router = Router();

router.get('/:id', getVersionDetails);
router.post('/:id/clone', createNewVersion);
router.post('/:versionId/systems', addSystem);
router.post('/systems/:systemId/sections', addSection);
router.put('/sections/:sectionId/io', updateIORequirements);
router.post('/:versionId/components', addComponentToVersion);
router.delete('/components/:id', deleteProjectComponent);
router.put('/:versionId/settings', updateCostSettings);
router.put('/:id', updateVersion);
router.put('/systems/:systemId', updateSystem);
router.put('/sections/:sectionId/fields', updateSectionFields);

export default router;
