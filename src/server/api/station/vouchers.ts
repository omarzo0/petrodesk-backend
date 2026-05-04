import express from 'express';
import * as ctrl from '../../../core/station/voucherController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/:date', stationCan('voucher', 'read'), ctrl.getByDate);
router.post('/', stationCan('voucher', 'create'), ctrl.create);
router.put('/:id', stationCan('voucher', 'update'), ctrl.updateVoucher);
router.delete('/:id', stationCan('voucher', 'delete'), ctrl.deleteVoucher);

export default router;
