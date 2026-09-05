import { Router } from 'express';
import { getDigitalTwinState, simulateSensorStream } from './digitalTwin.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:patientId?', getDigitalTwinState);
router.post('/simulate-stream', simulateSensorStream);

export default router;
