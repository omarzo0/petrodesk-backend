import express from 'express';
import * as ctrl from '../../../core/station/supportController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/', stationCan('support', 'read'), ctrl.getStationTickets);
router.post('/', stationCan('support', 'create'), ctrl.createStationTicket);
router.post('/:id/responses', stationCan('support', 'update'), ctrl.addStationTicketResponse);
router.delete('/:id', stationCan('support', 'delete'), ctrl.deleteStationTicket);

export default router;
