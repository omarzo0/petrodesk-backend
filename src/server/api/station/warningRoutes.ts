import express from 'express';
import * as ctrl from '../../../core/station/supportController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/', stationCan('support', 'read'), ctrl.getStationWarnings);
router.post('/:id/responses', stationCan('support', 'update'), ctrl.addStationWarningResponse);

export default router;
