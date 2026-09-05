import { Router } from 'express';
import { ingestSensorData, getSensorHistory } from './sensorData.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', ingestSensorData);
router.get('/history', getSensorHistory);

export default router;
