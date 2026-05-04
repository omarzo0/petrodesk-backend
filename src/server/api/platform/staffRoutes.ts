import express from 'express';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../../../core/platform/platformStaffController';

import { platformCan } from '../../../server/middleware/rbac';

const router = express.Router();

router.get('/', platformCan('staff', 'read'), getStaff);
router.post('/', platformCan('staff', 'create'), createStaff);
router.put('/:id', platformCan('staff', 'update'), updateStaff);
router.delete('/:id', platformCan('staff', 'delete'), deleteStaff);

export default router;
