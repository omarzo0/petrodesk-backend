import express from 'express';
import { getMyStation, updateMyStation } from '../../../core/station/stationController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

// Get own station info
router.get('/', stationCan('station', 'read'), getMyStation);

// Update own station info
router.put('/', stationCan('station', 'update'), updateMyStation);

export default router;
