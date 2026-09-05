import { Router } from 'express';
import { getModelVersions, registerModelVersion } from './models.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getModelVersions);
router.post('/', registerModelVersion);

export default router;
