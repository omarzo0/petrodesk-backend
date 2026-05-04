import express from 'express';
import * as ctrl from '../../../core/station/logController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/admin/:email', stationCan('log', 'read'), ctrl.getByAdmin);
router.get('/:date', stationCan('log', 'read'), ctrl.getByDate);

export default router;
