import express from 'express';
import * as ctrl from '../../../core/station/shiftDiaryController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/:date', stationCan('shiftDiary', 'read'), ctrl.getByDate);
router.put('/', stationCan('shiftDiary', 'update'), ctrl.upsertShiftDiary);
router.put('/entry-adjustment', stationCan('shiftDiary', 'update'), ctrl.updateEntryAdjustment);

export default router;
