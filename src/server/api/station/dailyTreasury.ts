import express from 'express';
import * as ctrl from '../../../core/station/dailyTreasuryController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/:date', stationCan('dailyTreasury', 'read'), ctrl.getByDate);
router.put('/island', stationCan('dailyTreasury', 'update'), ctrl.updateIsland);
router.put('/from-shift', stationCan('dailyTreasury', 'update'), ctrl.updateFromShift);
router.post('/', stationCan('dailyTreasury', 'create'), ctrl.createEntry);
router.delete('/:id', stationCan('dailyTreasury', 'delete'), ctrl.deleteEntry);



export default router;
