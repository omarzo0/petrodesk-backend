import express from 'express';
import * as ctrl from '../../../core/station/employeeController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/', stationCan('employee', 'read'), ctrl.getAll);

router.post('/', stationCan('employee', 'create'), ctrl.create);

router.put('/:id', stationCan('employee', 'update'), ctrl.update);
router.delete('/:id', stationCan('employee', 'delete'), ctrl.deleteEmployee);

export default router;
