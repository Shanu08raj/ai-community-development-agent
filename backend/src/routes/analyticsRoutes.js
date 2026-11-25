import { Router } from 'express';
import { getPublicCommunityStats } from '../controllers/analyticsController.js';

const router = Router();

router.get('/stats', getPublicCommunityStats);

export default router;
