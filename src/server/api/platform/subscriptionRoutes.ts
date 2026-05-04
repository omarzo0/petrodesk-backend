import express from 'express';
import { assignPlan, getAllSubscriptions, updateSubscription } from '../../../core/platform/subscriptionController';

import { platformCan } from '../../../server/middleware/rbac';

const router = express.Router();

router.get('/', platformCan('subscription', 'read'), getAllSubscriptions);

router.post('/', platformCan('subscription', 'create'), assignPlan);
router.put('/:id', platformCan('subscription', 'update'), updateSubscription);

export default router;
