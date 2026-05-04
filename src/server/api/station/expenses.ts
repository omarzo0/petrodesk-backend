import express from 'express';
import * as ctrl from '../../../core/station/expenseController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/:date', stationCan('expense', 'read'), ctrl.getByDate);
router.post('/', stationCan('expense', 'create'), ctrl.create);
router.put('/:id', stationCan('expense', 'update'), ctrl.updateExpense);
router.delete('/:id', stationCan('expense', 'delete'), ctrl.deleteExpense);

export default router;
