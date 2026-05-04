import express from 'express';
import { createWarning, getAllWarnings, addWarningResponse, resolveWarning } from '../../../core/platform/warningController';

import { platformCan } from '../../../server/middleware/rbac';

const router = express.Router();

router.get('/', platformCan('warning', 'read'), getAllWarnings);
router.post('/', platformCan('warning', 'create'), createWarning);
router.post('/:id/responses', platformCan('warning', 'update'), addWarningResponse);
router.put('/:id/resolve', platformCan('warning', 'update'), resolveWarning);

export default router;
