import { Router } from 'express';
import {
    getAllPackages,
    createPackage,
    updatePackage,
    deletePackage,
    addPackageToVersion
} from '../controllers/packageController';

const router = Router();

router.get('/', getAllPackages);
router.post('/', createPackage);
router.put('/:id', updatePackage);
router.delete('/:id', deletePackage);

// Special expansion route
router.post('/:packageId/add-to-version/:versionId', addPackageToVersion);

export default router;
