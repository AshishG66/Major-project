import { Router } from 'express';
import { getDevices, registerDevice, updateDeviceStatus } from './devices.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:patientId?', getDevices);
router.post('/', registerDevice);
router.patch('/:id', updateDeviceStatus);

export default router;
