import express from 'express';
import * as ctrl from '../../../core/station/accountController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/:date', stationCan('account', 'read'), ctrl.getByDate);
router.post('/', stationCan('account', 'create'), ctrl.create);
router.put('/:id', stationCan('account', 'update'), ctrl.updateAccount);
router.delete('/:id', stationCan('account', 'delete'), ctrl.deleteAccount);

export default router;
