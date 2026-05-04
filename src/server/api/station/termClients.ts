import express from 'express';
import * as ctrl from '../../../core/station/termClientController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/:date', stationCan('termClient', 'read'), ctrl.getByDate);
router.post('/', stationCan('termClient', 'create'), ctrl.create);
router.put('/:id', stationCan('termClient', 'update'), ctrl.updateRecord);
router.delete('/:id', stationCan('termClient', 'delete'), ctrl.deleteTermClient);

export default router;
