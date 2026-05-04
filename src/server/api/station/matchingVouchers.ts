import express from 'express';
import * as ctrl from '../../../core/station/voucherController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

// @route   GET /api/matching-vouchers/:date
router.get('/:date', stationCan('voucher', 'read'), ctrl.getMatching);

export default router;
