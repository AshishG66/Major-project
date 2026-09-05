import { Router } from 'express';
import { getAlerts, acknowledgeAlert } from './alerts.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:patientId?', getAlerts);
router.post('/:id/acknowledge', acknowledgeAlert);

export default router;
