import express from 'express';
import * as ctrl from '../../../core/station/benzeneController';
import { auth } from '../../middleware/auth';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

// Specific routes first
router.get('/totals/:date', stationCan('benzene', 'read'), ctrl.getPumpTotals);
router.get('/prices/:date', stationCan('benzene', 'read'), ctrl.getPricingByDate);
router.put('/prices/:date', stationCan('benzene', 'update'), ctrl.updatePricingByDate);
router.delete('/prices/:date', stationCan('benzene', 'delete'), ctrl.deletePricingByDate);

// General parameter routes
router.get('/:date', stationCan('benzene', 'read'), ctrl.getPumpByDate);
router.get('/:date/:type', stationCan('benzene', 'read'), ctrl.getPumpByDateAndType);
router.post('/', stationCan('benzene', 'create'), ctrl.createPumpRecord);
router.put('/:id', stationCan('benzene', 'update'), ctrl.updatePumpById);
router.delete('/:id', stationCan('benzene', 'delete'), ctrl.deletePumpById);

export default router;
