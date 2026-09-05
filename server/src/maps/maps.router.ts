import { Router } from 'express';
import { getNearbyPlaces } from './maps.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/nearby', authenticate, getNearbyPlaces);

export default router;
