import express from 'express';
import { createPayment, getAllPayments, updatePayment, getTransactionStats } from '../../../core/platform/paymentController';

import { platformCan } from '../../../server/middleware/rbac';

const router = express.Router();

router.get('/', platformCan('payment', 'read'), getAllPayments);
router.get('/stats', platformCan('payment', 'read'), getTransactionStats);

router.post('/', platformCan('payment', 'refund'), createPayment);
router.put('/:id', platformCan('payment', 'read'), updatePayment);

export default router;
