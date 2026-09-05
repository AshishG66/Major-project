import { Router } from 'express';
import { getDeIdentifiedAnalytics } from './analytics.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/de-identified', getDeIdentifiedAnalytics);

export default router;
