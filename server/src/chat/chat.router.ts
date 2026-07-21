import { Router } from 'express';
import { sendMessage, getSessions, getSessionMessages, createSession, uploadReport } from './chat.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/message', sendMessage);
router.post('/report/upload', uploadReport);
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSessionMessages);
router.post('/sessions', createSession);

export default router;
