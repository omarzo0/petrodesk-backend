import express from 'express';
import * as ctrl from '../../../core/station/financialController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/summary/:date', stationCan('financial', 'read'), ctrl.getDailySummary);
router.get('/report', stationCan('financial', 'read'), ctrl.getPeriodicReport);

export default router;
