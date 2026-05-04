import express from 'express';
import { createPlan, getAllPlans, updatePlan, deactivatePlan } from '../../../core/platform/planController';

import { platformCan } from '../../../server/middleware/rbac';

const router = express.Router();

router.get('/', platformCan('plan', 'read'), getAllPlans);

router.post('/', platformCan('plan', 'create'), createPlan);
router.put('/:id', platformCan('plan', 'update'), updatePlan);
router.delete('/:id', platformCan('plan', 'delete'), deactivatePlan);

export default router;
