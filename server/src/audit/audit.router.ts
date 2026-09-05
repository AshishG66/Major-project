import { Router } from 'express';
import { getAuditLogs, verifyAuditIntegrity } from './audit.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:patientId?', getAuditLogs);
router.post('/verify', verifyAuditIntegrity);

export default router;
