import express from 'express';
import { initializeDay } from '../../../core/station/initController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.post('/:date', stationCan('init', 'create'), initializeDay);

export default router;
