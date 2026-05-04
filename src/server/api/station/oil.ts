import express from 'express';
import * as ctrl from '../../../core/station/oilController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

// Oil Storage
router.get('/storage/:date', stationCan('oil', 'read'), ctrl.getStorageByDate);
router.put('/storage', stationCan('oil', 'update'), ctrl.updateStorage);
router.delete('/storage/:id', stationCan('oil', 'delete'), ctrl.deleteStorageById);

// Oil Shift
router.get('/shift/:date', stationCan('oil', 'read'), ctrl.getShiftByDate);
router.put('/shift', stationCan('oil', 'update'), ctrl.updateShift);
router.delete('/shift/:id', stationCan('oil', 'delete'), ctrl.deleteShiftById);

// Oils (General)
router.get('/', stationCan('oil', 'read'), ctrl.getAll);
router.post('/', stationCan('oil', 'create'), ctrl.create);
router.get('/search', stationCan('oil', 'read'), ctrl.search);
router.put('/:id', stationCan('oil', 'update'), ctrl.update);
router.delete('/:id', stationCan('oil', 'delete'), ctrl.deleteOil);

export default router;
