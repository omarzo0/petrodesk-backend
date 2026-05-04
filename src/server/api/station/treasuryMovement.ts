import express from 'express';
import * as ctrl from '../../../core/station/treasuryMovementController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/:date', stationCan('treasuryMovement', 'read'), ctrl.getByDate);
router.post('/', stationCan('treasuryMovement', 'create'), ctrl.create);
router.put('/:id', stationCan('treasuryMovement', 'update'), ctrl.updateMovement);
router.delete('/:id', stationCan('treasuryMovement', 'delete'), ctrl.deleteMovement);

export default router;
