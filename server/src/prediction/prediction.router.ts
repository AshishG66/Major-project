import { Router } from 'express';
import { createPrediction, getHistory, getLatestPrediction, downloadReport } from './prediction.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', createPrediction);
router.get('/history', getHistory);
router.get('/latest', getLatestPrediction);
router.get('/report/:id', downloadReport);

export default router;
