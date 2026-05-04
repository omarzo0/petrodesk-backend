import express from 'express';
import * as ctrl from '../../../core/station/stationStaffController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/', stationCan('stationStaff', 'read'), ctrl.getAll);
router.get('/names', stationCan('stationStaff', 'read'), ctrl.getNames);
router.get('/search', stationCan('stationStaff', 'read'), ctrl.search);
router.post('/', stationCan('stationStaff', 'create'), ctrl.create);
router.put('/:id', stationCan('stationStaff', 'update'), ctrl.update);
router.delete('/:id', stationCan('stationStaff', 'delete'), ctrl.deleteAdmin);

export default router;
