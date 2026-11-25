import { Router } from 'express';
import { getPublicCommunityIssues } from '../controllers/communityIssueController.js';
import { validate } from '../middleware/validate.js';
import { clusterQuerySchema } from '../validators/clusterValidator.js';

const router = Router();

router.get('/', validate(clusterQuerySchema, 'query'), getPublicCommunityIssues);

export default router;
