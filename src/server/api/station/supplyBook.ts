import express from 'express';
import * as ctrl from '../../../core/station/supplyBookController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

// Specific routes first
router.get('/balance/:month', stationCan('supplyBook', 'read'), ctrl.getBalance);
router.get('/standard/:date', stationCan('supplyBook', 'read'), ctrl.getStandard);
router.put('/start-incoming', stationCan('supplyBook', 'update'), ctrl.updateStartIncoming);
router.put('/standard', stationCan('supplyBook', 'update'), ctrl.updateStandard);
router.delete('/balance/:month', stationCan('supplyBook', 'delete'), ctrl.deleteBalance);
router.delete('/standard/:date', stationCan('supplyBook', 'delete'), ctrl.deleteStandard);

// General ID/Date routes
router.get('/:date', stationCan('supplyBook', 'read'), ctrl.getByDate);
router.post('/', stationCan('supplyBook', 'create'), ctrl.createRecord);
router.put('/:id', stationCan('supplyBook', 'update'), ctrl.updateRecord);
router.delete('/:id', stationCan('supplyBook', 'delete'), ctrl.deleteRecord);

export default router;

