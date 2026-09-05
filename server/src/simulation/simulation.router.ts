import { Router } from 'express';
import { runWhatIfSimulation } from './simulation.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', runWhatIfSimulation);

export default router;
